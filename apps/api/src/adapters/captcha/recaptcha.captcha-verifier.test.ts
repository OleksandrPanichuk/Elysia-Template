import { describe, expect, test } from "bun:test";

import { CaptchaUnavailableError } from "@/platform/captcha/captcha.errors";

import { RecaptchaCaptchaVerifier } from "./recaptcha.captcha-verifier";

interface Call {
  url: string;
  body: URLSearchParams;
}

const verifierAnswering = (
  answer: () => Promise<Response>,
  calls: Call[] = [],
) =>
  new RecaptchaCaptchaVerifier({
    scoreSecret: "v3-secret",
    challengeSecret: "v2-secret",
    scoreThreshold: 0.5,
    hostnames: ["app.example.test"],
    timeoutMs: 50,
    fetch: (url, init) => {
      calls.push({ url, body: init.body as URLSearchParams });

      return answer();
    },
  });

const json =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(Response.json(body, { status }));

const scored = (overrides: Record<string, unknown> = {}) =>
  json({
    success: true,
    score: 0.9,
    action: "sign_up",
    hostname: "app.example.test",
    ...overrides,
  });

const rejection = (run: () => Promise<unknown>): Promise<unknown> =>
  run().then(
    () => undefined,
    (error: unknown) => error,
  );

const input = (kind: "score" | "challenge" = "score") => ({
  token: "token",
  kind,
  action: "sign_up",
  ip: "10.0.0.1",
});

describe("RecaptchaCaptchaVerifier", () => {
  test("passes a high score and sends the v3 secret, token and address", async () => {
    const calls: Call[] = [];

    expect(await verifierAnswering(scored(), calls).verify(input())).toBe(
      "pass",
    );
    expect(calls[0]?.body.get("secret")).toBe("v3-secret");
    expect(calls[0]?.body.get("response")).toBe("token");
    expect(calls[0]?.body.get("remoteip")).toBe("10.0.0.1");
  });

  test("asks for a challenge below the threshold", async () => {
    expect(
      await verifierAnswering(scored({ score: 0.2 })).verify(input()),
    ).toBe("challenge");
  });

  test("fails a token issued for another action", async () => {
    expect(
      await verifierAnswering(scored({ action: "sign_in" })).verify(input()),
    ).toBe("fail");
  });

  test("fails a token issued on another hostname", async () => {
    expect(
      await verifierAnswering(scored({ hostname: "evil.example" })).verify(
        input(),
      ),
    ).toBe("fail");
  });

  test("fails what Google itself rejects", async () => {
    expect(
      await verifierAnswering(
        json({ success: false, "error-codes": ["timeout-or-duplicate"] }),
      ).verify(input()),
    ).toBe("fail");
  });

  test("checks a challenge with the v2 secret and ignores score and action", async () => {
    const calls: Call[] = [];
    const verifier = verifierAnswering(
      json({ success: true, hostname: "app.example.test" }),
      calls,
    );

    expect(await verifier.verify(input("challenge"))).toBe("pass");
    expect(calls[0]?.body.get("secret")).toBe("v2-secret");
  });

  test("refuses a scored token presented as a challenge", async () => {
    expect(
      await verifierAnswering(scored({ score: 0.1, action: "other" })).verify(
        input("challenge"),
      ),
    ).toBe("fail");
  });

  test("reports Google as unavailable on an error status", async () => {
    const error = await rejection(() =>
      verifierAnswering(json({}, 500)).verify(input()),
    );

    expect(error).toBeInstanceOf(CaptchaUnavailableError);
  });

  test("reports Google as unavailable when the request fails", async () => {
    const error = await rejection(() =>
      verifierAnswering(() => Promise.reject(new Error("offline"))).verify(
        input(),
      ),
    );

    expect(error).toBeInstanceOf(CaptchaUnavailableError);
  });
});
