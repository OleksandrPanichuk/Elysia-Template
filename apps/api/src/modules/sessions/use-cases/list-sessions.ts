import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { StoredSession } from "../session.store";
import { SessionsService } from "../sessions.service";

export interface ListSessionsUseCaseOptions {
  userId: string;
}

type Options = ListSessionsUseCaseOptions;
type Result = StoredSession[];

export class ListSessionsUseCase extends UseCase<Options, Result> {
  private readonly sessionsService = makeService(SessionsService);

  public execute({ userId }: Options): Promise<Result> {
    return this.sessionsService.list(userId);
  }
}
