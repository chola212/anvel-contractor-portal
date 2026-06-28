import Link from "next/link";

import { CompanyInvoiceSettingsForm } from "@/components/settings/company-invoice-settings-form";
import { requireRole } from "@/lib/auth/profile";
import { getCompanyInvoiceSettings } from "@/lib/outgoing-invoices/queries";

export default async function CompanySettingsPage() {
  await requireRole(["admin"]);
  const settings = await getCompanyInvoiceSettings();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <Link href="/settings" className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
          Back to settings
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-neutral-950">
          Company invoice settings
        </h1>
        <p className="mt-2 text-neutral-600">Company, VAT and bank details.</p>
      </section>
      <CompanyInvoiceSettingsForm settings={settings} />
    </div>
  );
}
