import { describe, expect, it } from "vitest";
import {
  isTerminalAuthRefreshError,
  preserveCookiesOnRetryableRefreshFailure,
} from "@/lib/auth/refresh-failure";

describe("auth refresh failures", () => {
  it("clears auth cookies only for rejected refresh credentials", () => {
    expect(isTerminalAuthRefreshError({ statusCode: 401 })).toBe(true);
    expect(isTerminalAuthRefreshError({ statusCode: 403 })).toBe(true);
    expect(isTerminalAuthRefreshError({ statusCode: 0 })).toBe(false);
    expect(isTerminalAuthRefreshError({ statusCode: 500 })).toBe(false);
    expect(isTerminalAuthRefreshError(null)).toBe(false);
  });

  it("removes cookie-clearing headers from retryable refresh failures", async () => {
    const response = new Response("temporary failure", {
      status: 500,
      headers: {
        "set-cookie": "insforge_refresh_token=; Max-Age=0",
        "x-refresh-state": "retry",
      },
    });

    const retryableResponse = preserveCookiesOnRetryableRefreshFailure(response);

    expect(retryableResponse.status).toBe(500);
    expect(retryableResponse.headers.has("set-cookie")).toBe(false);
    expect(retryableResponse.headers.get("x-refresh-state")).toBe("retry");
    await expect(retryableResponse.text()).resolves.toBe("temporary failure");
  });
});
