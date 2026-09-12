import z from "zod";

import { EmailKind } from "../../notifications.constants";

const RecipientSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  name: z.string().trim().min(1).optional(),
});

export const SendEmailPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(EmailKind.EmailVerification),
    to: RecipientSchema,
    verificationUrl: z.url(),
    expiresInHours: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal(EmailKind.PasswordReset),
    to: RecipientSchema,
    resetUrl: z.url(),
    expiresInMinutes: z.number().int().positive(),
  }),
]);

export type SendEmailPayload = z.infer<typeof SendEmailPayloadSchema>;
