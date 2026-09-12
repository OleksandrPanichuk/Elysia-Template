import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";

import type { OAuthProviderName } from "../oauth.constants";
import {
  LastAuthMethodError,
  OAuthProviderNotLinkedError,
} from "../oauth.errors";
import { getOAuthProvider } from "../oauth.registry";

export interface UnlinkOAuthAccountUseCaseOptions {
  userId: string;
  provider: OAuthProviderName;
}

type Options = UnlinkOAuthAccountUseCaseOptions;
type Result = void;

export class UnlinkOAuthAccountUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly accountsService = makeService(AccountsService);

  public async execute({ userId, provider }: Options): Promise<Result> {
    const { accountType } = getOAuthProvider(provider);

    const linked = await this.accountsRepository.findByUserIdAndType(
      userId,
      accountType,
    );

    if (!linked) {
      throw new OAuthProviderNotLinkedError(
        "This provider is not linked to your account",
      );
    }

    const canUnlink = await this.accountsService.canUnlink(userId, accountType);

    if (!canUnlink) {
      throw new LastAuthMethodError(
        "Set a password or link another provider before removing this one",
      );
    }

    await this.accountsRepository.deleteByUserIdAndType(userId, accountType);
  }
}
