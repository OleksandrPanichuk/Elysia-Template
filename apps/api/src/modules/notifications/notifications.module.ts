import { LogMailer } from "@/adapters/mail/log.mailer";
import { SmtpMailer } from "@/adapters/mail/smtp.mailer";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerJob } from "@/platform/jobs";

import { SendEmailJob } from "./jobs";
import { Mailer } from "./ports/mailer";

export const notificationsModule = defineModule({
  name: "notifications",

  register: ({ env }) => {
    const mailer: Mailer =
      env.NODE_ENV === NodeEnv.Test ? new LogMailer() : new SmtpMailer(env);

    bind(Mailer, () => mailer);
    registerJob(SendEmailJob);

    return { mailer };
  },

  start: ({ state }) => state.mailer.verify(),

  shutdown: ({ state }) => state.mailer.close(),
});
