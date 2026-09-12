import { createRemoteJWKSet, jwtVerify } from "jose";

import type { AccountType } from "@/db";
import { OAuthProviderName } from "@/modules/oauth/oauth.constants";
import {
  OAuthEmailUnavailableError,
  OAuthExchangeFailedError,
} from "@/modules/oauth/oauth.errors";
import {
  type OAuthAuthorizationRequest,
  type OAuthExchangeOptions,
  type OAuthIdentity,
  OAuthProvider,
} from "@/modules/oauth/ports/oauth-provider";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const SCOPE = "openid email profile";
const GMAIL_SUFFIX = "@gmail.com";

export interface GoogleOAuthProviderOptions {
  clientId: string;
  clientSecret: string;
}

interface GoogleTokenResponse {
  id_token?: string;
}

interface GoogleIdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  hd?: string;
  name?: string;
  picture?: string;
  nonce?: string;
}

export class GoogleOAuthProvider extends OAuthProvider {
  public readonly name = OAuthProviderName.Google;

  public readonly accountType: AccountType = "GOOGLE";

  private readonly jwks = createRemoteJWKSet(new URL(JWKS_URI));

  constructor(private readonly options: GoogleOAuthProviderOptions) {
    super();
  }

  public buildAuthorizationUrl({
    state,
    nonce,
    codeChallenge,
    redirectUri,
  }: OAuthAuthorizationRequest): string {
    const url = new URL(AUTHORIZATION_ENDPOINT);

    url.search = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "online",
      prompt: "select_account",
    }).toString();

    return url.toString();
  }

  public async exchange({
    code,
    codeVerifier,
    nonce,
    redirectUri,
  }: OAuthExchangeOptions): Promise<OAuthIdentity> {
    const idToken = await this.requestIdToken({
      code,
      codeVerifier,
      redirectUri,
    });
    const claims = await this.verifyIdToken(idToken, nonce);

    if (!claims.sub) {
      throw new OAuthExchangeFailedError("Google did not return an account id");
    }

    if (!claims.email) {
      throw new OAuthEmailUnavailableError(
        "Google did not return an email address",
      );
    }

    return {
      providerAccountId: claims.sub,
      email: claims.email,
      emailIsAuthoritative: this.isAuthoritative(claims),
      name: claims.name ?? null,
      avatarUrl: claims.picture ?? null,
    };
  }

  private async requestIdToken({
    code,
    codeVerifier,
    redirectUri,
  }: Omit<OAuthExchangeOptions, "nonce">): Promise<string> {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new OAuthExchangeFailedError("Could not complete Google sign-in");
    }

    const token = (await response.json()) as GoogleTokenResponse;

    if (!token.id_token) {
      throw new OAuthExchangeFailedError("Google did not return an id token");
    }

    return token.id_token;
  }

  private async verifyIdToken(
    idToken: string,
    nonce: string,
  ): Promise<GoogleIdTokenClaims> {
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: ISSUERS,
        audience: this.options.clientId,
      });

      if (payload.nonce !== nonce) {
        throw new OAuthExchangeFailedError("Could not complete Google sign-in");
      }

      return payload;
    } catch (error) {
      if (error instanceof OAuthExchangeFailedError) throw error;

      throw new OAuthExchangeFailedError("Could not verify Google identity");
    }
  }

  private isAuthoritative(claims: GoogleIdTokenClaims): boolean {
    if (!claims.email_verified) return false;

    return claims.email!.endsWith(GMAIL_SUFFIX) || Boolean(claims.hd);
  }
}
