import { refreshAuth } from "@insforge/sdk/ssr";
import { isTerminalAuthRefreshError, preserveCookiesOnRetryableRefreshFailure } from "@/lib/auth/refresh-failure";

export async function POST(request: Request): Promise<Response> {
  const { response, error } = await refreshAuth({ request });
  if (!error || isTerminalAuthRefreshError(error)) return response;

  console.error("Auth session refresh endpoint failed temporarily; keeping cookies for a later retry.", {
    statusCode: error.statusCode,
    code: error.error,
  });
  return preserveCookiesOnRetryableRefreshFailure(response);
}
