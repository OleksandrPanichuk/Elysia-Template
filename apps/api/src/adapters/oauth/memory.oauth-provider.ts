import type { AccountType } from "@/db";
import type { OAuthProviderName } from "@/modules/oauth/oauth.constants";
import {
  type OAuthAuthorizationRequest,
  type OAuthExchangeOptions,
  type OAuthIdentity,
  OAuthProvider,
} from "@/modules/oauth/ports/oauth-provider";

export interface MemoryOAuthProviderOptions {
  name: OAuthProviderName;
  accountType: AccountType;
  identity?: OAuthIdentity;
}

const AUTHORIZATION_ENDPOINT = "https://oauth.test/authorize";

export class MemoryOAuthProvider extends OAuthProvider {
  public readonly name: OAuthProviderName;

  public readonly accountType: AccountType;

  private identity: OAuthIdentity;

  constructor(options: MemoryOAuthProviderOptions) {
    super();

    this.name = options.name;
    this.accountType = options.accountType;
    this.identity = options.identity ?? {
      providerAccountId: `${options.name}-account`,
      email: `${options.name}@example.test`,
      emailIsAuthoritative: true,
      name: "Test User",
      avatarUrl: null,
    };
  }

  public setIdentity(identity: OAuthIdentity): void {
    this.identity = identity;
  }

  public buildAuthorizationUrl({
    state,
    codeChallenge,
    redirectUri,
  }: OAuthAuthorizationRequest): string {
    const url = new URL(AUTHORIZATION_ENDPOINT);

    url.search = new URLSearchParams({
      provider: this.name,
      state,
      code_challenge: codeChallenge,
      redirect_uri: redirectUri,
    }).toString();

    return url.toString();
  }

  public exchange(_options: OAuthExchangeOptions): Promise<OAuthIdentity> {
    return Promise.resolve(this.identity);
  }
}
