import type { Party } from '@bg3planner/rules';

export interface RemoteParty {
  id: string;
  party: Party;
  revision: number;
  updatedAt: string;
}

/** A failed API call; `body` carries the server's explanation (and, on 409, the current copy). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: { error?: string; current?: RemoteParty },
  ) {
    super(body.error ?? `Request failed with HTTP ${status}`);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

const auth = (editToken: string) => ({ authorization: `Bearer ${editToken}` });

export const createParty = (party: Party) =>
  request<RemoteParty & { editToken: string }>('/parties', {
    method: 'POST',
    body: JSON.stringify(party),
  });

export const getParty = (id: string) => request<RemoteParty>(`/parties/${encodeURIComponent(id)}`);

export const saveParty = (id: string, editToken: string, party: Party, revision: number) =>
  request<{ revision: number; updatedAt: string }>(`/parties/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: auth(editToken),
    body: JSON.stringify({ party, revision }),
  });

export const deleteParty = (id: string, editToken: string) =>
  request<void>(`/parties/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: auth(editToken),
  });
