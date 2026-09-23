import { CaptchaUnavailableError } from "@/platform/captcha/captcha.errors";
import {
  type CaptchaVerdict,
  CaptchaVerifier,
  type CaptchaVerifyInput,
} from "@/platform/captcha/ports/captcha-verifier";

export const MEMORY_CAPTCHA_TOKENS = {
  pass: "captcha-pass",
  lowScore: "captcha-low-score",
  solved: "captcha-solved",
  unavailable: "captcha-unavailable",
} as const;

export class MemoryCaptchaVerifier extends CaptchaVerifier {
  private readonly seen: CaptchaVerifyInput[] = [];

  public verify(input: CaptchaVerifyInput): Promise<CaptchaVerdict> {
    this.seen.push(input);

    if (input.token === MEMORY_CAPTCHA_TOKENS.unavailable) {
      return Promise.reject(new CaptchaUnavailableError());
    }

    if (input.kind === "challenge") {
      return Promise.resolve(
        input.token === MEMORY_CAPTCHA_TOKENS.solved ? "pass" : "fail",
      );
    }

    if (input.token === MEMORY_CAPTCHA_TOKENS.pass) {
      return Promise.resolve("pass");
    }

    if (input.token === MEMORY_CAPTCHA_TOKENS.lowScore) {
      return Promise.resolve("challenge");
    }

    return Promise.resolve("fail");
  }

  public verifications(): readonly CaptchaVerifyInput[] {
    return this.seen;
  }

  public clear(): void {
    this.seen.length = 0;
  }
}
