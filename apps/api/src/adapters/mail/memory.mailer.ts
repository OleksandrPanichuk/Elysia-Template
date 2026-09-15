import type { EmailMessage } from "@/modules/notifications/ports";
import { Mailer } from "@/modules/notifications/ports";

export class MemoryMailer extends Mailer {
  private readonly messages: EmailMessage[] = [];

  public send(message: EmailMessage): Promise<void> {
    this.messages.push(message);

    return Promise.resolve();
  }

  public sent(): readonly EmailMessage[] {
    return this.messages;
  }

  public sentTo(email: string): readonly EmailMessage[] {
    const address = email.trim().toLowerCase();

    return this.messages.filter(
      (message) => message.to.email.toLowerCase() === address,
    );
  }

  public clear(): void {
    this.messages.length = 0;
  }
}
