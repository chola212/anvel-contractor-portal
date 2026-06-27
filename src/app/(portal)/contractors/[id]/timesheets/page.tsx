import { notFound } from "next/navigation";

import { ContractorOperationalHeader } from "@/components/contractors/contractor-operational-header";
import { OperationalFilterForm } from "@/components/filters/operational-filter-form";
import { TimesheetList } from "@/components/timesheets/timesheet-list";
import { requireRole } from "@/lib/auth/profile";
import { getContractorById } from "@/lib/contractors/queries";
import {
  parseMonthRangeFilters,
  parseStatusFilter,
  type SearchParamsInput,
} from "@/lib/filters/search-params";
import { getTimesheetsForContractor } from "@/lib/timesheets/queries";

const timesheetStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "reopened",
] as const;

type ContractorTimesheetsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsInput>;
};

export default async function ContractorTimesheetsPage({
  params,
  searchParams,
}: ContractorTimesheetsPageProps) {
  await requireRole(["admin", "operations"]);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = {
    month: parseMonthRangeFilters(resolvedSearchParams).month,
    status: parseStatusFilter(resolvedSearchParams, timesheetStatuses),
  };
  const contractor = await getContractorById(id);

  if (!contractor) {
    notFound();
  }

  const timesheets = await getTimesheetsForContractor(contractor.id, filters);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <ContractorOperationalHeader
        contractorId={contractor.id}
        contractorName={contractor.legal_name}
        sectionTitle="Timesheets"
        selectorHref="/timesheets"
        selectorLabel="Back to contractor selector"
      />
      <OperationalFilterForm
        fields={[
          { name: "month", label: "Timesheet month", type: "month", value: filters.month },
          {
            name: "status",
            label: "Status",
            type: "select",
            value: filters.status,
            options: timesheetStatuses.map((status) => ({
              value: status,
              label: status.replace(/_/g, " "),
            })),
          },
        ]}
      />
      <TimesheetList timesheets={timesheets} mode="staff" />
    </div>
  );
}
