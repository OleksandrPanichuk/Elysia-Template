import type { Server } from "elysia/universal/server";

import { make } from "@/core/registry";
import { getClientIp } from "@/shared";

import {
  CAPTCHA_KIND_HEADER,
  CAPTCHA_KINDS,
  CAPTCHA_TOKEN_HEADER,
} from "./captcha.constants";
import {
  CaptchaChallengeRequiredError,
  CaptchaFailedError,
  CaptchaRequiredError,
} from "./captcha.errors";
import { type CaptchaKind, CaptchaVerifier } from "./ports";

export interface CaptchaContext {
  request: Request;
  server: Server | null;
  headers: Record<string, string | undefined>;
}

export interface RequireCaptchaOptions<Context extends CaptchaContext> {
  when?: (context: Context) => boolean | Promise<boolean>;
}

const parseKind = (value: string | undefined): CaptchaKind | null => {
  const kind = (value ?? "score").trim().toLowerCase();

  return CAPTCHA_KINDS.find((known) => known === kind) ?? null;
};

export const requireCaptcha =
  <Context extends CaptchaContext = CaptchaContext>(
    action: string,
    { when }: RequireCaptchaOptions<Context> = {},
  ) =>
  async (context: Context): Promise<void> => {
    if (when && !(await when(context))) return;

    const token = context.headers[CAPTCHA_TOKEN_HEADER]?.trim();

    if (!token) {
      throw new CaptchaRequiredError("Complete the captcha to continue");
    }

    const kind = parseKind(context.headers[CAPTCHA_KIND_HEADER]);

    if (!kind) {
      throw new CaptchaFailedError("Unknown captcha kind");
    }

    const verdict = await make(CaptchaVerifier).verify({
      token,
      kind,
      action,
      ip: getClientIp(context.request, context.server),
    });

    if (verdict === "pass") return;

    if (verdict === "challenge") {
      throw new CaptchaChallengeRequiredError(
        "Solve the captcha challenge to continue",
      );
    }

    throw new CaptchaFailedError("Captcha verification failed");
  };
