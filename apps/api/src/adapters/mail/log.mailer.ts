import { getLogger } from "@/infrastructure";
import type { EmailMessage } from "@/modules/notifications/ports";
import { Mailer } from "@/modules/notifications/ports";

export class LogMailer extends Mailer {
  public send(message: EmailMessage): Promise<void> {
    getLogger().info(
      {
        component: "LogMailer",
        to: message.to.email,
        userId: message.to.userId,
        subject: message.subject,
        text: message.text,
      },
      "email dispatched",
    );

    return Promise.resolve();
  }
}
