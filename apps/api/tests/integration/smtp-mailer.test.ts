import { afterAll, describe, expect, test } from "bun:test";

import { SmtpMailer } from "@/adapters/mail/smtp.mailer";
import { loadEnv } from "@/configs";

const url = process.env.TEST_SMTP_URL;
const inboxUrl = process.env.TEST_MAILPIT_URL;

const mailer = url
  ? new SmtpMailer(
      loadEnv({
        ...Bun.env,
        NODE_ENV: "development",
        SMTP_URL: url,
        DATABASE_URL: "postgresql://unused:unused@127.0.0.1:5432/unused",
        SESSIONS_REDIS_URL: "redis://127.0.0.1:6379",
        JOBS_REDIS_URL: "redis://127.0.0.1:6379",
        CACHE_REDIS_URL: "redis://127.0.0.1:6379",
      }),
    )
  : undefined;

const delivered = async (): Promise<
  Array<{ To: Array<{ Address: string }> }>
> => {
  const response = await fetch(`${inboxUrl}/api/v1/messages`);
  const body = (await response.json()) as {
    messages: Array<{ To: Array<{ Address: string }> }>;
  };

  return body.messages;
};

afterAll(async () => {
  if (!mailer) return;

  await mailer.close().catch(() => undefined);
  await fetch(`${inboxUrl}/api/v1/messages`, { method: "DELETE" }).catch(
    () => undefined,
  );
});

describe.skipIf(!mailer || !inboxUrl)(
  "SmtpMailer against a real server",
  () => {
    test("verifies the connection", async () => {
      expect(await mailer!.verify().then(() => "ok")).toBe("ok");
    });

    test("delivers a message the server accepts", async () => {
      const to = `probe-${crypto.randomUUID()}@example.test`;

      await mailer!.send({
        to: { email: to, name: "Probe" },
        subject: "Integration probe",
        html: "<p>hello</p>",
        text: "hello",
      });

      const messages = await delivered();

      expect(
        messages.some((message) =>
          message.To.some((address) => address.Address === to),
        ),
      ).toBe(true);
    });
  },
);
