import z from "zod";

import { getLogger } from "@/infrastructure";
import { CAPTCHA_VERIFY_TIMEOUT_MS } from "@/platform/captcha/captcha.constants";
import { CaptchaUnavailableError } from "@/platform/captcha/captcha.errors";
import {
  type CaptchaVerdict,
  CaptchaVerifier,
  type CaptchaVerifyInput,
} from "@/platform/captcha/ports/captcha-verifier";

const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const SiteverifyResponseSchema = z.object({
  success: z.boolean(),
  score: z.number().optional(),
  action: z.string().optional(),
  hostname: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

type SiteverifyResponse = z.infer<typeof SiteverifyResponseSchema>;

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface RecaptchaCaptchaVerifierOptions {
  scoreSecret: string;
  challengeSecret: string;
  scoreThreshold: number;
  hostnames: readonly string[];
  timeoutMs?: number;
  fetch?: Fetch;
}

export class RecaptchaCaptchaVerifier extends CaptchaVerifier {
  private readonly fetch: Fetch;

  private readonly timeoutMs: number;

  constructor(private readonly options: RecaptchaCaptchaVerifierOptions) {
    super();

    this.fetch = options.fetch ?? ((url, init) => fetch(url, init));
    this.timeoutMs = options.timeoutMs ?? CAPTCHA_VERIFY_TIMEOUT_MS;
  }

  public async verify({
    token,
    kind,
    action,
    ip,
  }: CaptchaVerifyInput): Promise<CaptchaVerdict> {
    const secret =
      kind === "score"
        ? this.options.scoreSecret
        : this.options.challengeSecret;
    const result = await this.siteverify(secret, token, ip);

    if (!result.success || !this.isOurHostname(result.hostname)) {
      return "fail";
    }

    if (kind === "challenge") {
      return result.score === undefined ? "pass" : "fail";
    }

    if (result.action !== action || result.score === undefined) {
      return "fail";
    }

    return result.score >= this.options.scoreThreshold ? "pass" : "challenge";
  }

  private isOurHostname(hostname: string | undefined): boolean {
    return hostname !== undefined && this.options.hostnames.includes(hostname);
  }

  private async siteverify(
    secret: string,
    token: string,
    ip: string | null,
  ): Promise<SiteverifyResponse> {
    let response: Response;

    try {
      response = await this.fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      getLogger().error(
        { component: "RecaptchaCaptchaVerifier", err: cause },
        "captcha verification request failed",
      );

      throw new CaptchaUnavailableError(cause);
    }

    if (!response.ok) {
      getLogger().error(
        { component: "RecaptchaCaptchaVerifier", status: response.status },
        "captcha verification answered with an error status",
      );

      throw new CaptchaUnavailableError(response.status);
    }

    const parsed = SiteverifyResponseSchema.safeParse(
      await response.json().catch(() => null),
    );

    if (!parsed.success) {
      throw new CaptchaUnavailableError(parsed.error);
    }

    return parsed.data;
  }
}
