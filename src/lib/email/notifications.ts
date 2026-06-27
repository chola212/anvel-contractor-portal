import {
  buildNotificationEmail,
  portalAdminEmail,
  sendPortalEmail,
} from "./portal-email";

export async function sendContractorNotification({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  try {
    const email = buildNotificationEmail(subject, body);
    const result = await sendPortalEmail({
      to,
      ...email,
    });

    return result.sent;
  } catch (error) {
    console.error("Contractor notification email failed", error);
    return false;
  }
}

export async function sendAdminNotification(email: {
  subject: string;
  html: string;
  text: string;
}) {
  try {
    await sendPortalEmail({
      to: portalAdminEmail,
      ...email,
    });

    return true;
  } catch (error) {
    console.error("Admin notification email failed", error);
    return false;
  }
}
