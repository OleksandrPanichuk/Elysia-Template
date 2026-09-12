import type { OAuthProviderName } from "./oauth.constants";
import { OAuthProviderNotConfiguredError } from "./oauth.errors";
import type { OAuthProvider } from "./ports/oauth-provider";

const providers = new Map<OAuthProviderName, () => OAuthProvider>();

export const registerOAuthProvider = (
  name: OAuthProviderName,
  resolve: () => OAuthProvider,
): void => {
  providers.set(name, resolve);
};

export const getOAuthProvider = (name: OAuthProviderName): OAuthProvider => {
  const resolve = providers.get(name);

  if (!resolve) {
    throw new OAuthProviderNotConfiguredError(
      `Provider "${name}" is not available`,
    );
  }

  return resolve();
};

export const listOAuthProviders = (): OAuthProviderName[] => [
  ...providers.keys(),
];

export const resetOAuthProviders = (): void => providers.clear();
