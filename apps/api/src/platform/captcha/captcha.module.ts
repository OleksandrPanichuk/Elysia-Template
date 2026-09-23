import { DisabledCaptchaVerifier } from "@/adapters/captcha/disabled.captcha-verifier";
import { MemoryCaptchaVerifier } from "@/adapters/captcha/memory.captcha-verifier";
import { RecaptchaCaptchaVerifier } from "@/adapters/captcha/recaptcha.captcha-verifier";
import { type Env, NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { CaptchaVerifier } from "./ports";

const allowedHostnames = (env: Env): string[] => [
  ...new Set(
    [...env.CORS_ORIGIN, env.APP_URL].map((origin) => new URL(origin).hostname),
  ),
];

export const captchaModule = defineModule({
  name: "captcha",

  register: ({ env, logger }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const verifier = new MemoryCaptchaVerifier();

      bind(CaptchaVerifier, () => verifier);

      return;
    }

    const { RECAPTCHA_V3_SECRET, RECAPTCHA_V2_SECRET } = env;

    if (!RECAPTCHA_V3_SECRET || !RECAPTCHA_V2_SECRET) {
      if (env.NODE_ENV === NodeEnv.Production) {
        throw new Error(
          "RECAPTCHA_V3_SECRET and RECAPTCHA_V2_SECRET are required in production",
        );
      }

      logger.warn(
        {
          missing: [
            ...(RECAPTCHA_V3_SECRET ? [] : ["RECAPTCHA_V3_SECRET"]),
            ...(RECAPTCHA_V2_SECRET ? [] : ["RECAPTCHA_V2_SECRET"]),
          ],
        },
        "captcha is disabled until both secrets are set; every captcha passes",
      );

      const verifier = new DisabledCaptchaVerifier();

      bind(CaptchaVerifier, () => verifier);

      return;
    }

    const verifier = new RecaptchaCaptchaVerifier({
      scoreSecret: RECAPTCHA_V3_SECRET,
      challengeSecret: RECAPTCHA_V2_SECRET,
      scoreThreshold: env.CAPTCHA_SCORE_THRESHOLD,
      hostnames: allowedHostnames(env),
    });

    bind(CaptchaVerifier, () => verifier);
  },
});
