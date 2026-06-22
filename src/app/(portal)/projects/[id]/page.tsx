import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailField } from "@/components/contractors/detail-field";
import { AssignmentCreateForm } from "@/components/projects/assignment-create-form";
import { AssignmentList } from "@/components/projects/assignment-list";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { requireRole } from "@/lib/auth/profile";
import { getContractorsForStaff } from "@/lib/contractors/queries";
import { formatDate } from "@/lib/projects/format";
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <Link
          href="/projects"
          className="text-sm font-medium text-teal-800 hover:text-teal-950"
        >
          Back to projects
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
              {project.name}
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Project detail and assigned contractor overview. Assignment changes
              are intentionally not included in this phase.
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
      />
    </div>
  );
}
