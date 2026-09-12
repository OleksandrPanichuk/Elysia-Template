import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getCurrentUserRoute } from "./routes";
import type { GetCurrentUserUseCase } from "./use-cases";

export interface UsersActions {
  getCurrentUser: Executable<GetCurrentUserUseCase>;
}

export const usersRoutes = (actions: UsersActions) =>
  new Elysia({ name: "users", prefix: "/users" }).get(
    "/me",
    ...getCurrentUserRoute(actions),
  );
