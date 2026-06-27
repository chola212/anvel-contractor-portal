import { buildNotificationEmail, sendPortalEmail } from "./portal-email";

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
