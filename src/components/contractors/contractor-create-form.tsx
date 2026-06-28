"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createContractorAction,
  type ContractorCreateState,
} from "@/app/(portal)/contractors/actions";
import {
  supplierTypeLabels,
  vatTreatmentLabels,
} from "@/lib/contractors/format";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Creating..." : "Create contractor"}
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

export function ContractorCreateForm() {
  const initialState: ContractorCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    createContractorAction,
    initialState,
  );

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Create contractor
        </h2>
      </div>

      <form action={formAction} className="mt-5 grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-800"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.email} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-neutral-800"
            >
              Account name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              maxLength={160}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.fullName} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="legalName"
              className="block text-sm font-medium text-neutral-800"
            >
              Legal name
            </label>
            <input
              id="legalName"
              name="legalName"
              type="text"
              required
              maxLength={160}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.legalName} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="tradingName"
              className="block text-sm font-medium text-neutral-800"
            >
              Trading name
            </label>
            <input
              id="tradingName"
              name="tradingName"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.tradingName} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-neutral-800"
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.phone} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="country"
              className="block text-sm font-medium text-neutral-800"
            >
              Country
            </label>
            <input
              id="country"
              name="country"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.country} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="supplierType"
              className="block text-sm font-medium text-neutral-800"
            >
              Supplier type
            </label>
            <select
              id="supplierType"
              name="supplierType"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Not provided</option>
              <option value="limited_company">
                {supplierTypeLabels.limited_company}
              </option>
              <option value="self_employed">
                {supplierTypeLabels.self_employed}
              </option>
              <option value="sole_trader">{supplierTypeLabels.sole_trader}</option>
              <option value="other">{supplierTypeLabels.other}</option>
            </select>
            <FieldError errors={state.fieldErrors.supplierType} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="vatTreatment"
              className="block text-sm font-medium text-neutral-800"
            >
              VAT treatment
            </label>
            <select
              id="vatTreatment"
              name="vatTreatment"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Not provided</option>
              <option value="eu_reverse_charge">
                {vatTreatmentLabels.eu_reverse_charge}
              </option>
              <option value="cyprus_vat_19">
                {vatTreatmentLabels.cyprus_vat_19}
              </option>
              <option value="non_eu_accountant_review">
                {vatTreatmentLabels.non_eu_accountant_review}
              </option>
              <option value="eu_no_vat_accountant_review">
                {vatTreatmentLabels.eu_no_vat_accountant_review}
              </option>
            </select>
            <FieldError errors={state.fieldErrors.vatTreatment} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-neutral-800"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="active"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            >
              <option value="draft">Draft</option>
              <option value="invited">Invited</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="offboarded">Offboarded</option>
            </select>
            <FieldError errors={state.fieldErrors.status} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="companyRegistrationNumber"
              className="block text-sm font-medium text-neutral-800"
            >
              Company registration number
            </label>
            <input
              id="companyRegistrationNumber"
              name="companyRegistrationNumber"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.companyRegistrationNumber} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="vatNumber"
              className="block text-sm font-medium text-neutral-800"
            >
              VAT number
            </label>
            <input
              id="vatNumber"
              name="vatNumber"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.vatNumber} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="taxNumber"
              className="block text-sm font-medium text-neutral-800"
            >
              Tax number
            </label>
            <input
              id="taxNumber"
              name="taxNumber"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.taxNumber} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="fiscalAddressLine1"
              className="block text-sm font-medium text-neutral-800"
            >
              Fiscal address line 1
            </label>
            <input
              id="fiscalAddressLine1"
              name="fiscalAddressLine1"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.fiscalAddressLine1} />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="fiscalAddressLine2"
              className="block text-sm font-medium text-neutral-800"
            >
              Fiscal address line 2
            </label>
            <input
              id="fiscalAddressLine2"
              name="fiscalAddressLine2"
              type="text"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.fiscalAddressLine2} />
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
