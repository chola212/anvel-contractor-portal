import { ContractorCreateForm } from "@/components/contractors/contractor-create-form";
import { ContractorList } from "@/components/contractors/contractor-list";
import { requireRole } from "@/lib/auth/profile";
import { getContractorsForStaff } from "@/lib/contractors/queries";

export default async function ContractorsPage() {
  const profile = await requireRole(["admin", "operations"]);
  const contractors = await getContractorsForStaff();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Contractors
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Manage contractor profiles.
        </p>
      </section>

      {profile.role === "admin" ? <ContractorCreateForm /> : null}

      <ContractorList contractors={contractors} />
    </div>
  );
}
