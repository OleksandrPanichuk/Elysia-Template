import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { SessionNotFoundError } from "../sessions.errors";
import { SessionsService } from "../sessions.service";

export interface RevokeSessionUseCaseOptions {
  userId: string;
  sessionId: string;
}

type Options = RevokeSessionUseCaseOptions;
type Result = void;

export class RevokeSessionUseCase extends UseCase<Options, Result> {
  private readonly sessionsService = makeService(SessionsService);

  public async execute({ userId, sessionId }: Options): Promise<Result> {
    const revoked = await this.sessionsService.revokeById(userId, sessionId);

    if (!revoked) {
      throw new SessionNotFoundError("Session not found");
    }
  }
}
