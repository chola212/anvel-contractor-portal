import Link from "next/link";

import { StatusBadge } from "@/components/contractors/status-badge";
import type { ContractorRecord } from "@/lib/contractors/types";

type ContractorOperationalSelectorProps = {
  contractors: ContractorRecord[];
  section: "documents" | "timesheets" | "invoices" | "payments";
};

const sectionLabels = {
  documents: "documents",
  timesheets: "timesheets",
  invoices: "invoices",
  payments: "payments",
};

export function ContractorOperationalSelector({
  contractors,
  section,
}: ContractorOperationalSelectorProps) {
  if (contractors.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No contractors found
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Contractor records will appear here after onboarding.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Select contractor
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Choose a contractor to manage their {sectionLabels[section]}.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Contractor</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {contractors.map((contractor) => (
              <tr key={contractor.id}>
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">
                    {contractor.legal_name}
                  </p>
                  <p className="mt-1 text-neutral-600">{contractor.email}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <StatusBadge status={contractor.status} />
                </td>
                <td className="px-5 py-4 align-top">
                  <Link
                    className="font-medium text-teal-800 hover:text-teal-950"
                    href={`/contractors/${contractor.id}?section=${section}`}
                  >
                    Open {sectionLabels[section]}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
