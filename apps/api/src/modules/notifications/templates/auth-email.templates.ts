export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface ActionEmailOptions {
  name?: string;
  title: string;
  preheader: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  expirationText: string;
  ignoreText: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );

const normalizeName = (name?: string): string => {
  const normalized = name?.replaceAll(/[\r\n]+/g, " ").trim();

  return normalized ?? "there";
};

const renderActionEmail = ({
  name,
  title,
  preheader,
  description,
  actionLabel,
  actionUrl,
  expirationText,
  ignoreText,
}: ActionEmailOptions): Omit<RenderedEmail, "subject"> => {
  const safeName = escapeHtml(normalizeName(name));
  const safeActionUrl = escapeHtml(actionUrl);

  return {
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f5f7;font-family:Inter,Arial,sans-serif;color:#17202a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5f7;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td style="padding:0 4px 20px;font-size:26px;font-weight:800;letter-spacing:-1px;color:#111827;">
                velo<span style="color:#65a30d;">.</span>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:48px 42px;box-shadow:0 12px 36px rgba(15,23,42,.08);">
                <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#ecfccb;color:#3f6212;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
                  Account security
                </div>

                <h1 style="margin:24px 0 16px;font-size:32px;line-height:1.2;letter-spacing:-.8px;color:#111827;">
                  ${escapeHtml(title)}
                </h1>

                <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#374151;">
                  Hi ${safeName},
                </p>

                <p style="margin:0 0 30px;font-size:16px;line-height:1.7;color:#4b5563;">
                  ${escapeHtml(description)}
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td bgcolor="#65a30d" style="border-radius:12px;">
                      <a
                        href="${safeActionUrl}"
                        style="display:inline-block;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;border-radius:12px;"
                      >
                        ${escapeHtml(actionLabel)}
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
                  ${escapeHtml(expirationText)}
                </p>

                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
                  If the button does not work, copy this link:
                </p>

                <p style="margin:0;padding:12px;border-radius:8px;background:#f8fafc;word-break:break-all;font-size:12px;line-height:1.6;color:#475569;">
                  ${safeActionUrl}
                </p>

                <hr style="margin:34px 0 24px;border:0;border-top:1px solid #e5e7eb;">

                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                  ${escapeHtml(ignoreText)}
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:22px 12px 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                © ${new Date().getUTCFullYear()} Velo · Please do not reply to this automated email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: [
      title,
      "",
      `Hi ${normalizeName(name)},`,
      "",
      description,
      "",
      `${actionLabel}: ${actionUrl}`,
      "",
      expirationText,
      ignoreText,
    ].join("\n"),
  };
};

export const renderEmailVerificationEmail = (
  options: Pick<ActionEmailOptions, "name" | "actionUrl" | "expirationText">,
): RenderedEmail => ({
  subject: "Verify your Velo email",
  ...renderActionEmail({
    ...options,
    title: "Verify your email",
    preheader: "Confirm your email address to finish setting up Velo.",
    description:
      "Confirm that this email belongs to you and finish setting up your account.",
    actionLabel: "Verify email",
    ignoreText:
      "If you did not create a Velo account, you can safely ignore this email.",
  }),
});

export const renderPasswordResetEmail = (
  options: Pick<ActionEmailOptions, "name" | "actionUrl" | "expirationText">,
): RenderedEmail => ({
  subject: "Reset your Velo password",
  ...renderActionEmail({
    ...options,
    title: "Reset your password",
    preheader: "Use this secure link to choose a new Velo password.",
    description:
      "We received a request to reset your password. Use the secure link below to choose a new one.",
    actionLabel: "Reset password",
    ignoreText:
      "If you did not request a password reset, you can safely ignore this email. Your password has not changed.",
  }),
});
