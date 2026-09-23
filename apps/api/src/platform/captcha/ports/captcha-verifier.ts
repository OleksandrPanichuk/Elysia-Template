export type CaptchaKind = "score" | "challenge";

export type CaptchaVerdict = "pass" | "challenge" | "fail";

export interface CaptchaVerifyInput {
  token: string;
  kind: CaptchaKind;
  action: string;
  ip: string | null;
}

export abstract class CaptchaVerifier {
  public abstract verify(input: CaptchaVerifyInput): Promise<CaptchaVerdict>;
}
