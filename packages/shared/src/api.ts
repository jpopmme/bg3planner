/** Response body of `GET /api/health`. */
export interface HealthResponse {
  status: 'ok';
  version: string;
  gameDataVersion: string;
}
