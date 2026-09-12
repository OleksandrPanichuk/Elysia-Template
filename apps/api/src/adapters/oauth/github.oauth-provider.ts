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

const AUTHORIZATION_ENDPOINT = "https://github.com/login/oauth/authorize";
const TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const USER_ENDPOINT = "https://api.github.com/user";
const USER_EMAILS_ENDPOINT = "https://api.github.com/user/emails";
const SCOPE = "read:user user:email";
const API_VERSION = "2022-11-28";

export interface GitHubOAuthProviderOptions {
  clientId: string;
  clientSecret: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
}

interface GitHubUserResponse {
  id?: number;
  name?: string | null;
  login?: string;
  avatar_url?: string | null;
}

interface GitHubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

export class GitHubOAuthProvider extends OAuthProvider {
  public readonly name = OAuthProviderName.GitHub;

  public readonly accountType: AccountType = "GITHUB";

  constructor(private readonly options: GitHubOAuthProviderOptions) {
    super();
  }

  public buildAuthorizationUrl({
    state,
    codeChallenge,
    redirectUri,
  }: OAuthAuthorizationRequest): string {
    const url = new URL(AUTHORIZATION_ENDPOINT);

    url.search = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: redirectUri,
      scope: SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();

    return url.toString();
  }

  public async exchange({
    code,
    codeVerifier,
    redirectUri,
  }: OAuthExchangeOptions): Promise<OAuthIdentity> {
    const accessToken = await this.requestAccessToken({
      code,
      codeVerifier,
      redirectUri,
    });

    const [user, email] = await Promise.all([
      this.requestUser(accessToken),
      this.requestPrimaryEmail(accessToken),
    ]);

    if (!user.id) {
      throw new OAuthExchangeFailedError("GitHub did not return an account id");
    }

    return {
      providerAccountId: String(user.id),
      email,
      emailIsAuthoritative: true,
      name: user.name ?? user.login ?? null,
      avatarUrl: user.avatar_url ?? null,
    };
  }

  private async requestAccessToken({
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
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new OAuthExchangeFailedError("Could not complete GitHub sign-in");
    }

    const token = (await response.json()) as GitHubTokenResponse;

    if (token.error || !token.access_token) {
      throw new OAuthExchangeFailedError("Could not complete GitHub sign-in");
    }

    return token.access_token;
  }

  private async requestUser(accessToken: string): Promise<GitHubUserResponse> {
    const response = await fetch(USER_ENDPOINT, {
      headers: this.apiHeaders(accessToken),
    });

    if (!response.ok) {
      throw new OAuthExchangeFailedError("Could not read the GitHub profile");
    }

    return (await response.json()) as GitHubUserResponse;
  }

  private async requestPrimaryEmail(accessToken: string): Promise<string> {
    const response = await fetch(USER_EMAILS_ENDPOINT, {
      headers: this.apiHeaders(accessToken),
    });

    if (!response.ok) {
      throw new OAuthEmailUnavailableError(
        "Could not read a verified GitHub email address",
      );
    }

    const emails = (await response.json()) as GitHubEmailResponse[];
    const primary = emails.find((entry) => entry.primary && entry.verified);

    if (!primary) {
      throw new OAuthEmailUnavailableError(
        "Your GitHub account has no verified primary email address",
      );
    }

    return primary.email;
  }

  private apiHeaders(accessToken: string): Record<string, string> {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": API_VERSION,
    };
  }
}
