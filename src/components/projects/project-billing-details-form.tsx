"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveProjectBillingDetailsAction,
  type ProjectCreateState,
} from "@/app/(portal)/projects/actions";
import type { ProjectBillingDetails } from "@/lib/outgoing-invoices/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:bg-neutral-400">
      {pending ? "Saving..." : "Save billing details"}
    </button>
  );
}

export function ProjectBillingDetailsForm({
  projectId,
  details,
}: {
  projectId: string;
  details: ProjectBillingDetails | null;
}) {
  const initialState: ProjectCreateState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, action] = useActionState(
    saveProjectBillingDetailsAction,
    initialState,
  );
  const inputFields = [
    ["billingLegalName", "Billing legal name", details?.billing_legal_name, true, "text"],
    ["billingEmail", "Billing email", details?.billing_email, true, "email"],
    ["billingCcEmails", "Billing CC emails", details?.billing_cc_emails.join(", "), false, "text"],
    ["billingAddress", "Billing address", details?.billing_address, true, "text"],
    ["billingCountry", "Billing country", details?.billing_country, true, "text"],
    ["billingVatNumber", "Billing VAT number", details?.billing_vat_number, true, "text"],
    ["poReference", "PO reference", details?.po_reference, false, "text"],
  ] as const;

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-neutral-950">Billing details</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Invoice recipient details for this project. Contractors cannot access this information.
      </p>
      <form action={action} className="mt-5 grid gap-5">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid gap-5 md:grid-cols-2">
          {inputFields.map(([name, label, value, required, type]) => (
            <div key={name} className="space-y-2">
              <label htmlFor={name} className="block text-sm font-medium text-neutral-800">{label}</label>
              <input
                id={name}
                name={name}
                type={type}
                required={required}
                defaultValue={value ?? ""}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              {state.fieldErrors[name]?.map((error) => <p key={error} className="text-sm text-red-700">{error}</p>)}
            </div>
          ))}
          <div className="space-y-2">
            <label htmlFor="vatTreatment" className="block text-sm font-medium text-neutral-800">VAT treatment</label>
            <select id="vatTreatment" name="vatTreatment" required defaultValue={details?.vat_treatment ?? ""} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
              <option value="">Select VAT treatment</option>
              <option value="cyprus_vat_19">Cyprus VAT 19%</option>
              <option value="eu_reverse_charge_0">EU reverse charge / 0%</option>
              <option value="non_eu_outside_scope">Non-EU / outside scope / accountant review</option>
              <option value="manual_review">Manual review</option>
            </select>
            {state.fieldErrors.vatTreatment?.map((error) => <p key={error} className="text-sm text-red-700">{error}</p>)}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="defaultInvoiceDescription" className="block text-sm font-medium text-neutral-800">Default invoice description</label>
            <textarea id="defaultInvoiceDescription" name="defaultInvoiceDescription" rows={3} defaultValue={details?.default_invoice_description ?? ""} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label htmlFor="invoiceNotes" className="block text-sm font-medium text-neutral-800">Invoice notes</label>
            <textarea id="invoiceNotes" name="invoiceNotes" rows={3} defaultValue={details?.invoice_notes ?? ""} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
        </div>
        {state.message ? <p className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null}
        <div className="flex justify-end"><SaveButton /></div>
      </form>
    </section>
  );
}
