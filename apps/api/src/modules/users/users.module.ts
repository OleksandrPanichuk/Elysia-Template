import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { PostgresUsersRepository } from "./repositories";
import { CreateUserUseCase, ListUsersUseCase } from "./use-cases";
import { UsersRepository } from "./users.repository";
import { usersRoutes } from "./users.routes";

export const usersModule = defineModule({
  name: "users",

  register: () => {
    bind(UsersRepository, () => new PostgresUsersRepository());
  },

  routes: () =>
    usersRoutes({
      createUser: makeUseCase(CreateUserUseCase),
      listUsers: makeUseCase(ListUsersUseCase),
    }),
});
