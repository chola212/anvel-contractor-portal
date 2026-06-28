import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailField } from "@/components/contractors/detail-field";
import { AssignmentCreateForm } from "@/components/projects/assignment-create-form";
import { AssignmentList } from "@/components/projects/assignment-list";
import { ProjectRemoveForm } from "@/components/projects/project-remove-form";
import { ProjectBillingDetailsForm } from "@/components/projects/project-billing-details-form";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectUpdateForm } from "@/components/projects/project-update-form";
import { requireRole } from "@/lib/auth/profile";
import { getContractorsForStaff } from "@/lib/contractors/queries";
import { getProjectDocuments } from "@/lib/project-documents/queries";
import { formatDate } from "@/lib/projects/format";
import { getProjectBillingDetails } from "@/lib/outgoing-invoices/queries";
import {
  getAssignmentsForProject,
  getProjectById,
} from "@/lib/projects/queries";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const profile = await requireRole(["admin", "operations"]);
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const assignments = await getAssignmentsForProject(project.id);
  const contractors =
    profile.role === "admin" ? await getContractorsForStaff() : [];
  const billingDetails =
    profile.role === "admin"
      ? await getProjectBillingDetails(project.id)
      : null;
  const projectDocuments =
    profile.role === "admin"
      ? await getProjectDocuments({ projectId: project.id })
      : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <Link
          href="/projects"
          className="inline-flex min-h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 transition-colors hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        >
          Back to projects
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
              {project.name}
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Project detail and assigned contractor overview. Admins can manage
              project details, assignments and rates.
            </p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Project details
        </h2>
        <dl className="mt-2 grid gap-x-6 md:grid-cols-2">
          <DetailField
            label="Client label"
            value={project.client_label ?? "Not provided"}
          />
          <DetailField label="Country" value={project.country ?? "Not set"} />
          <DetailField label="Start date" value={formatDate(project.start_date)} />
          <DetailField label="End date" value={formatDate(project.end_date)} />
          <DetailField label="Currency" value={project.currency} />
          <DetailField
            label="Admin notes"
            value={
              profile.role === "admin"
                ? project.admin_notes ?? "Not provided"
                : "Hidden for this role"
            }
          />
        </dl>
      </section>

      {profile.role === "admin" ? <ProjectUpdateForm project={project} /> : null}
      {profile.role === "admin" ? (
        <ProjectBillingDetailsForm
          projectId={project.id}
          details={billingDetails}
        />
      ) : null}
      {profile.role === "admin" ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Project Documents
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {projectDocuments.length === 0
                  ? "No project documents uploaded yet."
                  : `${projectDocuments.length} project document${
                      projectDocuments.length === 1 ? "" : "s"
                    } linked to this project.`}
              </p>
            </div>
            <Link
              href={`/project-documents?projectId=${project.id}`}
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 transition-colors hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              Open project documents
            </Link>
          </div>
        </section>
      ) : null}
      {profile.role === "admin" ? <ProjectRemoveForm project={project} /> : null}

      {profile.role === "admin" ? (
        <AssignmentCreateForm
          projectId={project.id}
          contractors={contractors.map((contractor) => ({
            id: contractor.id,
            legal_name: contractor.legal_name,
            email: contractor.email,
            status: contractor.status,
          }))}
        />
      ) : null}

      <AssignmentList
        assignments={assignments}
        context="project"
        showHourlyRate={profile.role === "admin"}
        showSalesRate={profile.role === "admin"}
        showAssignmentControls={profile.role === "admin"}
      />
    </div>
  );
}
