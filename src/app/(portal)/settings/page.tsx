import { requireRole } from "@/lib/auth/profile";
import { getSupabaseConfig } from "@/lib/supabase/env";

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
    note: "Contractor routes rely on Supabase RLS and signed storage links.",
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
    note: "Development and staging must use fake data.",
  },
  {
    label: "Bank payments",
    value: "Out of scope",
    note: "The portal records manual payment status only.",
  },
  {
    label: "Self-billing",
    value: "Out of scope",
    note: "Payment statements are internal drafts, not legal invoices.",
  },
  {
    label: "Sensitive files",
    value: "Private storage",
    note: "Documents and invoices use private Supabase buckets.",
  },
];

const readinessChecks: StatusItem[] = [
  {
    label: "Environment variables",
    value: "Required",
    note: "Vercel must define Supabase URL and publishable key per environment.",
  },
  {
    label: "Database migrations",
    value: "Manual verification",
    note: "Run the checklist in supabase/README.md after applying SQL.",
  },
  {
    label: "Audit history",
    value: "Enabled for key edits",
    note: "Contractor profile and bank detail edits write audit log entries.",
  },
  {
    label: "Deployment checklist",
    value: "Required before real data",
    note: "Use 05_DEPLOYMENT_READINESS_CHECKLIST.md before production use.",
  },
];

function getProjectReference(supabaseUrl: string) {
  try {
    const host = new URL(supabaseUrl).hostname;
    return host.endsWith(".supabase.co")
      ? host.replace(".supabase.co", "")
      : host;
  } catch {
    return "Invalid Supabase URL";
  }
}

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

  const config = getSupabaseConfig();
  const projectReference = getProjectReference(config.supabaseUrl);
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
          Read-only operational configuration overview for the private portal.
          Editable security, billing and production controls remain outside the
          application until separately approved.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Supabase project</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">
            {projectReference}
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
        items={readinessChecks}
        title="Readiness checks"
      />
    </div>
  );
}
