import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { deleteAccountRoute, getCurrentUserRoute } from "./routes";
import type { DeleteAccountUseCase, GetCurrentUserUseCase } from "./use-cases";

export interface UsersActions {
  getCurrentUser: Executable<GetCurrentUserUseCase>;
  deleteAccount: Executable<DeleteAccountUseCase>;
}

export const usersRoutes = (actions: UsersActions) =>
  new Elysia({ name: "users", prefix: "/users" })
    .get("/me", ...getCurrentUserRoute(actions))
    .delete("/me", ...deleteAccountRoute(actions));
