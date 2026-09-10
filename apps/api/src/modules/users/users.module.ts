import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { PostgresUsersRepository } from "./repositories";
import { UsersRepository } from "./users.repository";

export const usersModule = defineModule({
  name: "users",

  register: () => {
    bind(UsersRepository, () => new PostgresUsersRepository());
  },
});
