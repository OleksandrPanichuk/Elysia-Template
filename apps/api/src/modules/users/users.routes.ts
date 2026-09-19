import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  deleteAccountRoute,
  getCurrentUserRoute,
  updateProfileRoute,
} from "./routes";
import type {
  DeleteAccountUseCase,
  GetCurrentUserUseCase,
  UpdateProfileUseCase,
} from "./use-cases";

export interface UsersActions {
  getCurrentUser: Executable<GetCurrentUserUseCase>;
  deleteAccount: Executable<DeleteAccountUseCase>;
  updateProfile: Executable<UpdateProfileUseCase>;
}

export const usersRoutes = (actions: UsersActions) =>
  new Elysia({ name: "users", prefix: "/users" })
    .get("/me", ...getCurrentUserRoute(actions))
    .patch("/me", ...updateProfileRoute(actions))
    .delete("/me", ...deleteAccountRoute(actions));
