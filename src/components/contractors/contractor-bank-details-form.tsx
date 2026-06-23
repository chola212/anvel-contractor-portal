"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  updateContractorBankDetailsAction,
  type ContractorCreateState,
} from "@/app/(portal)/contractors/actions";
import type { ContractorRecord } from "@/lib/contractors/types";

type ContractorBankDetailsFormProps = {
  contractor: ContractorRecord;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Saving..." : "Save bank details"}
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
        <p key={error} className="text-sm text-red-700">
          {error}
        </p>
      ))}
    </>
  );
}

export function ContractorBankDetailsForm({
  contractor,
}: ContractorBankDetailsFormProps) {
  const router = useRouter();
  const initialState: ContractorCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    updateContractorBankDetailsAction,
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
        <p className="text-sm font-medium text-neutral-500">
          Admin bank details
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Edit contractor bank details
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Store fake development bank details only. This records payment
          destination details for manual review; it does not trigger payments
          or create self-billing.
        </p>
      </div>

      <form action={formAction} className="mt-5 grid gap-5">
        <input type="hidden" name="contractorId" value={contractor.id} />

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={`bank-account-holder-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Bank account holder
            </label>
            <input
              id={`bank-account-holder-${contractor.id}`}
              name="bankAccountHolder"
              type="text"
              defaultValue={contractor.bank_account_holder ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.bankAccountHolder} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`bank-currency-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Bank currency
            </label>
            <input
              id={`bank-currency-${contractor.id}`}
              type="text"
              value="EUR"
              readOnly
              className="w-full rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-700"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`iban-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              IBAN
            </label>
            <input
              id={`iban-${contractor.id}`}
              name="iban"
              type="text"
              defaultValue={contractor.iban ?? ""}
              spellCheck={false}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.iban} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`swift-bic-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              SWIFT/BIC
            </label>
            <input
              id={`swift-bic-${contractor.id}`}
              name="swiftBic"
              type="text"
              defaultValue={contractor.swift_bic ?? ""}
              spellCheck={false}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.swiftBic} />
          </div>
        </div>

        <div className="flex justify-end">
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
