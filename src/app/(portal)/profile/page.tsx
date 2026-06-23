import { ContractorProfilePanel } from "@/components/contractors/contractor-profile-panel";
import { ContractorSelfUpdateForm } from "@/components/contractors/contractor-self-update-form";
import { AssignmentList } from "@/components/projects/assignment-list";
import { requireRole } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { getAssignmentsForContractor } from "@/lib/projects/queries";

export default async function ProfilePage() {
  const profile = await requireRole(["contractor"]);
  const contractor = await getContractorByProfileId(profile.id);
  const assignments = contractor
    ? await getAssignmentsForContractor(contractor.id)
    : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          My Profile
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Contractor profile linked to your signed-in account. You can update
          non-bank legal and fiscal details with audit logging.
        </p>
      </section>

      {contractor ? (
        <>
          <ContractorProfilePanel contractor={contractor} showSensitiveDetails />
          <ContractorSelfUpdateForm contractor={contractor} />
          <AssignmentList
            assignments={assignments}
            context="contractor"
            showHourlyRate
            showSalesRate={false}
          />
        </>
      ) : (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            Contractor profile not found
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Your login is active, but no contractor record is linked to this
            profile yet. Ask an admin to create a contractor record for your
            account in the development Supabase project.
          </p>
        </section>
      )}
    </div>
  );
}
