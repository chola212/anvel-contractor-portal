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

const requiredPortalSender = "ANVEL Consulting <contact@anvelconsulting.com>";
export const portalAdminEmail =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? "contact@anvelconsulting.com";

export class PortalEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalEmailError";
  }
}

export function getPortalBaseUrl(origin?: string | null) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    origin ??
    "https://portal.anvelconsulting.com"
  ).replace(/\/$/, "");
}

export function buildAuthCallbackUrl(origin: string | null | undefined) {
  return `${getPortalBaseUrl(origin)}/auth/callback?next=/reset-password`;
}

type GeneratedAuthLinkProperties = {
  action_link?: string;
  hashed_token?: string;
  email_otp?: string;
  redirect_to?: string;
  verification_type?: string;
};

export function buildGeneratedAuthLink(
  properties: GeneratedAuthLinkProperties | null | undefined,
  fallbackType: "invite" | "recovery",
  origin?: string | null,
) {
  console.info("Generated Supabase auth link shape", {
    hasActionLink: Boolean(properties?.action_link),
    hasHashedToken: Boolean(properties?.hashed_token),
    hasEmailOtp: Boolean(properties?.email_otp),
    hasRedirectTo: Boolean(properties?.redirect_to),
    verificationType: properties?.verification_type ?? fallbackType,
  });

  if (properties?.hashed_token) {
    const callbackUrl = new URL(buildAuthCallbackUrl(origin));
    callbackUrl.searchParams.set("token_hash", properties.hashed_token);
    callbackUrl.searchParams.set(
      "type",
      properties.verification_type ?? fallbackType,
    );
    return callbackUrl.toString();
  }

  return properties?.action_link ?? null;
}

export async function sendPortalEmail(input: PortalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.PORTAL_EMAIL_FROM ??
    requiredPortalSender;

  if (!apiKey) {
    throw new PortalEmailError("RESEND_API_KEY is not configured.");
  }

  if (from !== requiredPortalSender) {
    throw new PortalEmailError(
      `PORTAL_EMAIL_FROM must be exactly ${requiredPortalSender}. Current value: ${from}`,
    );
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
    throw new PortalEmailError(
      `Resend rejected the message with ${response.status}: ${message}`,
    );
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
    subject: "Set your ANVEL Contractor Portal password",
    html: wrapEmailHtml(
      "Set your portal password",
      `
        <p>Hello ${contractorName},</p>
        <p>You have been invited to access the ANVEL Contractor Portal.</p>
        <p style="margin: 24px 0 16px;">
          <a href="${inviteLink}" style="display: inline-block; background: #115e59; color: #ffffff; padding: 11px 16px; border-radius: 6px; text-decoration: none; font-weight: 700;">
            Set password and access portal
          </a>
        </p>
        <p style="margin: 0 0 8px;">If the button does not work, copy and paste this secure link into your browser:</p>
        <p style="margin: 0 0 24px; overflow-wrap: anywhere;">
          <a href="${inviteLink}" style="color: #115e59; text-decoration: underline; word-break: break-all;">${inviteLink}</a>
        </p>
        <p>This portal is used to:</p>
        <ul>
          <li>keep your contractor profile and company details up to date;</li>
          <li>upload and review required documents such as the Contractor Agreement, NDA and Assignment Schedule;</li>
          <li>create and submit monthly timesheets;</li>
          <li>receive self-billing invoices generated from approved timesheets;</li>
          <li>track payment status.</li>
        </ul>
        <p>Kind regards,<br />ANVEL Consulting</p>
      `,
    ),
    text: `Hello ${contractorName},

You have been invited to access the ANVEL Contractor Portal.

Set password and access portal:
${inviteLink}

If the link does not open, copy and paste the secure URL above into your browser.

This portal is used to:
- keep your contractor profile and company details up to date;
- upload and review required documents such as the Contractor Agreement, NDA and Assignment Schedule;
- create and submit monthly timesheets;
- receive self-billing invoices generated from approved timesheets;
- track payment status.

Kind regards,
ANVEL Consulting`,
  };
}

export function buildPasswordResetEmail(resetLink: string) {
  return {
    subject: "Reset your portal password",
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
  invoiceNumber: string,
  projectName: string | null = null,
) {
  return {
    subject: `Self-billing invoice generated - ${invoiceNumber} - ${monthLabel}`,
    html: wrapEmailHtml(
      `Self-billing invoice ${invoiceNumber}`,
      `
        <p>Hello ${contractorName},</p>
        <p>Please find attached your self-billing invoice for ${monthLabel}${projectName ? ` for ${projectName}` : ""}.</p>
        <p>Invoice number: <strong>${invoiceNumber}</strong></p>
        <p>This invoice has been generated based on the approved timesheet for the corresponding month.</p>
        <p>Kind regards,<br />ANVEL Consulting</p>
      `,
    ),
    text: `Hello ${contractorName},

Please find attached your self-billing invoice for ${monthLabel}${projectName ? ` for ${projectName}` : ""}.

Invoice number: ${invoiceNumber}

This invoice has been generated based on the approved timesheet for the corresponding month.

Kind regards,
ANVEL Consulting`,
  };
}

export function buildNotificationEmail(title: string, body: string) {
  const htmlBody = body.split("\n").join("<br />");

  return {
    subject: title,
    html: wrapEmailHtml(
      title,
      `<p>${htmlBody}</p><p>Kind regards,<br />ANVEL Consulting</p>`,
    ),
    text: `${body}

Kind regards,
ANVEL Consulting`,
  };
}

export function buildTimesheetSubmittedAdminEmail({
  contractorName,
  contractorEmail,
  monthLabel,
  projectName,
  totalHours,
  reviewLink,
}: {
  contractorName: string;
  contractorEmail: string;
  monthLabel: string;
  projectName: string | null;
  totalHours: string | null;
  reviewLink: string;
}) {
  const subject = `Timesheet submitted - ${contractorName} - ${monthLabel}`;
  const lines = [
    `Contractor: ${contractorName}`,
    `Email: ${contractorEmail}`,
    `Month: ${monthLabel}`,
    `Project: ${projectName ?? "Not set"}`,
    `Total hours: ${totalHours ?? "Not available"}`,
    `Review link: ${reviewLink}`,
  ];

  return {
    subject,
    html: wrapEmailHtml(
      subject,
      `
        <p>A contractor timesheet has been submitted for review.</p>
        <p><strong>Contractor:</strong> ${contractorName}<br />
        <strong>Email:</strong> ${contractorEmail}<br />
        <strong>Month:</strong> ${monthLabel}<br />
        <strong>Project:</strong> ${projectName ?? "Not set"}<br />
        <strong>Total hours:</strong> ${totalHours ?? "Not available"}</p>
        <p><a href="${reviewLink}">Open timesheet review</a></p>
      `,
    ),
    text: `A contractor timesheet has been submitted for review.

${lines.join("\n")}`,
  };
}

export function buildDocumentUploadedAdminEmail({
  contractorName,
  contractorEmail,
  documentName,
  uploadDate,
  reviewLink,
}: {
  contractorName: string;
  contractorEmail: string;
  documentName: string;
  uploadDate: string;
  reviewLink: string;
}) {
  const subject = `Document uploaded - ${contractorName} - ${documentName}`;

  return {
    subject,
    html: wrapEmailHtml(
      subject,
      `
        <p>A contractor document has been uploaded for review.</p>
        <p><strong>Contractor:</strong> ${contractorName}<br />
        <strong>Email:</strong> ${contractorEmail}<br />
        <strong>Document:</strong> ${documentName}<br />
        <strong>Upload date:</strong> ${uploadDate}</p>
        <p><a href="${reviewLink}">Open contractor documents</a></p>
      `,
    ),
    text: `A contractor document has been uploaded for review.

Contractor: ${contractorName}
Email: ${contractorEmail}
Document: ${documentName}
Upload date: ${uploadDate}
Review link: ${reviewLink}`,
  };
}

export function buildInvoiceUploadedAdminEmail({
  contractorName,
  contractorEmail,
  invoiceNumber,
  monthLabel,
  projectName,
  reviewLink,
}: {
  contractorName: string;
  contractorEmail: string;
  invoiceNumber: string;
  monthLabel: string;
  projectName: string | null;
  reviewLink: string;
}) {
  const subject = `Invoice uploaded - ${contractorName} - ${invoiceNumber} - ${monthLabel}`;

  return {
    subject,
    html: wrapEmailHtml(
      subject,
      `
        <p>A contractor invoice has been uploaded for review.</p>
        <p><strong>Contractor:</strong> ${contractorName}<br />
        <strong>Email:</strong> ${contractorEmail}<br />
        <strong>Invoice:</strong> ${invoiceNumber}<br />
        <strong>Month:</strong> ${monthLabel}<br />
        <strong>Project:</strong> ${projectName ?? "Not set"}</p>
        <p><a href="${reviewLink}">Open invoice review</a></p>
      `,
    ),
    text: `A contractor invoice has been uploaded for review.

Contractor: ${contractorName}
Email: ${contractorEmail}
Invoice: ${invoiceNumber}
Month: ${monthLabel}
Project: ${projectName ?? "Not set"}
Review link: ${reviewLink}`,
  };
}
