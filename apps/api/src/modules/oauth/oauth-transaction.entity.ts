import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { Context } from "elysia";

import { getEnv } from "@/configs";
import { NodeEnv } from "@/configs/env.config";

import {
  OAUTH_CODE_VERIFIER_BYTES,
  OAUTH_NONCE_BYTES,
  OAUTH_STATE_BYTES,
  OAUTH_TRANSACTION_COOKIE_NAME,
  OAUTH_TRANSACTION_TTL_MS,
  type OAuthProviderName,
} from "./oauth.constants";
import { OAuthTransactionInvalidError } from "./oauth.errors";

type CookieJar = Context["cookie"];

export interface OAuthTransaction {
  provider: OAuthProviderName;
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectTo: string | null;
  linkUserId: string | null;
  expiresAt: number;
}

export interface IssueOAuthTransactionOptions {
  provider: OAuthProviderName;
  redirectTo: string | null;
  linkUserId?: string | null;
}

const INVALID_TRANSACTION_MESSAGE = "Invalid sign-in attempt";

export class OAuthTransaction {
  public static issue({
    provider,
    redirectTo,
    linkUserId = null,
  }: IssueOAuthTransactionOptions): OAuthTransaction {
    return {
      provider,
      state: OAuthTransaction.randomToken(OAUTH_STATE_BYTES),
      nonce: OAuthTransaction.randomToken(OAUTH_NONCE_BYTES),
      codeVerifier: OAuthTransaction.randomToken(OAUTH_CODE_VERIFIER_BYTES),
      redirectTo,
      linkUserId,
      expiresAt: Date.now() + OAUTH_TRANSACTION_TTL_MS,
    };
  }

  public static challengeFor(codeVerifier: string): string {
    return OAuthTransaction.base64Url(
      createHash("sha256").update(codeVerifier).digest(),
    );
  }

  public static write(cookies: CookieJar, transaction: OAuthTransaction): void {
    const payload = OAuthTransaction.base64Url(
      Buffer.from(JSON.stringify(transaction)),
    );

    cookies[OAuthTransaction.cookieName]!.set({
      ...OAuthTransaction.cookieOptions,
      value: `${payload}.${OAuthTransaction.sign(payload)}`,
      expires: new Date(transaction.expiresAt),
    });
  }

  public static clear(cookies: CookieJar): void {
    cookies[OAuthTransaction.cookieName]!.set({
      ...OAuthTransaction.cookieOptions,
      value: "",
      expires: new Date(0),
      maxAge: 0,
    });
  }

  public static consume(
    cookies: CookieJar,
    provider: OAuthProviderName,
    state: string,
  ): OAuthTransaction {
    const raw = cookies[OAuthTransaction.cookieName]?.value;

    OAuthTransaction.clear(cookies);

    if (typeof raw !== "string") {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    const separator = raw.lastIndexOf(".");

    if (separator <= 0) {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);

    if (!OAuthTransaction.matches(signature, OAuthTransaction.sign(payload))) {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    const transaction = OAuthTransaction.parse(payload);

    const isValid =
      transaction?.provider === provider &&
      transaction.expiresAt > Date.now() &&
      OAuthTransaction.matches(transaction.state, state);

    if (!isValid) {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    return transaction;
  }

  private static get isProduction(): boolean {
    return getEnv().NODE_ENV === NodeEnv.Production;
  }

  private static get cookieName(): string {
    return OAuthTransaction.isProduction
      ? `__Host-${OAUTH_TRANSACTION_COOKIE_NAME}`
      : OAUTH_TRANSACTION_COOKIE_NAME;
  }

  private static get cookieOptions() {
    return {
      httpOnly: true,
      secure: OAuthTransaction.isProduction,
      sameSite: "lax" as const,
      path: "/",
    };
  }

  private static get secret(): string {
    const secret = getEnv().OAUTH_STATE_SECRET;

    if (!secret) {
      throw new Error("OAUTH_STATE_SECRET is required to sign OAuth state");
    }

    return secret;
  }

  private static sign(payload: string): string {
    return OAuthTransaction.base64Url(
      createHmac("sha256", OAuthTransaction.secret).update(payload).digest(),
    );
  }

  private static matches(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);

    return a.length === b.length && timingSafeEqual(a, b);
  }

  private static parse(payload: string): OAuthTransaction | null {
    try {
      return JSON.parse(
        Buffer.from(payload, "base64url").toString(),
      ) as OAuthTransaction;
    } catch {
      return null;
    }
  }

  private static base64Url(input: Buffer): string {
    return input.toString("base64url");
  }

  private static randomToken(bytes: number): string {
    return OAuthTransaction.base64Url(randomBytes(bytes));
  }
}
