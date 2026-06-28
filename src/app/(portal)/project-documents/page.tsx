import Link from "next/link";

import { ProjectDocumentList } from "@/components/project-documents/project-document-list";
import { ProjectDocumentUploadForm } from "@/components/project-documents/project-document-upload-form";
import { requireRole } from "@/lib/auth/profile";
import { getContractorsForStaff } from "@/lib/contractors/queries";
import { getProjectDocuments } from "@/lib/project-documents/queries";
import type { ProjectDocumentStatus } from "@/lib/project-documents/types";
import { getProjectsForStaff } from "@/lib/projects/queries";

type ProjectDocumentsPageProps = {
  searchParams: Promise<{
    projectId?: string;
    contractorId?: string;
    status?: string;
  }>;
};

function normaliseStatus(value: string | undefined) {
  return value === "active" || value === "archived"
    ? (value as ProjectDocumentStatus)
    : undefined;
}

function optionalFilter(value: string | undefined) {
  return value && value.trim().length > 0 ? value : undefined;
}

export default async function ProjectDocumentsPage({
  searchParams,
}: ProjectDocumentsPageProps) {
  await requireRole(["admin"]);
  const resolvedSearchParams = await searchParams;
  const filters = {
    projectId: optionalFilter(resolvedSearchParams.projectId),
    contractorId: optionalFilter(resolvedSearchParams.contractorId),
    status: normaliseStatus(resolvedSearchParams.status),
  };
  const [projects, contractors, documents] = await Promise.all([
    getProjectsForStaff(),
    getContractorsForStaff(),
    getProjectDocuments(filters),
  ]);
  const contractorOptions = contractors.map((contractor) => ({
    id: contractor.id,
    legal_name: contractor.legal_name,
    email: contractor.email,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Project Documents
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Internal client/vendor documents linked to projects.
        </p>
      </section>

      <ProjectDocumentUploadForm
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          client_label: project.client_label,
        }))}
        contractors={contractorOptions}
        defaultProjectId={filters.projectId}
      />

      <form
        method="get"
        className="rounded-md border border-neutral-200 bg-white p-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Project
            <select
              name="projectId"
              defaultValue={filters.projectId ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                  {project.client_label ? ` - ${project.client_label}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Contractor
            <select
              name="contractorId"
              defaultValue={filters.contractorId ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value="">All consultants</option>
              {contractorOptions.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.legal_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Status
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
          >
            Apply filters
          </button>
          <Link
            href="/project-documents"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Clear
          </Link>
        </div>
      </form>

      <ProjectDocumentList
        documents={documents}
        contractors={contractorOptions}
      />
    </div>
  );
}
