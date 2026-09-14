import { makeRepository } from "@/core/registry";
import { Job, type JobSchedule } from "@/platform/jobs";

import {
  PURGE_SPENT_TOKENS_PATTERN,
  SPENT_TOKEN_RETENTION_MS,
  VERIFICATION_TOKENS_QUEUE,
  VerificationTokenQueueJobs,
} from "../../verification-tokens.constans";
import { VerificationTokensRepository } from "../../verification-tokens.repository";
import {
  type PurgeSpentTokensPayload,
  PurgeSpentTokensPayloadSchema,
} from "./schema";

export class PurgeSpentTokensJob extends Job<PurgeSpentTokensPayload> {
  public readonly name = VerificationTokenQueueJobs.PurgeSpentTokens;
  public readonly queue = VERIFICATION_TOKENS_QUEUE;
  public readonly schema = PurgeSpentTokensPayloadSchema;

  public readonly schedule: JobSchedule<PurgeSpentTokensPayload> = {
    pattern: PURGE_SPENT_TOKENS_PATTERN,
    payload: {},
  };

  private readonly repository = makeRepository(VerificationTokensRepository);

  public async handle(): Promise<void> {
    const before = new Date(Date.now() - SPENT_TOKEN_RETENTION_MS);
    const deleted = await this.repository.deleteSpent(before);

    if (deleted > 0) {
      this.logger.info({ deleted }, "purged spent verification tokens");
    }
  }
}
