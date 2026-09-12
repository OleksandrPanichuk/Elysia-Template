import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { OAUTH_CALLBACK_PATH } from "./oauth.constants";
import {
  authorizeRoute,
  callbackRoute,
  linkRoute,
  unlinkRoute,
} from "./routes";
import type {
  CompleteOAuthFlowUseCase,
  LinkOAuthAccountUseCase,
  StartOAuthFlowUseCase,
  UnlinkOAuthAccountUseCase,
} from "./use-cases";

export interface OAuthActions {
  startOAuthFlow: Executable<StartOAuthFlowUseCase>;
  completeOAuthFlow: Executable<CompleteOAuthFlowUseCase>;
  linkOAuthAccount: Executable<LinkOAuthAccountUseCase>;
  unlinkOAuthAccount: Executable<UnlinkOAuthAccountUseCase>;
}

export const oauthRoutes = (actions: OAuthActions) =>
  new Elysia({ name: "oauth", prefix: OAUTH_CALLBACK_PATH })
    .get("/:provider", ...authorizeRoute(actions))
    .get("/:provider/callback", ...callbackRoute(actions))
    .post("/:provider/link", ...linkRoute(actions))
    .post("/:provider/unlink", ...unlinkRoute(actions));
