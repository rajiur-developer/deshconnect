import { createAuthActions } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const verifier = request.cookies.get("insforge_code_verifier")?.value;
  if (oauthError || !code || !verifier) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const auth = createAuthActions({ requestCookies: request.cookies, responseCookies: response.cookies });
  const { data, error } = await auth.exchangeOAuthCode(code, verifier);
  if (error || !data?.user) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
  response.cookies.delete("insforge_code_verifier");
  return response;
}
