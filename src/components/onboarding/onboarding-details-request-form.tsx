"use client";

import { useActionState, useEffect } from "react";
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
} from "./onboarding-form-shared";

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

export function OnboardingDetailsRequestForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    sendOnboardingDetailsRequestAction,
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
        <p className="text-sm font-medium text-neutral-500">Email request</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Request contractor onboarding details
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Free-text email request. Use this before the contractor exists in the
          portal.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5 lg:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-neutral-800">
          <span>Recipient email</span>
          <input
            name="recipientEmail"
            type="email"
            required
            className={fieldClassName()}
          />
          <FieldErrors errors={state.fieldErrors.recipientEmail} />
        </label>

        <label className="space-y-2 text-sm font-medium text-neutral-800">
          <span>Contractor name</span>
          <input
            name="contractorName"
            required
            className={fieldClassName()}
          />
          <FieldErrors errors={state.fieldErrors.contractorName} />
        </label>

        <label className="space-y-2 text-sm font-medium text-neutral-800">
          <span>Internal contractor reference (optional)</span>
          <input
            name="internalContractorReference"
            maxLength={160}
            className={fieldClassName()}
          />
          <FieldErrors errors={state.fieldErrors.internalContractorReference} />
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
