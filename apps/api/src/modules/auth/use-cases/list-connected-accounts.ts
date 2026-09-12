import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { type AccountEntity, AccountsRepository } from "@/modules/accounts";

export interface ListConnectedAccountsUseCaseOptions {
  userId: string;
}

type Options = ListConnectedAccountsUseCaseOptions;
type Result = AccountEntity[];

export class ListConnectedAccountsUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  public execute({ userId }: Options): Promise<Result> {
    return this.accountsRepository.listByUserId(userId);
  }
}
