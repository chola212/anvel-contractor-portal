import { notFound } from "next/navigation";

import { ContractorOperationalHeader } from "@/components/contractors/contractor-operational-header";
import { OperationalFilterForm } from "@/components/filters/operational-filter-form";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { requireRole } from "@/lib/auth/profile";
import { getContractorById } from "@/lib/contractors/queries";
import {
  parseMonthRangeFilters,
  parseStatusFilter,
  type SearchParamsInput,
} from "@/lib/filters/search-params";
import { getInvoicesForContractor } from "@/lib/invoices/queries";

const invoiceStatuses = [
  "pending_upload",
  "uploaded",
  "checked",
  "correction_required",
  "approved_for_payment",
  "paid",
  "on_hold",
] as const;

type ContractorInvoicesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsInput>;
};

export default async function ContractorInvoicesPage({
  params,
  searchParams,
}: ContractorInvoicesPageProps) {
  const profile = await requireRole(["admin", "operations"]);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = {
    ...parseMonthRangeFilters(resolvedSearchParams),
    status: parseStatusFilter(resolvedSearchParams, invoiceStatuses),
  };
  const contractor = await getContractorById(id);

  if (!contractor) {
    notFound();
  }

  const invoices = await getInvoicesForContractor(contractor.id, filters);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <ContractorOperationalHeader
        contractorId={contractor.id}
        contractorName={contractor.legal_name}
        sectionTitle="Invoices"
        selectorHref="/invoices"
        selectorLabel="Back to contractor selector"
      />
      <OperationalFilterForm
        fields={[
          { name: "month", label: "Invoice month", type: "month", value: filters.month },
          { name: "from", label: "From month", type: "month", value: filters.from },
          { name: "to", label: "To month", type: "month", value: filters.to },
          {
            name: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: invoiceStatuses.map((status) => ({
              value: status,
              label: status.replace(/_/g, " "),
            })),
          },
        ]}
      />
      <InvoiceList
        invoices={invoices}
        mode="staff"
        showFileName={profile.role === "admin"}
        canDownload={profile.role === "admin"}
        canReview={profile.role === "admin"}
      />
    </div>
  );
}
