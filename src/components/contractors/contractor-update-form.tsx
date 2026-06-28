"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import {
  updateContractorAction,
  type ContractorCreateState,
} from "@/app/(portal)/contractors/actions";
import {
  contractorStatusLabels,
  supplierTypeLabels,
  vatTreatmentLabels,
} from "@/lib/contractors/format";
import type { ContractorRecord } from "@/lib/contractors/types";

type ContractorUpdateFormProps = {
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
      {pending ? "Saving..." : "Save contractor"}
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

export function ContractorUpdateForm({
  contractor,
}: ContractorUpdateFormProps) {
  const router = useRouter();
  const initialState: ContractorCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    updateContractorAction,
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
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Edit contractor
        </h2>
      </div>

      <form action={formAction} className="mt-5 grid gap-5">
        <input type="hidden" name="contractorId" value={contractor.id} />

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={`email-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Email address
            </label>
            <input
              id={`email-${contractor.id}`}
              name="email"
              type="email"
              required
              defaultValue={contractor.email}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.email} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`full-name-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Account name
            </label>
            <input
              id={`full-name-${contractor.id}`}
              name="fullName"
              type="text"
              required
              maxLength={160}
              defaultValue={contractor.legal_name}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.fullName} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`legal-name-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Legal name
            </label>
            <input
              id={`legal-name-${contractor.id}`}
              name="legalName"
              type="text"
              required
              maxLength={160}
              defaultValue={contractor.legal_name}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.legalName} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`trading-name-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Trading name
            </label>
            <input
              id={`trading-name-${contractor.id}`}
              name="tradingName"
              type="text"
              defaultValue={contractor.trading_name ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.tradingName} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`phone-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Phone
            </label>
            <input
              id={`phone-${contractor.id}`}
              name="phone"
              type="tel"
              defaultValue={contractor.phone ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.phone} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`country-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Country
            </label>
            <input
              id={`country-${contractor.id}`}
              name="country"
              type="text"
              defaultValue={contractor.country ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.country} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`supplier-type-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Supplier type
            </label>
            <select
              id={`supplier-type-${contractor.id}`}
              name="supplierType"
              defaultValue={contractor.supplier_type ?? ""}
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
              htmlFor={`vat-treatment-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              VAT treatment
            </label>
            <select
              id={`vat-treatment-${contractor.id}`}
              name="vatTreatment"
              defaultValue={contractor.vat_treatment ?? ""}
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
              htmlFor={`status-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Status
            </label>
            <select
              id={`status-${contractor.id}`}
              name="status"
              defaultValue={contractor.status}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            >
              <option value="draft">{contractorStatusLabels.draft}</option>
              <option value="invited">{contractorStatusLabels.invited}</option>
              <option value="active">{contractorStatusLabels.active}</option>
              <option value="paused">{contractorStatusLabels.paused}</option>
              <option value="offboarded">
                {contractorStatusLabels.offboarded}
              </option>
            </select>
            <FieldError errors={state.fieldErrors.status} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`company-registration-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Company registration number
            </label>
            <input
              id={`company-registration-${contractor.id}`}
              name="companyRegistrationNumber"
              type="text"
              defaultValue={contractor.company_registration_number ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.companyRegistrationNumber} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`vat-number-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              VAT number
            </label>
            <input
              id={`vat-number-${contractor.id}`}
              name="vatNumber"
              type="text"
              defaultValue={contractor.vat_number ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.vatNumber} />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`tax-number-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Tax number
            </label>
            <input
              id={`tax-number-${contractor.id}`}
              name="taxNumber"
              type="text"
              defaultValue={contractor.tax_number ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.taxNumber} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={`fiscal-address-line-1-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Fiscal address line 1
            </label>
            <input
              id={`fiscal-address-line-1-${contractor.id}`}
              name="fiscalAddressLine1"
              type="text"
              defaultValue={contractor.fiscal_address_line_1 ?? contractor.fiscal_address ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />
            <FieldError errors={state.fieldErrors.fiscalAddressLine1} />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`fiscal-address-line-2-${contractor.id}`}
              className="block text-sm font-medium text-neutral-800"
            >
              Fiscal address line 2
            </label>
            <input
              id={`fiscal-address-line-2-${contractor.id}`}
              name="fiscalAddressLine2"
              type="text"
              defaultValue={contractor.fiscal_address_line_2 ?? ""}
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
