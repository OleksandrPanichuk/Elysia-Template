export interface EmailRecipient {
  userId?: string;
  name?: string;
  email: string;
}

export interface EmailMessage {
  to: EmailRecipient;
  subject: string;
  html: string;
  text: string;
}

export abstract class Mailer {
  public abstract send(message: EmailMessage): Promise<void>;

  public verify(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
