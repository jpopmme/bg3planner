/** A source of build guides the importer knows how to read. Implemented in M6. */
export interface Importer {
  /** Stable identifier, e.g. `gamestegy`. */
  readonly id: string;
  canHandle(url: URL): boolean;
}
