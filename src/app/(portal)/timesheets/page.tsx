import { StartTimesheetForm } from "@/components/timesheets/start-timesheet-form";
import { TimesheetList } from "@/components/timesheets/timesheet-list";
import { ContractorOperationalSelector } from "@/components/contractors/contractor-operational-selector";
import { OperationalFilterForm } from "@/components/filters/operational-filter-form";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { getAssignmentsForContractor } from "@/lib/projects/queries";
import { getContractorsForStaff } from "@/lib/contractors/queries";
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

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const profile = await requireCurrentProfile();
  const resolvedSearchParams = await searchParams;
  const filters = {
    month: parseMonthRangeFilters(resolvedSearchParams).month,
    status: parseStatusFilter(resolvedSearchParams, timesheetStatuses),
  };
  const isContractor = profile.role === "contractor";
  const contractor = isContractor
    ? await getContractorByProfileId(profile.id)
    : null;
  const timesheets =
    isContractor && contractor
      ? await getTimesheetsForContractor(contractor.id, filters)
      : [];
  const assignments =
    isContractor && contractor
      ? (await getAssignmentsForContractor(contractor.id)).filter((assignment) =>
          ["planned", "active"].includes(assignment.status),
        )
      : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Timesheets
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Submit and review monthly timesheets.
        </p>
      </section>

      {isContractor && !contractor ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            Contractor profile not found
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Your login is active, but no contractor profile is linked to this
            account yet. Timesheets are unavailable until a contractor record
            exists.
          </p>
        </section>
      ) : (
        isContractor ? (
        <>
          <StartTimesheetForm assignments={assignments} />
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
          <TimesheetList timesheets={timesheets} mode="contractor" />
        </>
        ) : (
          <ContractorOperationalSelector
            contractors={await getContractorsForStaff()}
            section="timesheets"
          />
        )
      )}
    </div>
  );
}
