"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  resendContractorInviteAction,
  type ContractorCreateState,
} from "@/app/(portal)/contractors/actions";
import type { ContractorRecord } from "@/lib/contractors/types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400"
    >
      {pending ? "Sending..." : "Resend invitation email"}
    </button>
  );
}

export function ContractorResendInviteForm({
  contractor,
}: {
  contractor: ContractorRecord;
}) {
  const initialState: ContractorCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    resendContractorInviteAction,
    initialState,
  );

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">
            Contractor invitation
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Send a new secure password setup link to {contractor.email}.
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="contractorId" value={contractor.id} />
          <SubmitButton />
        </form>
      </div>
      {state.message ? (
        <p
          role="status"
          className={
            state.status === "success"
              ? "mt-3 text-sm text-emerald-700"
              : "mt-3 text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
