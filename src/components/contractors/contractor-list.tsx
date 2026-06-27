import Link from "next/link";

import { StatusBadge } from "@/components/contractors/status-badge";
import {
  formatOptional,
  supplierTypeLabels,
  vatTreatmentLabels,
} from "@/lib/contractors/format";
import type { ContractorRecord } from "@/lib/contractors/types";

type ContractorListProps = {
  contractors: ContractorRecord[];
};

export function ContractorList({ contractors }: ContractorListProps) {
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
          Contractor records
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Open a profile to manage contractor details, access and assignments.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Contractor
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Supplier type
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                VAT treatment
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Profile
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {contractors.map((contractor) => (
              <tr key={contractor.id}>
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">
                    {contractor.legal_name}
                  </p>
                  <p className="mt-1 text-neutral-600">{contractor.email}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatOptional(contractor.country)}
                  </p>
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {contractor.supplier_type
                    ? supplierTypeLabels[contractor.supplier_type]
                    : "Not provided"}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {contractor.vat_treatment
                    ? vatTreatmentLabels[contractor.vat_treatment]
                    : "Not provided"}
                </td>
                <td className="px-5 py-4 align-top">
                  <StatusBadge status={contractor.status} />
                </td>
                <td className="px-5 py-4 align-top">
                  <Link
                    href={`/contractors/${contractor.id}`}
                    className="font-medium text-teal-800 hover:text-teal-950"
                  >
                    View profile
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
