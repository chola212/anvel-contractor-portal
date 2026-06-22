"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  reviewContractorDocumentAction,
  type DocumentReviewState,
} from "@/app/(portal)/documents/actions";
import { documentStatusLabels } from "@/lib/documents/format";
import type { ContractorDocument } from "@/lib/documents/types";

type DocumentReviewFormProps = {
  document: ContractorDocument;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving..." : "Save review"}
    </button>
  );
}

function FieldError({ errors }: { errors: string[] | undefined }) {
  if (!errors) {
    return null;
  }

  return (
    <>
      {errors.map((error) => (
        <p key={error} className="text-xs text-red-700">
          {error}
        </p>
      ))}
    </>
  );
}

export function DocumentReviewForm({ document }: DocumentReviewFormProps) {
  const router = useRouter();
  const initialState: DocumentReviewState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    reviewContractorDocumentAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="min-w-72 space-y-3">
      <input type="hidden" name="documentId" value={document.id} />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor={`document-status-${document.id}`}>
          Document review status
        </label>
        <select
          id={`document-status-${document.id}`}
          name="status"
          defaultValue={document.status}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        >
          <option value="uploaded">{documentStatusLabels.uploaded}</option>
          <option value="approved">{documentStatusLabels.approved}</option>
          <option value="rejected">{documentStatusLabels.rejected}</option>
          <option value="expired">{documentStatusLabels.expired}</option>
        </select>
        <SubmitButton />
      </div>
      <FieldError errors={state.fieldErrors.status} />

      <div>
        <label
          htmlFor={`document-review-comment-${document.id}`}
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Review comment
        </label>
        <textarea
          id={`document-review-comment-${document.id}`}
          name="reviewComment"
          rows={2}
          defaultValue={document.review_comment ?? ""}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        <FieldError errors={state.fieldErrors.reviewComment} />
      </div>

      {state.message ? (
        <p
          role="status"
          className={
            state.status === "success"
              ? "text-xs text-emerald-700"
              : "text-xs text-red-700"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
