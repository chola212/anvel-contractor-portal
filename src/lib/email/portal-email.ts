type PortalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: {
    filename: string;
    content: string;
  }[];
};

export function getPortalBaseUrl(origin?: string | null) {
  return (
    origin ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://portal.anvelconsulting.com"
  ).replace(/\/$/, "");
}

export function buildAuthCallbackUrl(origin: string | null | undefined) {
  return `${getPortalBaseUrl(origin)}/auth/callback?next=/reset-password`;
}

export async function sendPortalEmail(input: PortalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.PORTAL_EMAIL_FROM ??
    "ANVEL Consulting <contact@anvelconsulting.com>";

  if (!apiKey) {
    return { sent: false as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email provider rejected the message: ${message}`);
  }

  return { sent: true as const };
}

function wrapEmailHtml(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.5;">
      <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #0f766e; text-transform: uppercase;">
        ANVEL Contractor Portal
      </p>
      <h1 style="font-size: 22px; margin: 12px 0;">${title}</h1>
      ${body}
      <p style="margin-top: 28px; font-size: 13px; color: #525252;">
        ERP Utilities Consulting Services Ltd.
      </p>
    </div>
  `;
}

export function buildInviteEmail(contractorName: string, inviteLink: string) {
  return {
    subject: "Your ANVEL Contractor Portal invitation",
    html: wrapEmailHtml(
      "Set your portal password",
      `
        <p>Hello ${contractorName},</p>
        <p>Your ANVEL Contractor Portal account has been prepared. Use the secure link below to set your password and access your account.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteLink}" style="background: #115e59; color: #ffffff; padding: 11px 16px; border-radius: 6px; text-decoration: none; font-weight: 700;">
            Set password
          </a>
        </p>
        <p>If you were not expecting this invitation, please contact ANVEL operations.</p>
      `,
    ),
    text: `Hello ${contractorName},

Your ANVEL Contractor Portal account has been prepared. Use this secure link to set your password:

${inviteLink}

If you were not expecting this invitation, please contact ANVEL operations.

ERP Utilities Consulting Services Ltd.`,
  };
}

export function buildPasswordResetEmail(resetLink: string) {
  return {
    subject: "Reset your ANVEL Contractor Portal password",
    html: wrapEmailHtml(
      "Reset your password",
      `
        <p>Use the secure link below to choose a new password for your ANVEL Contractor Portal account.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="background: #115e59; color: #ffffff; padding: 11px 16px; border-radius: 6px; text-decoration: none; font-weight: 700;">
            Choose new password
          </a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    ),
    text: `Use this secure link to choose a new ANVEL Contractor Portal password:

${resetLink}

If you did not request this, you can ignore this email.

ERP Utilities Consulting Services Ltd.`,
  };
}

export function buildSelfBillingInvoiceEmail(
  contractorName: string,
  monthLabel: string,
) {
  return {
    subject: `Self-billing invoice for ${monthLabel}`,
    html: wrapEmailHtml(
      `Self-billing invoice for ${monthLabel}`,
      `
        <p>Hello ${contractorName},</p>
        <p>Please find attached your self-billing invoice for ${monthLabel}.</p>
        <p>This invoice has been generated based on the approved timesheet for the corresponding month.</p>
        <p>Kind regards,<br />ANVEL Consulting</p>
      `,
    ),
    text: `Hello ${contractorName},

Please find attached your self-billing invoice for ${monthLabel}.

This invoice has been generated based on the approved timesheet for the corresponding month.

Kind regards,
ANVEL Consulting`,
  };
}

export function buildNotificationEmail(title: string, body: string) {
  return {
    subject: title,
    html: wrapEmailHtml(title, `<p>${body}</p><p>Kind regards,<br />ANVEL Consulting</p>`),
    text: `${body}

Kind regards,
ANVEL Consulting`,
  };
}
