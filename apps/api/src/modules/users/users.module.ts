import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { PostgresUsersRepository } from "./repositories";
import { GetCurrentUserUseCase } from "./use-cases";
import { usersPlugin } from "./users.plugin";
import { UsersRepository } from "./users.repository";
import { usersRoutes } from "./users.routes";

export const usersModule = defineModule({
  name: "users",

  register: () => {
    bind(UsersRepository, () => new PostgresUsersRepository());
  },

  plugins: () => usersPlugin,

  routes: () =>
    usersRoutes({
      getCurrentUser: makeUseCase(GetCurrentUserUseCase),
    }),
});
