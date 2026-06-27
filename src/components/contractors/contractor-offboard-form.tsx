"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  offboardContractorAction,
  type ContractorCreateState,
} from "@/app/(portal)/contractors/actions";
import type { ContractorRecord } from "@/lib/contractors/types";

type ContractorOffboardFormProps = {
  contractor: ContractorRecord;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-md border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
    >
      {pending ? "Offboarding..." : "Offboard contractor"}
    </button>
  );
}

export function ContractorOffboardForm({
  contractor,
}: ContractorOffboardFormProps) {
  const router = useRouter();
  const initialState: ContractorCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    offboardContractorAction,
    initialState,
  );
  const alreadyOffboarded = contractor.status === "offboarded";

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">
          Account access
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Offboard contractor
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Offboarding disables portal access and keeps operational records for
          audit and payment history.
        </p>
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input type="hidden" name="contractorId" value={contractor.id} />
        <p className="text-sm text-neutral-600">
          Current status: <span className="font-medium">{contractor.status}</span>
        </p>
        <SubmitButton disabled={alreadyOffboarded} />
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
