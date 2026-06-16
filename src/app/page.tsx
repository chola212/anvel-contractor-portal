import { OperationalSection } from "@/components/dashboard/operational-section";
const operationalSections = [
  {
    title: "Contractor operations",
    description:
      "Core areas for managing accepted contractors after engagement approval.",
    items: ["Contractor documents", "Project assignments", "Profile status"],
  },
  {
    title: "Timesheet workflow",
    description:
      "Monthly hours submission and review without detailed task tracking.",
    items: ["Submit monthly hours", "Pending timesheets", "Correction required"],
  },
  {
    title: "Invoice and payment workflow",
    description:
      "Expected payment statements, official invoices, and manual payment status.",
    items: ["Invoices awaiting review", "Payment status", "Accountant export"],
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ERP Utilities Consulting Services Ltd.
        </p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
              Contractor operations workspace
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Base application shell for the private ANVEL contractor portal.
              Business data, authentication, and database-backed workflows are
              intentionally left for later approved phases.
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
            Supabase client configured locally
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Current phase</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">
            Base application shell
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Data source</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">
            Not connected to tables yet
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Access model</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">
            Roles planned, not enforced yet
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {operationalSections.map((section) => (
          <OperationalSection key={section.title} {...section} />
        ))}
      </div>
    </div>
  );
}
