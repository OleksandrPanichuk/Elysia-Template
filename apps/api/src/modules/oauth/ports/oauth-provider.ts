import { Port } from "@/core/port";
import type { AccountType } from "@/db";

import type { OAuthProviderName } from "../oauth.constants";

export interface OAuthAuthorizationRequest {
  state: string;
  nonce: string;
  codeChallenge: string;
  redirectUri: string;
}

export interface OAuthExchangeOptions {
  code: string;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
}

export interface OAuthIdentity {
  providerAccountId: string;
  email: string;
  emailIsAuthoritative: boolean;
  name: string | null;
  avatarUrl: string | null;
}

export abstract class OAuthProvider extends Port {
  public abstract readonly name: OAuthProviderName;

  public abstract readonly accountType: AccountType;

  public abstract buildAuthorizationUrl(
    request: OAuthAuthorizationRequest,
  ): string;

  public abstract exchange(
    options: OAuthExchangeOptions,
  ): Promise<OAuthIdentity>;
}
