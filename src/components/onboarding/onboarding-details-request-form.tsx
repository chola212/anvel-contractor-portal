"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  sendOnboardingDetailsRequestAction,
  type OnboardingActionState,
} from "@/app/(portal)/onboarding/actions";

import {
  FieldErrors,
  fieldClassName,
  statusClassName,
  type OnboardingContractorOption,
} from "./onboarding-form-shared";

type OnboardingDetailsRequestFormProps = {
  contractors: OnboardingContractorOption[];
};

const initialState: OnboardingActionState = {
  message: null,
  status: "idle",
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Sending..." : "Send details request"}
    </button>
  );
}

export function OnboardingDetailsRequestForm({
  contractors,
}: OnboardingDetailsRequestFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    sendOnboardingDetailsRequestAction,
    initialState,
  );
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const selectedContractor = contractors.find(
    (contractor) => contractor.id === selectedContractorId,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">Email request</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Request contractor onboarding details
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Sends the standard details request email. It does not change the
          contractor record or create a workflow status.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5 lg:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-neutral-800">
          <span>Contractor</span>
          <select
            name="contractorId"
            required
            value={selectedContractorId}
            onChange={(event) => setSelectedContractorId(event.target.value)}
            className={fieldClassName()}
          >
            <option value="">Select contractor</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.legal_name} - {contractor.email}
              </option>
            ))}
          </select>
          <FieldErrors errors={state.fieldErrors.contractorId} />
        </label>

        <label className="space-y-2 text-sm font-medium text-neutral-800">
          <span>Recipient email</span>
          <input
            name="recipientEmail"
            type="email"
            required
            value={selectedContractor?.email ?? ""}
            readOnly
            className={`${fieldClassName()} bg-neutral-50`}
          />
          <FieldErrors errors={state.fieldErrors.recipientEmail} />
        </label>

        <label className="space-y-2 text-sm font-medium text-neutral-800">
          <span>Contractor name</span>
          <input
            name="contractorName"
            required
            value={selectedContractor?.legal_name ?? ""}
            readOnly
            className={`${fieldClassName()} bg-neutral-50`}
          />
          <FieldErrors errors={state.fieldErrors.contractorName} />
        </label>

        <div className="flex items-end">
          <SubmitButton />
        </div>
      </form>

      {state.message ? (
        <div role="status" className={statusClassName(state.status)}>
          {state.message}
        </div>
      ) : null}
    </section>
  );
}
