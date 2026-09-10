import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

import { getEnv } from "@/configs";
import { getLogger } from "@/infrastructure";
import {
  type EmailMessage,
  MailDeliveryError,
  Mailer,
} from "@/modules/notifications";

export class SmtpMailer extends Mailer {
  private readonly transporter: Transporter;

  constructor(private readonly env = getEnv()) {
    super();

    if (!env.SMTP_URL) {
      throw new Error("SMTP_URL is not defined in the environment");
    }

    this.transporter = nodemailer.createTransport({
      url: env.SMTP_URL,
      pool: true,
      maxConnections: 5,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  public async send(message: EmailMessage): Promise<void> {
    try {
      const result = await this.transporter.sendMail({
        from: {
          name: this.env.MAIL_FROM_NAME,
          address: this.env.MAIL_FROM_ADDRESS,
        },
        to: {
          name: message.to.name,
          address: message.to.email,
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      getLogger().info(
        {
          component: "SmtpMailer",
          messageId: result.messageId,
          userId: message.to.userId,
        },
        "email dispatched",
      );
    } catch (cause) {
      getLogger().error(
        {
          component: "SmtpMailer",
          userId: message.to.userId,
          err: cause,
        },
        "email delivery failed",
      );

      throw new MailDeliveryError(cause);
    }
  }

  public async verify(): Promise<void> {
    await this.transporter.verify();
  }

  public close(): Promise<void> {
    this.transporter.close();

    return Promise.resolve();
  }
}
