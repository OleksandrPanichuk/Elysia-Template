import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { PostgresVerificationTokensRepository } from "./repositories";
import { VerificationTokensRepository } from "./verification-tokens.repository";

export const verificationTokensModule = defineModule({
  name: "verification-tokens",

  register: () => {
    bind(
      VerificationTokensRepository,
      () => new PostgresVerificationTokensRepository(),
    );
  },
});
