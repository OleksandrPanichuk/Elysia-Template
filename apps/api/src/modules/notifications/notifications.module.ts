import { LogMailer } from "@/adapters/mail/log.mailer";
import { SmtpMailer } from "@/adapters/mail/smtp.mailer";
import { getEnv, NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind, make } from "@/core/registry";

import { Mailer } from "./ports/mailer";

export const notificationsModule = defineModule({
  name: "notifications",

  register: () => {
    const env = getEnv();

    bind(Mailer, () =>
      env.NODE_ENV === NodeEnv.Test ? new LogMailer() : new SmtpMailer(),
    );
  },

  start: () => make(Mailer).verify(),

  shutdown: () => make(Mailer).close(),
});
