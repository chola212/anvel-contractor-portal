import { ContractorProfilePanel } from "@/components/contractors/contractor-profile-panel";
import { requireRole } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";

export default async function ProfilePage() {
  const profile = await requireRole(["contractor"]);
  const contractor = await getContractorByProfileId(profile.id);

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
          Read-only contractor profile linked to your signed-in account. Profile
          updates will be added later with validation and audit logging.
        </p>
      </section>

      {contractor ? (
        <ContractorProfilePanel contractor={contractor} showSensitiveDetails />
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
