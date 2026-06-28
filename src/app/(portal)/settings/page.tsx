import { requireRole } from "@/lib/auth/profile";
import Link from "next/link";

type StatusItem = {
  label: string;
  value: string;
  note: string;
};

const accessControls: StatusItem[] = [
  {
    label: "Authentication",
    value: "Invite-only",
    note: "Public registration is not available in the portal.",
  },
  {
    label: "Contractor access",
    value: "Own records only",
    note: "Contractors can access only their own operational records.",
  },
  {
    label: "Operations access",
    value: "Limited metadata",
    note: "Operations can review operational metadata without sensitive file downloads.",
  },
  {
    label: "Admin access",
    value: "Full operational management",
    note: "Admin-only changes are used for contractor setup, review, payments and bank details.",
  },
];

const productionBoundaries: StatusItem[] = [
  {
    label: "Real contractor data",
    value: "Production only",
    note: "Non-production environments must not contain real contractor data.",
  },
  {
    label: "Bank payments",
    value: "Out of scope",
    note: "The portal records manual payment status only.",
  },
  {
    label: "Invoice handling",
    value: "Manual review",
    note: "Generated statements and uploaded invoices require human review.",
  },
  {
    label: "Sensitive files",
    value: "Restricted access",
    note: "Documents and invoices are available only to authorised users.",
  },
];

const operationalChecks: StatusItem[] = [
  {
    label: "Environment variables",
    value: "Required",
    note: "Hosting configuration must define the required portal environment variables.",
  },
  {
    label: "Database migrations",
    value: "Manual verification",
    note: "Apply and verify database changes before production use.",
  },
  {
    label: "Audit history",
    value: "Enabled for key edits",
    note: "Contractor profile and bank detail edits write audit log entries.",
  },
  {
    label: "Deployment checklist",
    value: "Required before real data",
    note: "Complete the production checklist before handling real contractor data.",
  },
];

function SettingsSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: StatusItem[];
}) {
  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-5">
        <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          {description}
        </p>
      </div>
      <div className="divide-y divide-neutral-200">
        {items.map((item) => (
          <div
            className="grid gap-2 px-5 py-4 md:grid-cols-[220px_220px_minmax(0,1fr)]"
            key={item.label}
          >
            <p className="text-sm font-medium uppercase text-neutral-500">
              {item.label}
            </p>
            <p className="font-semibold text-neutral-950">{item.value}</p>
            <p className="text-sm leading-6 text-neutral-600">{item.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  await requireRole(["admin"]);

  const vercelEnvironment = process.env.VERCEL_ENV ?? "local";
  const nodeEnvironment = process.env.NODE_ENV ?? "unknown";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Settings
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Operational configuration overview and admin-managed outgoing invoice
          sender settings for the private portal.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Data environment</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">
            Configured
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">
            Vercel environment
          </p>
          <p className="mt-2 text-lg font-semibold capitalize text-neutral-950">
            {vercelEnvironment}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Runtime mode</p>
          <p className="mt-2 text-lg font-semibold capitalize text-neutral-950">
            {nodeEnvironment}
          </p>
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">Invoice sender settings</h2>
        <p className="mt-2 text-sm text-neutral-600">Manage company, VAT and bank details used for outgoing invoice snapshots.</p>
        <Link href="/settings/company" className="mt-4 inline-flex rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white">
          Open company invoice settings
        </Link>
      </section>

      <SettingsSection
        description="Current role and route boundaries that must remain in place as the portal grows."
        items={accessControls}
        title="Access model"
      />

      <SettingsSection
        description="Operational limits that protect the product scope and contractor data."
        items={productionBoundaries}
        title="Production boundaries"
      />

      <SettingsSection
        description="Checks that must stay true before the portal is used with real contractor data."
        items={operationalChecks}
        title="Operational checks"
      />
    </div>
  );
}
