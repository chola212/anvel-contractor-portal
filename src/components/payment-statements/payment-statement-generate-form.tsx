"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  generatePaymentStatementAction,
  type PaymentStatementActionState,
} from "@/app/(portal)/timesheets/payment-statement-actions";

type PaymentStatementGenerateFormProps = {
  timesheetId: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Generating..." : "Generate statement"}
    </button>
  );
}

export function PaymentStatementGenerateForm({
  timesheetId,
}: PaymentStatementGenerateFormProps) {
  const router = useRouter();
  const initialState: PaymentStatementActionState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    generatePaymentStatementAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="timesheetId" value={timesheetId} />
      <SubmitButton />
      {state.message ? (
        <div
          role="status"
          className={[
            "mt-4 rounded-md border px-3 py-2 text-sm",
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
        >
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
