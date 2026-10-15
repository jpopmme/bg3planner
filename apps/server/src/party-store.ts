import { DatabaseSync } from 'node:sqlite';

export interface PartyRow {
  id: string;
  /** The party document as saved (JSON). */
  data: string;
  revision: number;
  editTokenHash: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdateResult =
  | { status: 'saved'; row: PartyRow }
  | { status: 'conflict'; row: PartyRow }
  | { status: 'not-found' };

/** Parties in SQLite (Node's built-in driver). One row per party; the document is JSON. */
export class PartyStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        revision INTEGER NOT NULL,
        edit_token_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_cache (
        key TEXT PRIMARY KEY,
        result TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      )
    `);
  }

  get(id: string): PartyRow | undefined {
    const row = this.db
      .prepare(
        `SELECT id, data, revision, edit_token_hash AS editTokenHash,
                created_at AS createdAt, updated_at AS updatedAt
         FROM parties WHERE id = ?`,
      )
      .get(id);
    return row as PartyRow | undefined;
  }

  create(id: string, editTokenHash: string, data: string): PartyRow {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO parties (id, data, revision, edit_token_hash, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, ?)`,
      )
      .run(id, data, editTokenHash, now, now);
    return this.get(id)!;
  }

  /** Saves only if the stored revision is still `baseRevision`, so concurrent edits are caught. */
  update(id: string, data: string, baseRevision: number): UpdateResult {
    const now = new Date().toISOString();
    const { changes } = this.db
      .prepare(
        `UPDATE parties SET data = ?, revision = revision + 1, updated_at = ?
         WHERE id = ? AND revision = ?`,
      )
      .run(data, now, id, baseRevision);
    const row = this.get(id);
    if (!row) return { status: 'not-found' };
    return { status: Number(changes) === 1 ? 'saved' : 'conflict', row };
  }

  delete(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM parties WHERE id = ?').run(id).changes) === 1;
  }

  // ---- Guide imports: our parsed result (never the guide page itself), kept for a while ---------

  getCachedImport(key: string, notBefore: Date): string | undefined {
    const row = this.db
      .prepare('SELECT result, fetched_at AS fetchedAt FROM import_cache WHERE key = ?')
      .get(key) as { result: string; fetchedAt: string } | undefined;
    return row && new Date(row.fetchedAt) >= notBefore ? row.result : undefined;
  }

  putCachedImport(key: string, result: string, fetchedAt: Date) {
    this.db
      .prepare(
        `INSERT INTO import_cache (key, result, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET result = excluded.result, fetched_at = excluded.fetched_at`,
      )
      .run(key, result, fetchedAt.toISOString());
  }

  close() {
    this.db.close();
  }
}
