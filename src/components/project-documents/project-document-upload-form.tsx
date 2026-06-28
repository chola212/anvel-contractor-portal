"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  uploadProjectDocumentAction,
  type ProjectDocumentActionState,
} from "@/app/(portal)/project-documents/actions";
import { projectDocumentTypes } from "@/lib/project-documents/types";

type ProjectOption = {
  id: string;
  name: string;
  client_label: string | null;
};

type ContractorOption = {
  id: string;
  legal_name: string;
  email: string;
};

type ProjectDocumentUploadFormProps = {
  projects: ProjectOption[];
  contractors: ContractorOption[];
  defaultProjectId?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Uploading..." : "Upload document"}
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

export function ProjectDocumentUploadForm({
  projects,
  contractors,
  defaultProjectId,
}: ProjectDocumentUploadFormProps) {
  const router = useRouter();
  const initialState: ProjectDocumentActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    uploadProjectDocumentAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">Admin upload</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Upload project document
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Admin-only. Contractors cannot access these files.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="projectId"
            className="block text-sm font-medium text-neutral-800"
          >
            Project
          </label>
          <select
            id="projectId"
            name="projectId"
            required
            defaultValue={defaultProjectId ?? ""}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.client_label ? ` - ${project.client_label}` : ""}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.fieldErrors.projectId} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="contractorId"
            className="block text-sm font-medium text-neutral-800"
          >
            Contractor (optional)
          </label>
          <select
            id="contractorId"
            name="contractorId"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">No contractor link</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.legal_name} - {contractor.email}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.fieldErrors.contractorId} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="consultantName"
            className="block text-sm font-medium text-neutral-800"
          >
            Consultant name (optional)
          </label>
          <input
            id="consultantName"
            name="consultantName"
            type="text"
            maxLength={160}
            placeholder="Andres Velasco"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <FieldErrors errors={state.fieldErrors.consultantName} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="documentType"
            className="block text-sm font-medium text-neutral-800"
          >
            Document type
          </label>
          <select
            id="documentType"
            name="documentType"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Select document type</option>
            {projectDocumentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.fieldErrors.documentType} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-neutral-800"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <FieldErrors errors={state.fieldErrors.title} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="documentDate"
            className="block text-sm font-medium text-neutral-800"
          >
            Document date (optional)
          </label>
          <input
            id="documentDate"
            name="documentDate"
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <FieldErrors errors={state.fieldErrors.documentDate} />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-neutral-800"
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={1000}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          />
          <FieldErrors errors={state.fieldErrors.notes} />
        </div>

        <div className="space-y-2">
          <label htmlFor="file" className="block text-sm font-medium text-neutral-800">
            PDF file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-800"
          />
          <FieldErrors errors={state.fieldErrors.file} />
        </div>

        <div className="flex items-end">
          <SubmitButton />
        </div>
      </form>

      {state.message ? (
        <div
          role="status"
          className={[
            "mt-5 rounded-md border px-3 py-2 text-sm",
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
        >
          {state.message}
        </div>
      ) : null}
    </section>
  );
}
