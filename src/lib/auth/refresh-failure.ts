type AuthRefreshError = {
  statusCode: number;
};

export function isTerminalAuthRefreshError(error: AuthRefreshError | null): boolean {
  return error?.statusCode === 401 || error?.statusCode === 403;
}

export function preserveCookiesOnRetryableRefreshFailure(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
