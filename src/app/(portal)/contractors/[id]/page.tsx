import Link from "next/link";
import { notFound } from "next/navigation";

import { ContractorAuditHistory } from "@/components/contractors/contractor-audit-history";
import { ContractorBankDetailsForm } from "@/components/contractors/contractor-bank-details-form";
import { ContractorProfilePanel } from "@/components/contractors/contractor-profile-panel";
import { ContractorUpdateForm } from "@/components/contractors/contractor-update-form";
import { AssignmentList } from "@/components/projects/assignment-list";
import { requireRole } from "@/lib/auth/profile";
import { getContractorAuditLogs } from "@/lib/audit/queries";
import { getContractorById } from "@/lib/contractors/queries";
import { getAssignmentsForContractor } from "@/lib/projects/queries";

type ContractorDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ContractorDetailPage({
  params,
}: ContractorDetailPageProps) {
  const profile = await requireRole(["admin", "operations"]);
  const { id } = await params;
  const contractor = await getContractorById(id);

  if (!contractor) {
    notFound();
  }

  const assignments = await getAssignmentsForContractor(contractor.id);
  const auditLogs =
    profile.role === "admin" ? await getContractorAuditLogs(contractor.id) : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <Link
          href="/contractors"
          className="text-sm font-medium text-teal-800 hover:text-teal-950"
        >
          Back to contractors
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          {contractor.legal_name}
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Contractor profile and assignment overview. Admins can edit profile
          and bank details through separate audited workflows; operations users
          see limited details.
        </p>
      </section>

      <ContractorProfilePanel
        contractor={contractor}
        showSensitiveDetails={profile.role === "admin"}
      />
      {profile.role === "admin" ? (
        <ContractorUpdateForm contractor={contractor} />
      ) : null}
      {profile.role === "admin" ? (
        <ContractorBankDetailsForm contractor={contractor} />
      ) : null}
      {profile.role === "admin" ? (
        <ContractorAuditHistory logs={auditLogs} />
      ) : null}
      <AssignmentList
        assignments={assignments}
        context="contractor"
        showHourlyRate={profile.role === "admin"}
        showSalesRate={profile.role === "admin"}
        showAssignmentControls={profile.role === "admin"}
      />
    </div>
  );
}
