import Link from "next/link";

import { OperationalSection } from "@/components/dashboard/operational-section";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getDashboardSections } from "@/lib/dashboard/queries";

const roleLabels = {
  admin: "Admin",
  operations: "Operations",
  contractor: "Contractor",
};

export default async function Home() {
  const profile = await requireCurrentProfile();

  if (profile.role === "contractor") {
    const contractorItems = [
      {
        title: "My profile",
        description: "Profile details.",
        href: "/profile",
      },
      {
        title: "My assignments",
        description: "Assigned projects.",
        href: "/profile",
      },
      {
        title: "My documents",
        description: "Documents.",
        href: "/documents",
      },
      {
        title: "My timesheets",
        description: "Monthly hours.",
        href: "/timesheets",
      },
      {
        title: "My self-billing invoices",
        description: "Self-billing invoices.",
        href: "/invoices",
      },
      {
        title: "My payment status",
        description: "Payment status.",
        href: "/payments",
      },
    ];

    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="border-b border-neutral-200 pb-5">
          <p className="text-sm font-medium uppercase text-teal-700">
            ERP Utilities Consulting Services Ltd.
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            My contractor workspace
          </h1>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contractorItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-md border border-neutral-200 bg-white p-5 transition-colors hover:border-teal-700"
            >
              <h2 className="text-base font-semibold text-neutral-950">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {item.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    );
  }

  const operationalSections = await getDashboardSections();

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
          </div>
          <div className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
            Signed in as {roleLabels[profile.role]}
          </div>
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
