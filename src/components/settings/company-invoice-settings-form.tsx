"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveCompanyInvoiceSettingsAction,
  type CompanySettingsState,
} from "@/app/(portal)/settings/company/actions";
import type { CompanyInvoiceSettings } from "@/lib/outgoing-invoices/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:bg-neutral-400"
    >
      {pending ? "Saving..." : "Save invoice settings"}
    </button>
  );
}

export function CompanyInvoiceSettingsForm({
  settings,
}: {
  settings: CompanyInvoiceSettings | null;
}) {
  const initialState: CompanySettingsState = {
    status: "idle",
    message: null,
    fieldErrors: {},
  };
  const [state, action] = useActionState(
    saveCompanyInvoiceSettingsAction,
    initialState,
  );
  const fields = [
    ["companyLegalName", "Company legal name", settings?.company_legal_name, true],
    ["tradingName", "Trading name / brand name", settings?.trading_name, false],
    ["companyAddress", "Company address", settings?.company_address, true],
    ["companyCityRegion", "City / region", settings?.company_city_region, false],
    ["companyCountry", "Country", settings?.company_country, true],
    ["companyVatNumber", "VAT number", settings?.company_vat_number, true],
    ["invoiceSenderName", "Default invoice email sender name", settings?.invoice_sender_name, false],
    ["bankName", "Bank name", settings?.bank_name, true],
    ["bankAccountName", "Bank account name", settings?.bank_account_name, true],
    ["iban", "IBAN", settings?.iban, true],
    ["swiftBic", "SWIFT/BIC", settings?.swift_bic, true],
  ] as const;

  return (
    <form action={action} className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map(([name, label, value, required]) => (
          <div key={name} className="space-y-2">
            <label htmlFor={name} className="block text-sm font-medium text-neutral-800">
              {label}
            </label>
            <input
              id={name}
              name={name}
              required={required}
              defaultValue={value ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            {state.fieldErrors[name]?.map((error) => (
              <p key={error} className="text-sm text-red-700">{error}</p>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="defaultInvoiceNotes" className="block text-sm font-medium text-neutral-800">
            Default invoice notes
          </label>
          <textarea
            id="defaultInvoiceNotes"
            name="defaultInvoiceNotes"
            rows={4}
            defaultValue={settings?.default_invoice_notes ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          {state.fieldErrors.defaultInvoiceNotes?.map((error) => (
            <p key={error} className="text-sm text-red-700">{error}</p>
          ))}
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <p className="font-medium text-neutral-900">Fixed Phase 1 terms</p>
          <p className="mt-2 text-neutral-600">Payment terms: 30 calendar days</p>
          <p className="mt-1 text-neutral-600">Currency: EUR</p>
        </div>
      </div>
      {state.message ? (
        <p className={`mt-4 text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end"><SaveButton /></div>
    </form>
  );
}
