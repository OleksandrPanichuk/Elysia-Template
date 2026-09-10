import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { AccountsRepository } from "./accounts.repository";
import { PostgresAccountsRepository } from "./repositories";

export const accountsModule = defineModule({
  name: "accounts",

  register: () => {
    bind(AccountsRepository, () => new PostgresAccountsRepository());
  },
});
