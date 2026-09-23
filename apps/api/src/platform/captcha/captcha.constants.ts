import { SECOND } from "@/constants";

import type { CaptchaKind } from "./ports";

export const CAPTCHA_TOKEN_HEADER = "x-captcha-token";

export const CAPTCHA_KIND_HEADER = "x-captcha-kind";

export const CAPTCHA_KINDS: readonly CaptchaKind[] = ["score", "challenge"];

export const CAPTCHA_VERIFY_TIMEOUT_MS = 3 * SECOND;
