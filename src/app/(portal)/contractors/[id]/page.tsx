import Link from "next/link";
import { notFound } from "next/navigation";

import { ContractorAuditHistory } from "@/components/contractors/contractor-audit-history";
import { ContractorBankDetailsForm } from "@/components/contractors/contractor-bank-details-form";
import { ContractorOffboardForm } from "@/components/contractors/contractor-offboard-form";
import { ContractorProfilePanel } from "@/components/contractors/contractor-profile-panel";
import { ContractorResendInviteForm } from "@/components/contractors/contractor-resend-invite-form";
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
          className="inline-flex min-h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 transition-colors hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
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
        <ContractorResendInviteForm contractor={contractor} />
      ) : null}
      {profile.role === "admin" ? (
        <ContractorUpdateForm contractor={contractor} />
      ) : null}
      {profile.role === "admin" ? (
        <ContractorBankDetailsForm contractor={contractor} />
      ) : null}
      {profile.role === "admin" ? (
        <ContractorOffboardForm contractor={contractor} />
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
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Operational sections
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {["documents", "timesheets", "invoices", "payments"].map((section) => (
            <Link
              key={section}
              href={`/contractors/${contractor.id}/${section}`}
              className="rounded-md border border-neutral-200 px-4 py-3 text-sm font-medium capitalize text-teal-800 hover:bg-neutral-50 hover:text-teal-950"
            >
              {section}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
