import {
  type CaptchaVerdict,
  CaptchaVerifier,
} from "@/platform/captcha/ports/captcha-verifier";

export class DisabledCaptchaVerifier extends CaptchaVerifier {
  public verify(): Promise<CaptchaVerdict> {
    return Promise.resolve("pass");
  }
}
