import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { Context } from "elysia";

import { NodeEnv } from "@/configs/env.config";
import { Service } from "@/core/service";

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

export class OAuthTransactions extends Service {
  private readonly now = () => Date.now();

  constructor() {
    super();
  }

  public issue({
    provider,
    redirectTo,
    linkUserId = null,
  }: IssueOAuthTransactionOptions): OAuthTransaction {
    return {
      provider,
      state: this.randomToken(OAUTH_STATE_BYTES),
      nonce: this.randomToken(OAUTH_NONCE_BYTES),
      codeVerifier: this.randomToken(OAUTH_CODE_VERIFIER_BYTES),
      redirectTo,
      linkUserId,
      expiresAt: this.now() + OAUTH_TRANSACTION_TTL_MS,
    };
  }

  public challengeFor(codeVerifier: string): string {
    return this.base64Url(createHash("sha256").update(codeVerifier).digest());
  }

  public write(cookies: CookieJar, transaction: OAuthTransaction): void {
    const payload = this.base64Url(Buffer.from(JSON.stringify(transaction)));

    cookies[this.cookieName]!.set({
      ...this.cookieOptions,
      value: `${payload}.${this.sign(payload)}`,
      expires: new Date(transaction.expiresAt),
    });
  }

  public clear(cookies: CookieJar): void {
    cookies[this.cookieName]!.set({
      ...this.cookieOptions,
      value: "",
      expires: new Date(0),
      maxAge: 0,
    });
  }

  public consume(
    cookies: CookieJar,
    provider: OAuthProviderName,
    state: string,
  ): OAuthTransaction {
    const raw = cookies[this.cookieName]?.value;

    this.clear(cookies);

    if (typeof raw !== "string") {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    const separator = raw.lastIndexOf(".");

    if (separator <= 0) {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);

    if (!this.matches(signature, this.sign(payload))) {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    const transaction = this.parse(payload);

    const isValid =
      transaction?.provider === provider &&
      transaction.expiresAt > this.now() &&
      this.matches(transaction.state, state);

    if (!isValid) {
      throw new OAuthTransactionInvalidError(INVALID_TRANSACTION_MESSAGE);
    }

    return transaction;
  }

  private get isProduction(): boolean {
    return this.env.NODE_ENV === NodeEnv.Production;
  }

  private get cookieName(): string {
    return this.isProduction
      ? `__Host-${OAUTH_TRANSACTION_COOKIE_NAME}`
      : OAUTH_TRANSACTION_COOKIE_NAME;
  }

  private get cookieOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: "lax" as const,
      path: "/",
    };
  }

  private get secret(): string {
    const secret = this.env.OAUTH_STATE_SECRET;

    if (!secret) {
      throw new Error("OAUTH_STATE_SECRET is required to sign OAuth state");
    }

    return secret;
  }

  private sign(payload: string): string {
    return this.base64Url(
      createHmac("sha256", this.secret).update(payload).digest(),
    );
  }

  private matches(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);

    return a.length === b.length && timingSafeEqual(a, b);
  }

  private parse(payload: string): OAuthTransaction | null {
    try {
      return JSON.parse(
        Buffer.from(payload, "base64url").toString(),
      ) as OAuthTransaction;
    } catch {
      return null;
    }
  }

  private base64Url(input: Buffer): string {
    return input.toString("base64url");
  }

  private randomToken(bytes: number): string {
    return this.base64Url(randomBytes(bytes));
  }
}
