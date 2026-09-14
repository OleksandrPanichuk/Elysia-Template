import z from "zod";

export const PurgeSpentTokensPayloadSchema = z.object({});

export type PurgeSpentTokensPayload = z.infer<
  typeof PurgeSpentTokensPayloadSchema
>;
