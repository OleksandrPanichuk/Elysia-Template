import type { MemoryMailer } from "@/adapters/mail/memory.mailer";
import { make } from "@/core/registry";
import type { EmailMessage } from "@/modules/notifications/ports";
import { Mailer } from "@/modules/notifications/ports";

const mailer = (): MemoryMailer => make(Mailer) as MemoryMailer;

export const inbox = {
  all: (): readonly EmailMessage[] => mailer().sent(),

  for: (email: string): readonly EmailMessage[] => mailer().sentTo(email),

  lastFor: (email: string): EmailMessage => {
    const messages = mailer().sentTo(email);
    const last = messages[messages.length - 1];

    if (!last) {
      throw new Error(
        `No email was sent to ${email}. Sent so far: ${
          mailer()
            .sent()
            .map((message) => message.to.email)
            .join(", ") || "none"
        }`,
      );
    }

    return last;
  },

  tokenFor: (email: string): string => {
    const message = inbox.lastFor(email);
    const match = /[?&]token=([^\s"&<]+)/.exec(message.text + message.html);

    if (!match?.[1]) {
      throw new Error(`No token in the email sent to ${email}`);
    }

    return decodeURIComponent(match[1]);
  },
};
