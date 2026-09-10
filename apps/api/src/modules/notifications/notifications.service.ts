import { make } from "@/core/registry";
import { Service } from "@/core/service";

import { Mailer } from "./ports";
import {
  renderEmailVerificationEmail,
  renderPasswordResetEmail,
} from "./templates";

interface AuthNotificationRecipient {
  userId: string;
  email: string;
  name?: string;
}

interface SendEmailVerificationOptions extends AuthNotificationRecipient {
  verificationUrl: string;
  expiresInHours: number;
}

interface SendPasswordResetOptions extends AuthNotificationRecipient {
  resetUrl: string;
  expiresInMinutes: number;
}

export class NotificationsService extends Service {
  private readonly mailer = make(Mailer);

  public sendEmailVerification(
    options: SendEmailVerificationOptions,
  ): Promise<void> {
    const { userId, email, name, verificationUrl, expiresInHours } = options;

    const content = renderEmailVerificationEmail({
      name,
      actionUrl: verificationUrl,
      expirationText: `This link will expire in ${expiresInHours} hours.`,
    });

    return this.mailer.send({
      to: { userId, email, name },
      ...content,
    });
  }

  public sendPasswordReset(options: SendPasswordResetOptions): Promise<void> {
    const { userId, email, name, resetUrl, expiresInMinutes } = options;

    const content = renderPasswordResetEmail({
      name,
      actionUrl: resetUrl,
      expirationText: `This password reset link expires in ${expiresInMinutes} minutes.`,
    });

    return this.mailer.send({
      to: { userId, email, name },
      ...content,
    });
  }
}
