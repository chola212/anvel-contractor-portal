import { notFound } from "next/navigation";

import { ContractorOperationalHeader } from "@/components/contractors/contractor-operational-header";
import { OperationalFilterForm } from "@/components/filters/operational-filter-form";
import { PaymentList } from "@/components/payments/payment-list";
import { requireRole } from "@/lib/auth/profile";
import { getContractorById } from "@/lib/contractors/queries";
import {
  parseMonthRangeFilters,
  parseStatusFilter,
  type SearchParamsInput,
} from "@/lib/filters/search-params";
import { getPaymentRowsForContractor } from "@/lib/payments/queries";

const paymentStatuses = ["pending", "approved", "paid", "on_hold"] as const;

type ContractorPaymentsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsInput>;
};

export default async function ContractorPaymentsPage({
  params,
  searchParams,
}: ContractorPaymentsPageProps) {
  const profile = await requireRole(["admin", "operations"]);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = {
    ...parseMonthRangeFilters(resolvedSearchParams),
    status: parseStatusFilter(resolvedSearchParams, paymentStatuses),
  };
  const contractor = await getContractorById(id);

  if (!contractor) {
    notFound();
  }

  const rows = await getPaymentRowsForContractor(contractor.id, filters);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <ContractorOperationalHeader
        contractorId={contractor.id}
        contractorName={contractor.legal_name}
        sectionTitle="Payments"
        selectorHref="/payments"
        selectorLabel="Back to contractor selector"
      />
      <OperationalFilterForm
        fields={[
          { name: "month", label: "Invoice month", type: "month", value: filters.month },
          { name: "from", label: "From month", type: "month", value: filters.from },
          { name: "to", label: "To month", type: "month", value: filters.to },
          {
            name: "status",
            label: "Payment status",
            type: "select",
            value: filters.status,
            options: paymentStatuses.map((status) => ({
              value: status,
              label: status.replace(/_/g, " "),
            })),
          },
        ]}
      />
      <PaymentList
        rows={rows}
        mode="staff"
        canManage={profile.role === "admin"}
      />
    </div>
  );
}
