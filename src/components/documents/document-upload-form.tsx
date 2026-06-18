"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  uploadContractorDocumentAction,
  type DocumentUploadState,
} from "@/app/(portal)/documents/actions";
import type { DocumentRequirementRecord } from "@/lib/documents/types";

type DocumentUploadFormProps = {
  requirements: DocumentRequirementRecord[];
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Uploading..." : "Upload PDF"}
    </button>
  );
}

export function DocumentUploadForm({ requirements }: DocumentUploadFormProps) {
  const router = useRouter();
  const initialState: DocumentUploadState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    uploadContractorDocumentAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  if (requirements.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Document upload unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          No document requirements are configured for your contractor profile
          yet. Ask an admin to add development document requirements before
          testing uploads.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">
          Contractor upload
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Upload a signed PDF document
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Upload fake development PDFs only. The file is stored in the private
          contractor document bucket and a metadata record is created for
          review.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="space-y-2">
          <label
            htmlFor="documentRequirementId"
            className="block text-sm font-medium text-neutral-800"
          >
            Requirement
          </label>
          <select
            id="documentRequirementId"
            name="documentRequirementId"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Select requirement</option>
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>
                {requirement.name}
                {requirement.is_required ? " (required)" : ""}
              </option>
            ))}
          </select>
          {state.fieldErrors.documentRequirementId?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
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
          {state.fieldErrors.file?.map((error) => (
            <p key={error} className="text-sm text-red-700">
              {error}
            </p>
          ))}
        </div>

        <SubmitButton />
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
