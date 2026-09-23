import { make } from "@/core/registry";
import { UserEntity } from "@/modules/users";
import { type CaptchaContext, requireCaptcha } from "@/platform/captcha";
import { RateLimitStore, rateLimitStoreKey } from "@/platform/rate-limit";

import {
  SIGN_IN_ATTEMPTS_WITHOUT_CAPTCHA,
  SIGN_IN_RATE_LIMIT,
} from "./auth.constants";

interface EmailBody {
  body: { email: string };
}

export const SIGN_IN_ADDRESS_SCOPE = "auth:sign-in";

export const signInAddressKey = ({ body }: EmailBody): string =>
  `email:${UserEntity.normalizeEmail(body.email)}`;

const signInNeedsCaptcha = async (context: EmailBody): Promise<boolean> => {
  const attempts = await make(RateLimitStore).peek({
    key: rateLimitStoreKey(SIGN_IN_ADDRESS_SCOPE, signInAddressKey(context)),
    ...SIGN_IN_RATE_LIMIT,
  });

  return attempts > SIGN_IN_ATTEMPTS_WITHOUT_CAPTCHA;
};

export const requireSignInCaptcha = requireCaptcha<CaptchaContext & EmailBody>(
  "sign_in",
  { when: signInNeedsCaptcha },
);
