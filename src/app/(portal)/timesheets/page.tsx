import { StartTimesheetForm } from "@/components/timesheets/start-timesheet-form";
import { TimesheetList } from "@/components/timesheets/timesheet-list";
import { ContractorOperationalSelector } from "@/components/contractors/contractor-operational-selector";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { getAssignmentsForContractor } from "@/lib/projects/queries";
import { getContractorsForStaff } from "@/lib/contractors/queries";
import { getTimesheetsForContractor } from "@/lib/timesheets/queries";

export default async function TimesheetsPage() {
  const profile = await requireCurrentProfile();
  const isContractor = profile.role === "contractor";
  const contractor = isContractor
    ? await getContractorByProfileId(profile.id)
    : null;
  const timesheets =
    isContractor && contractor
      ? await getTimesheetsForContractor(contractor.id)
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
          Monthly timesheet overview with daily hours entries. Contractors can
          start draft timesheets, add worked days, and submit them for review.
          Admin users can review, approve, reject, or reopen submitted
          timesheets.
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
