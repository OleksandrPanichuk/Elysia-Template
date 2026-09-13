import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  listSessionsRoute,
  revokeOtherSessionsRoute,
  revokeSessionRoute,
} from "./routes";
import type {
  ListSessionsUseCase,
  RevokeOtherSessionsUseCase,
  RevokeSessionUseCase,
} from "./use-cases";

export interface SessionsActions {
  listSessions: Executable<ListSessionsUseCase>;
  revokeSession: Executable<RevokeSessionUseCase>;
  revokeOtherSessions: Executable<RevokeOtherSessionsUseCase>;
}

export const sessionsRoutes = (actions: SessionsActions) =>
  new Elysia({ name: "sessions", prefix: "/sessions" })
    .get("/", ...listSessionsRoute(actions))
    .delete("/others", ...revokeOtherSessionsRoute(actions))
    .delete("/:id", ...revokeSessionRoute(actions));
