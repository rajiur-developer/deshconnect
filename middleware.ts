import { NextResponse, type NextRequest } from "next/server";
import {
  accessTokenCookieOptions,
  DEFAULT_ACCESS_TOKEN_COOKIE,
  DEFAULT_REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
} from "@insforge/sdk/ssr";
import {
  updateSession,
} from "@insforge/sdk/ssr/middleware";
import { isTerminalAuthRefreshError } from "@/lib/auth/refresh-failure";

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(DEFAULT_ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(DEFAULT_REFRESH_TOKEN_COOKIE)?.value;
  const response = NextResponse.next({ request });
  const result = await updateSession({ requestCookies: request.cookies, responseCookies: response.cookies });

  if (result.error && !isTerminalAuthRefreshError(result.error)) {
    console.error("Auth session refresh failed temporarily; keeping cookies for a later retry.", {
      statusCode: result.error.statusCode,
      code: result.error.error,
    });
    if (accessToken) {
      request.cookies.set(DEFAULT_ACCESS_TOKEN_COOKIE, accessToken);
      response.cookies.set(DEFAULT_ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions(accessToken));
    }
    if (refreshToken) {
      request.cookies.set(DEFAULT_REFRESH_TOKEN_COOKIE, refreshToken);
      response.cookies.set(DEFAULT_REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions(refreshToken));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api/auth/refresh(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
