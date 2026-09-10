import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { SessionsService } from "@/modules/sessions";

export interface SignOutUseCaseOptions {
  sessionToken: string | undefined;
}

type Options = SignOutUseCaseOptions;
type Result = void;

export class SignOutUseCase extends UseCase<Options, Result> {
  private readonly sessionsService = makeService(SessionsService);

  public async execute({ sessionToken }: Options): Promise<Result> {
    await this.sessionsService.revoke(sessionToken);
  }
}
