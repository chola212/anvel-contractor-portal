type PortalEmailInput = {
  to: string;
  cc?: string[];
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
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new PortalEmailError(
      "NEXT_PUBLIC_SITE_URL must be configured in production.",
    );
  }

  return (origin ?? "http://localhost:3000").replace(/\/$/, "");
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
      cc: input.cc,
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

export function buildOutgoingInvoiceEmail({
  invoiceNumber,
  consultantName,
  monthLabel,
  projectName,
  poReference,
  grossAmount,
  dueDate,
}: {
  invoiceNumber: string;
  consultantName: string;
  monthLabel: string | null;
  projectName: string;
  poReference: string | null;
  grossAmount: string;
  dueDate: string;
}) {
  const periodSuffix = monthLabel ? ` - ${monthLabel}` : "";
  const subject = `Invoice ${invoiceNumber} - ${consultantName}${periodSuffix}`;
  const safeInvoiceNumber = escapeEmailHtml(invoiceNumber);
  const safeConsultantName = escapeEmailHtml(consultantName);
  const safeProjectName = escapeEmailHtml(projectName);
  const safeMonthLabel = monthLabel ? escapeEmailHtml(monthLabel) : null;
  const safePoReference = poReference ? escapeEmailHtml(poReference) : null;
  const safeGrossAmount = escapeEmailHtml(grossAmount);
  const safeDueDate = escapeEmailHtml(dueDate);
  const details = [
    `Project: ${safeProjectName}`,
    `Consultant: ${safeConsultantName}`,
    safeMonthLabel ? `Period: ${safeMonthLabel}` : null,
    safePoReference ? `PO reference: ${safePoReference}` : null,
    `Amount due: ${safeGrossAmount} EUR`,
    `Due date: ${safeDueDate}`,
  ].filter(Boolean);
  const servicePeriod = safeMonthLabel ? ` during ${safeMonthLabel}` : "";
  return {
    subject,
    html: wrapEmailHtml(
      `Invoice ${invoiceNumber}`,
      `<p>Hello,</p>
       <p>Please find attached invoice ${safeInvoiceNumber} for consulting services provided by ${safeConsultantName}${servicePeriod}.</p>
       <p>${details.join("<br />")}</p>
       <p>Kind regards,<br />ANVEL Consulting</p>`,
    ),
    text: `Hello,

Please find attached invoice ${invoiceNumber} for consulting services provided by ${consultantName}${servicePeriod}.

${details.join("\n")}

Kind regards,
ANVEL Consulting`,
  };
}

export function buildOutgoingInvoiceCancellationEmail({
  invoiceNumber,
  consultantName,
  monthLabel,
  projectName,
  reason,
}: {
  invoiceNumber: string;
  consultantName: string;
  monthLabel: string | null;
  projectName: string;
  reason: string;
}) {
  const safeInvoiceNumber = escapeEmailHtml(invoiceNumber);
  const safeConsultantName = escapeEmailHtml(consultantName);
  const safeMonthLabel = monthLabel ? escapeEmailHtml(monthLabel) : null;
  const safeProjectName = escapeEmailHtml(projectName);
  const safeReason = escapeEmailHtml(reason);
  const periodSuffix = monthLabel ? ` - ${monthLabel}` : "";

  return {
    subject: `Cancelled invoice ${invoiceNumber} - ${consultantName}${periodSuffix}`,
    html: wrapEmailHtml(
      `Invoice ${invoiceNumber} cancelled`,
      `<p>Hello,</p>
       <p>Invoice <strong>${safeInvoiceNumber}</strong> is no longer valid.</p>
       <p>Consultant: ${safeConsultantName}<br />Project: ${safeProjectName}${safeMonthLabel ? `<br />Period: ${safeMonthLabel}` : ""}</p>
       <p>Reason: ${safeReason}</p>
       <p>Please disregard the previous invoice and do not process it for payment. A replacement invoice will be issued if required.</p>
       <p>Kind regards,<br />ANVEL Consulting</p>`,
    ),
    text: `Hello,

Invoice ${invoiceNumber} is no longer valid.

Consultant: ${consultantName}
Project: ${projectName}
${monthLabel ? `Period: ${monthLabel}\n` : ""}Reason: ${reason}

Please disregard the previous invoice and do not process it for payment. A replacement invoice will be issued if required.

Kind regards,
ANVEL Consulting`,
  };
}

function wrapEmailHtml(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.5;">
      <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #0f766e; text-transform: uppercase;">
        ANVEL Contractor Portal
      </p>
      <h1 style="font-size: 22px; margin: 12px 0;">${escapeEmailHtml(title)}</h1>
      ${body}
      <p style="margin-top: 28px; font-size: 13px; color: #525252;">
        ERP Utilities Consulting Services Ltd.
      </p>
    </div>
  `;
}

function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeEmailLines(value: string) {
  return escapeEmailHtml(value).split("\n").join("<br />");
}

export function buildInviteEmail(contractorName: string, inviteLink: string) {
  const safeContractorName = escapeEmailHtml(contractorName);
  const safeInviteLink = escapeEmailHtml(inviteLink);
  return {
    subject: "Set your ANVEL Contractor Portal password",
    html: wrapEmailHtml(
      "Set your portal password",
      `
        <p>Hello ${safeContractorName},</p>
        <p>You have been invited to access the ANVEL Contractor Portal.</p>
        <p style="margin: 24px 0 16px;">
          <a href="${safeInviteLink}" style="display: inline-block; background: #115e59; color: #ffffff; padding: 11px 16px; border-radius: 6px; text-decoration: none; font-weight: 700;">
            Set password and access portal
          </a>
        </p>
        <p style="margin: 0 0 8px;">If the button does not work, copy and paste this secure link into your browser:</p>
        <p style="margin: 0 0 24px; overflow-wrap: anywhere;">
          <a href="${safeInviteLink}" style="color: #115e59; text-decoration: underline; word-break: break-all;">${safeInviteLink}</a>
        </p>
        <p>This portal is used to:</p>
        <ul>
          <li>keep your contractor profile and company details up to date;</li>
          <li>upload and review required documents such as the Contractor Agreement, Signed NDA and Other documents;</li>
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
- upload and review required documents such as the Contractor Agreement, Signed NDA and Other documents;
- create and submit monthly timesheets;
- receive self-billing invoices generated from approved timesheets;
- track payment status.

Kind regards,
ANVEL Consulting`,
  };
}

export function buildPasswordResetEmail(resetLink: string) {
  const safeResetLink = escapeEmailHtml(resetLink);
  return {
    subject: "Reset your portal password",
    html: wrapEmailHtml(
      "Reset your password",
      `
        <p>Use the secure link below to choose a new password for your ANVEL Contractor Portal account.</p>
        <p style="margin: 24px 0;">
          <a href="${safeResetLink}" style="background: #115e59; color: #ffffff; padding: 11px 16px; border-radius: 6px; text-decoration: none; font-weight: 700;">
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
  const safeContractorName = escapeEmailHtml(contractorName);
  const safeMonthLabel = escapeEmailHtml(monthLabel);
  const safeInvoiceNumber = escapeEmailHtml(invoiceNumber);
  const safeProjectName = projectName ? escapeEmailHtml(projectName) : null;
  return {
    subject: `Self-billing invoice generated - ${invoiceNumber} - ${monthLabel}`,
    html: wrapEmailHtml(
      `Self-billing invoice ${invoiceNumber}`,
      `
        <p>Hello ${safeContractorName},</p>
        <p>Please find attached your self-billing invoice for ${safeMonthLabel}${safeProjectName ? ` for ${safeProjectName}` : ""}.</p>
        <p>Invoice number: <strong>${safeInvoiceNumber}</strong></p>
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

export function buildSelfBillingCancellationEmail({
  contractorName,
  invoiceNumber,
  monthLabel,
  reason,
}: {
  contractorName: string;
  invoiceNumber: string;
  monthLabel: string;
  reason: string;
}) {
  const safeContractorName = escapeEmailHtml(contractorName);
  const safeInvoiceNumber = escapeEmailHtml(invoiceNumber);
  const safeMonthLabel = escapeEmailHtml(monthLabel);
  const safeReason = escapeEmailHtml(reason);

  return {
    subject: `Self-billing invoice cancelled - ${invoiceNumber} - ${monthLabel}`,
    html: wrapEmailHtml(
      `Self-billing invoice ${invoiceNumber} cancelled`,
      `<p>Hello ${safeContractorName},</p>
       <p>Your self-billing invoice <strong>${safeInvoiceNumber}</strong> is no longer valid because the source timesheet was reopened for correction.</p>
       <p>Period: ${safeMonthLabel}</p>
       <p>Reason: ${safeReason}</p>
       <p>Please update and resubmit the timesheet in the portal. A replacement invoice will be generated after the corrected timesheet is approved.</p>
       <p>Kind regards,<br />ANVEL Consulting</p>`,
    ),
    text: `Hello ${contractorName},

Your self-billing invoice ${invoiceNumber} is no longer valid because the source timesheet was reopened for correction.

Reason: ${reason}

Please update and resubmit the timesheet in the portal. A replacement invoice will be generated after the corrected timesheet is approved.

Kind regards,
ANVEL Consulting`,
  };
}

export function buildNotificationEmail(title: string, body: string) {
  const htmlBody = escapeEmailLines(body);

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
  const safeContractorName = escapeEmailHtml(contractorName);
  const safeContractorEmail = escapeEmailHtml(contractorEmail);
  const safeMonthLabel = escapeEmailHtml(monthLabel);
  const safeProjectName = escapeEmailHtml(projectName ?? "Not set");
  const safeTotalHours = escapeEmailHtml(totalHours ?? "Not available");
  const safeReviewLink = escapeEmailHtml(reviewLink);
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
        <p><strong>Contractor:</strong> ${safeContractorName}<br />
        <strong>Email:</strong> ${safeContractorEmail}<br />
        <strong>Month:</strong> ${safeMonthLabel}<br />
        <strong>Project:</strong> ${safeProjectName}<br />
        <strong>Total hours:</strong> ${safeTotalHours}</p>
        <p><a href="${safeReviewLink}">Open timesheet review</a></p>
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
  const safeContractorName = escapeEmailHtml(contractorName);
  const safeContractorEmail = escapeEmailHtml(contractorEmail);
  const safeDocumentName = escapeEmailHtml(documentName);
  const safeUploadDate = escapeEmailHtml(uploadDate);
  const safeReviewLink = escapeEmailHtml(reviewLink);

  return {
    subject,
    html: wrapEmailHtml(
      subject,
      `
        <p>A contractor document has been uploaded for review.</p>
        <p><strong>Contractor:</strong> ${safeContractorName}<br />
        <strong>Email:</strong> ${safeContractorEmail}<br />
        <strong>Document:</strong> ${safeDocumentName}<br />
        <strong>Upload date:</strong> ${safeUploadDate}</p>
        <p><a href="${safeReviewLink}">Open contractor documents</a></p>
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
  const safeContractorName = escapeEmailHtml(contractorName);
  const safeContractorEmail = escapeEmailHtml(contractorEmail);
  const safeInvoiceNumber = escapeEmailHtml(invoiceNumber);
  const safeMonthLabel = escapeEmailHtml(monthLabel);
  const safeProjectName = escapeEmailHtml(projectName ?? "Not set");
  const safeReviewLink = escapeEmailHtml(reviewLink);

  return {
    subject,
    html: wrapEmailHtml(
      subject,
      `
        <p>A contractor invoice has been uploaded for review.</p>
        <p><strong>Contractor:</strong> ${safeContractorName}<br />
        <strong>Email:</strong> ${safeContractorEmail}<br />
        <strong>Invoice:</strong> ${safeInvoiceNumber}<br />
        <strong>Month:</strong> ${safeMonthLabel}<br />
        <strong>Project:</strong> ${safeProjectName}</p>
        <p><a href="${safeReviewLink}">Open invoice review</a></p>
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
