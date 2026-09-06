import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { createUserRoute, listUsersRoute } from "./routes";
import type { CreateUserUseCase, ListUsersUseCase } from "./use-cases";
import { UserAlreadyExistsError } from "./users.errors";

export interface UsersActions {
  createUser: Executable<CreateUserUseCase>;
  listUsers: Executable<ListUsersUseCase>;
}

export const usersRoutes = (actions: UsersActions) =>
  new Elysia({ name: "users", prefix: "/users" })
    .onError(({ error, set }) => {
      if (error instanceof UserAlreadyExistsError) {
        set.status = error.status;
        return { code: error.code, error: error.message, module: "users" };
      }
    })
    .get("/", ...listUsersRoute(actions))
    .post("/", ...createUserRoute(actions));
