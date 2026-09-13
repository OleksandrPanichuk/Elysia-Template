import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { SessionsService } from "../sessions.service";

export interface RevokeOtherSessionsUseCaseOptions {
  userId: string;
  sessionToken: string | undefined;
}

type Options = RevokeOtherSessionsUseCaseOptions;
type Result = void;

export class RevokeOtherSessionsUseCase extends UseCase<Options, Result> {
  private readonly sessionsService = makeService(SessionsService);

  public execute({ userId, sessionToken }: Options): Promise<Result> {
    return this.sessionsService.revokeOthers(userId, sessionToken);
  }
}
