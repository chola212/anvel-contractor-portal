"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  archiveProjectDocumentAction,
  deleteProjectDocumentAction,
  unarchiveProjectDocumentAction,
  updateProjectDocumentMetadataAction,
  type ProjectDocumentActionState,
} from "@/app/(portal)/project-documents/actions";
import { formatDate, formatFileSize } from "@/lib/documents/format";
import {
  projectDocumentTypes,
  type ProjectDocument,
} from "@/lib/project-documents/types";

type ContractorOption = {
  id: string;
  legal_name: string;
  email: string;
};

type ProjectDocumentListProps = {
  documents: ProjectDocument[];
  contractors: ContractorOption[];
};

const initialState: ProjectDocumentActionState = {
  message: null,
  status: "idle",
  fieldErrors: {},
};

function SubmitButton({
  children,
  variant = "primary",
}: {
  children: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const className =
    variant === "danger"
      ? "rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-neutral-400"
      : variant === "secondary"
        ? "rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400"
        : "rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Saving..." : children}
    </button>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  return errors?.map((error) => (
    <p key={error} className="text-sm text-red-700">
      {error}
    </p>
  ));
}

function StatusPill({ status }: { status: ProjectDocument["status"] }) {
  const active = status === "active";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        active
          ? "bg-emerald-50 text-emerald-800"
          : "bg-neutral-100 text-neutral-700",
      ].join(" ")}
    >
      {active ? "Active" : "Archived"}
    </span>
  );
}

function MetadataForm({
  document,
  contractors,
}: {
  document: ProjectDocument;
  contractors: ContractorOption[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateProjectDocumentMetadataAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="mt-4 grid gap-4 rounded-md bg-neutral-50 p-4 md:grid-cols-2">
      <input type="hidden" name="documentId" value={document.id} />
      <input type="hidden" name="projectId" value={document.project_id} />

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Document type
        <select
          name="documentType"
          required
          defaultValue={document.document_type}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-950"
        >
          {projectDocumentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <FieldErrors errors={state.fieldErrors.documentType} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Title
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={document.title}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-950"
        />
        <FieldErrors errors={state.fieldErrors.title} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Contractor
        <select
          name="contractorId"
          defaultValue={document.contractor_id ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-950"
        >
          <option value="">No contractor link</option>
          {contractors.map((contractor) => (
            <option key={contractor.id} value={contractor.id}>
              {contractor.legal_name} - {contractor.email}
            </option>
          ))}
        </select>
        <FieldErrors errors={state.fieldErrors.contractorId} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Consultant name
        <input
          name="consultantName"
          maxLength={160}
          defaultValue={document.consultant_name ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-950"
        />
        <FieldErrors errors={state.fieldErrors.consultantName} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Document date
        <input
          name="documentDate"
          type="date"
          defaultValue={document.document_date ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-950"
        />
        <FieldErrors errors={state.fieldErrors.documentDate} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700 md:col-span-2">
        Notes
        <textarea
          name="notes"
          rows={3}
          maxLength={1000}
          defaultValue={document.notes ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-950"
        />
        <FieldErrors errors={state.fieldErrors.notes} />
      </label>

      <div className="flex items-center gap-3 md:col-span-2">
        <SubmitButton>Save metadata</SubmitButton>
        {state.message ? (
          <p
            role="status"
            className={
              state.status === "success"
                ? "text-sm text-emerald-800"
                : "text-sm text-red-700"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function RowActions({ document }: { document: ProjectDocument }) {
  const router = useRouter();
  const statusAction =
    document.status === "active"
      ? archiveProjectDocumentAction
      : unarchiveProjectDocumentAction;
  const [statusState, statusFormAction] = useActionState(
    statusAction,
    initialState,
  );
  const [deleteState, deleteFormAction] = useActionState(
    deleteProjectDocumentAction,
    initialState,
  );

  useEffect(() => {
    if (statusState.status === "success" || deleteState.status === "success") {
      router.refresh();
    }
  }, [deleteState.status, router, statusState.status]);

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/project-documents/${document.id}/download`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-teal-800 hover:text-teal-950"
      >
        Download PDF
      </Link>
      <form action={statusFormAction}>
        <input type="hidden" name="documentId" value={document.id} />
        <SubmitButton variant="secondary">
          {document.status === "active" ? "Archive" : "Unarchive"}
        </SubmitButton>
      </form>
      <form
        action={deleteFormAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Delete this project document? This removes the private PDF and metadata.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="documentId" value={document.id} />
        <SubmitButton variant="danger">Delete</SubmitButton>
      </form>
      {[statusState, deleteState].map((state) =>
        state.message ? (
          <p
            key={`${state.status}-${state.message}`}
            role="status"
            className={
              state.status === "success"
                ? "text-xs text-emerald-800"
                : "text-xs text-red-700"
            }
          >
            {state.message}
          </p>
        ) : null,
      )}
    </div>
  );
}

export function ProjectDocumentList({
  documents,
  contractors,
}: ProjectDocumentListProps) {
  if (documents.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No project documents uploaded yet.
        </h2>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Project documents
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Document
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Project
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Consultant
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                File
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">
                    {document.title}
                  </p>
                  <p className="mt-1 text-neutral-600">
                    {document.document_type}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Document date: {formatDate(document.document_date)}
                  </p>
                  {document.notes ? (
                    <p className="mt-2 max-w-64 text-xs leading-5 text-neutral-600">
                      {document.notes}
                    </p>
                  ) : null}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-teal-800">
                      Edit metadata
                    </summary>
                    <MetadataForm
                      document={document}
                      contractors={contractors}
                    />
                  </details>
                </td>
                <td className="px-5 py-4 align-top">
                  <Link
                    href={`/projects/${document.project_id}`}
                    className="font-medium text-teal-800 hover:text-teal-950"
                  >
                    {document.project?.name ?? "Unknown project"}
                  </Link>
                  <p className="mt-1 text-neutral-600">
                    {document.project?.client_label ?? "No client label"}
                  </p>
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  <p>
                    {document.contractor?.legal_name ??
                      document.consultant_name ??
                      "General project document"}
                  </p>
                  {document.contractor?.email ? (
                    <p className="mt-1 text-neutral-600">
                      {document.contractor.email}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  <p>{document.file_name}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatFileSize(document.file_size_bytes)}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <StatusPill status={document.status} />
                  <p className="mt-2 text-xs text-neutral-500">
                    Uploaded {formatDate(document.created_at)}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <RowActions document={document} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
