import { make } from "@/core/registry";
import { Service } from "@/core/service";

import { type EmailClient, SendEmailJob } from "./jobs";
import { EmailKind } from "./notifications.constants";

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

interface SendSecurityNoticeOptions extends AuthNotificationRecipient {
  occurredAt: Date;
  client: EmailClient;
  securityUrl: string;
}

export class NotificationsService extends Service {
  private readonly sendEmail = make(SendEmailJob);

  public sendEmailVerification(
    options: SendEmailVerificationOptions,
  ): Promise<void> {
    const { userId, email, name, verificationUrl, expiresInHours } = options;

    return this.sendEmail.dispatch({
      kind: EmailKind.EmailVerification,
      to: { userId, email, name },
      verificationUrl,
      expiresInHours,
    });
  }

  public sendPasswordChanged(
    options: SendSecurityNoticeOptions,
  ): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.PasswordChanged,
      ...this.securityNotice(options),
    });
  }

  public sendNewSignIn(options: SendSecurityNoticeOptions): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.NewSignIn,
      ...this.securityNotice(options),
    });
  }

  private securityNotice({
    userId,
    email,
    name,
    occurredAt,
    client,
    securityUrl,
  }: SendSecurityNoticeOptions) {
    return {
      to: { userId, email, name },
      occurredAt: occurredAt.toISOString(),
      client,
      securityUrl,
    };
  }

  public sendPasswordReset(options: SendPasswordResetOptions): Promise<void> {
    const { userId, email, name, resetUrl, expiresInMinutes } = options;

    return this.sendEmail.dispatch({
      kind: EmailKind.PasswordReset,
      to: { userId, email, name },
      resetUrl,
      expiresInMinutes,
    });
  }
}
