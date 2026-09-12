import { GitHubOAuthProvider } from "@/adapters/oauth/github.oauth-provider";
import { GoogleOAuthProvider } from "@/adapters/oauth/google.oauth-provider";
import { MemoryOAuthProvider } from "@/adapters/oauth/memory.oauth-provider";
import { NodeEnv } from "@/configs/env.config";
import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { OAuthProviderName } from "./oauth.constants";
import {
  listOAuthProviders,
  registerOAuthProvider,
  resetOAuthProviders,
} from "./oauth.registry";
import { oauthRoutes } from "./oauth.routes";
import {
  CompleteOAuthFlowUseCase,
  LinkOAuthAccountUseCase,
  StartOAuthFlowUseCase,
  UnlinkOAuthAccountUseCase,
} from "./use-cases";

export const oauthModule = defineModule({
  name: "oauth",

  register: ({ env, logger }) => {
    resetOAuthProviders();

    if (env.NODE_ENV === NodeEnv.Test) {
      const google = new MemoryOAuthProvider({
        name: OAuthProviderName.Google,
        accountType: "GOOGLE",
      });
      const github = new MemoryOAuthProvider({
        name: OAuthProviderName.GitHub,
        accountType: "GITHUB",
      });

      registerOAuthProvider(OAuthProviderName.Google, () => google);
      registerOAuthProvider(OAuthProviderName.GitHub, () => github);

      return;
    }

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env;
    const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env;

    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      const google = new GoogleOAuthProvider({
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
      });

      registerOAuthProvider(OAuthProviderName.Google, () => google);
    }

    if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
      const github = new GitHubOAuthProvider({
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
      });

      registerOAuthProvider(OAuthProviderName.GitHub, () => github);
    }

    const providers = listOAuthProviders();

    if (providers.length > 0 && !env.OAUTH_STATE_SECRET) {
      throw new Error(
        "OAUTH_STATE_SECRET is required when an OAuth provider is configured",
      );
    }

    logger.info({ providers }, "oauth providers ready");
  },

  routes: () =>
    oauthRoutes({
      startOAuthFlow: makeUseCase(StartOAuthFlowUseCase),
      completeOAuthFlow: makeUseCase(CompleteOAuthFlowUseCase),
      linkOAuthAccount: makeUseCase(LinkOAuthAccountUseCase),
      unlinkOAuthAccount: makeUseCase(UnlinkOAuthAccountUseCase),
    }),
});
