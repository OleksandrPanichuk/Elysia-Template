import { beforeAll, describe, expect, test } from "bun:test";

import { loadEnv, setEnv } from "@/configs";

import { OAuthProviderName } from "./oauth.constants";
import {
  buildCallbackUrl,
  resolveAppErrorUrl,
  resolveAppUrl,
  sanitizeRedirectPath,
} from "./oauth.redirect";

beforeAll(() => setEnv(loadEnv()));

describe("sanitizeRedirectPath", () => {
  test.each(["/dashboard", "/a/b?c=d", "/"])("keeps %p", (path) => {
    expect(sanitizeRedirectPath(path)).toBe(path);
  });

  test.each([
    "//evil.example",
    "https://evil.example",
    "http://evil.example",
    "dashboard",
    "",
    undefined,
  ])("refuses %p", (path) => {
    expect(sanitizeRedirectPath(path as string | undefined)).toBeNull();
  });
});

describe("resolving where to send the browser", () => {
  test("always lands on the app's own origin", () => {
    const appOrigin = new URL(resolveAppUrl("/dashboard")).origin;

    expect(new URL(resolveAppUrl(null)).origin).toBe(appOrigin);
    expect(new URL(resolveAppErrorUrl(null, "OAUTH_DENIED")).origin).toBe(
      appOrigin,
    );
  });

  test("carries the error code as a query parameter", () => {
    const url = new URL(resolveAppErrorUrl("/settings", "OAUTH_DENIED"));

    expect(url.pathname).toBe("/settings");
    expect(url.searchParams.get("error")).toBe("OAUTH_DENIED");
  });
});

describe("buildCallbackUrl", () => {
  test("gives each provider its own exact callback", () => {
    const google = buildCallbackUrl(OAuthProviderName.Google);
    const github = buildCallbackUrl(OAuthProviderName.GitHub);

    expect(google).toEndWith("/api/auth/oauth/google/callback");
    expect(github).toEndWith("/api/auth/oauth/github/callback");
    expect(new URL(google).origin).toBe(new URL(github).origin);
  });
});
