"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  sendOnboardingDocumentsEmailAction,
  type OnboardingActionState,
} from "@/app/(portal)/onboarding/actions";
import {
  defaultOnboardingCurrency,
  defaultOnboardingSpecialConditions,
  defaultOnboardingSwiftBic,
  defaultTimesheetSubmissionInstructions,
} from "@/lib/onboarding/defaults";

import {
  FieldErrors,
  fieldClassName,
  statusClassName,
} from "./onboarding-form-shared";

type OnboardingDocumentsFormProps = {
  today: string;
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
      {pending ? "Generating..." : "Generate and send documents"}
    </button>
  );
}

function TextField({
  name,
  label,
  errors,
  type = "text",
  defaultValue,
  required = true,
  maxLength,
  placeholder,
}: {
  name: string;
  label: string;
  errors?: string[];
  type?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-neutral-800">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={fieldClassName()}
      />
      <FieldErrors errors={errors} />
    </label>
  );
}

function TextAreaField({
  name,
  label,
  errors,
  defaultValue,
  required = true,
  rows = 3,
  maxLength,
}: {
  name: string;
  label: string;
  errors?: string[];
  defaultValue?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-neutral-800 lg:col-span-2">
      <span>{label}</span>
      <textarea
        name={name}
        required={required}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue}
        className={fieldClassName()}
      />
      <FieldErrors errors={errors} />
    </label>
  );
}

export function OnboardingDocumentsForm({
  today,
}: OnboardingDocumentsFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    sendOnboardingDocumentsEmailAction,
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
          Contract documents
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Generate and email onboarding PDFs
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Fully manual form. No contractor, project or assignment data is
          auto-pulled.
        </p>
      </div>

      <form
        action={formAction}
        className="mt-5 grid gap-5 lg:grid-cols-2"
      >
        <input type="hidden" name="currency" value={defaultOnboardingCurrency} />

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
          <span>Recipient display name</span>
          <input
            name="recipientDisplayName"
            required
            className={fieldClassName()}
          />
          <FieldErrors errors={state.fieldErrors.recipientDisplayName} />
        </label>

        <TextField
          name="internalContractorReference"
          label="Internal contractor reference (optional)"
          required={false}
          errors={state.fieldErrors.internalContractorReference}
          maxLength={160}
        />

        <TextField
          name="consultantLegalName"
          label="Consultant legal name"
          errors={state.fieldErrors.consultantLegalName}
          maxLength={160}
        />

        <TextAreaField
          name="consultantAddress"
          label="Consultant address"
          errors={state.fieldErrors.consultantAddress}
          rows={3}
          maxLength={1000}
        />

        <TextField
          name="consultantTaxVatNumber"
          label="Consultant tax/VAT number or N/A"
          defaultValue="N/A"
          errors={state.fieldErrors.consultantTaxVatNumber}
          maxLength={120}
        />

        <TextField
          name="consultantTitleStatus"
          label="Consultant title/status"
          defaultValue="Freelance Consultant"
          errors={state.fieldErrors.consultantTitleStatus}
          maxLength={120}
        />

        <TextField
          name="effectiveDate"
          label="Effective date"
          type="date"
          defaultValue={today}
          errors={state.fieldErrors.effectiveDate}
        />

        <TextField
          name="documentDate"
          label="Document date"
          type="date"
          defaultValue={today}
          errors={state.fieldErrors.documentDate}
        />

        <TextField
          name="clientProjectReference"
          label="Client/project reference"
          errors={state.fieldErrors.clientProjectReference}
          maxLength={200}
        />

        <TextField
          name="roleAssignmentTitle"
          label="Role/assignment title"
          errors={state.fieldErrors.roleAssignmentTitle}
          maxLength={200}
        />

        <TextField
          name="startDate"
          label="Start date"
          type="date"
          defaultValue={today}
          errors={state.fieldErrors.startDate}
        />

        <TextField
          name="expectedEndDate"
          label="Expected end date"
          type="date"
          errors={state.fieldErrors.expectedEndDate}
        />

        <TextField
          name="initialDuration"
          label="Initial duration"
          placeholder="For example: 6 months"
          errors={state.fieldErrors.initialDuration}
          maxLength={120}
        />

        <TextField
          name="workLocation"
          label="Work location"
          defaultValue="Remote"
          errors={state.fieldErrors.workLocation}
          maxLength={160}
        />

        <TextField
          name="expectedWorkload"
          label="Expected workload"
          placeholder="For example: up to 40 hours per week"
          errors={state.fieldErrors.expectedWorkload}
          maxLength={200}
        />

        <TextField
          name="workingTimeZone"
          label="Working time zone"
          defaultValue="Europe/Nicosia / CET project hours as required"
          errors={state.fieldErrors.workingTimeZone}
          maxLength={120}
        />

        <TextAreaField
          name="specificResponsibilities"
          label="Specific responsibilities"
          errors={state.fieldErrors.specificResponsibilities}
          rows={4}
          maxLength={1500}
        />

        <TextField
          name="agreedRateAmount"
          label="Agreed rate amount (EUR)"
          errors={state.fieldErrors.agreedRateAmount}
          maxLength={20}
        />

        <label className="space-y-2 text-sm font-medium text-neutral-800">
          <span>Rate unit</span>
          <select name="rateUnit" required defaultValue="hour" className={fieldClassName()}>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
          </select>
          <FieldErrors errors={state.fieldErrors.rateUnit} />
        </label>

        <TextField
          name="paymentTerm"
          label="Payment term"
          defaultValue="30 calendar days"
          errors={state.fieldErrors.paymentTerm}
          maxLength={120}
        />

        <TextAreaField
          name="timesheetSubmissionInstructions"
          label="Timesheet submission instructions"
          defaultValue={defaultTimesheetSubmissionInstructions}
          errors={state.fieldErrors.timesheetSubmissionInstructions}
          rows={3}
          maxLength={1200}
        />

        <TextAreaField
          name="specialConditions"
          label="Special conditions"
          defaultValue={defaultOnboardingSpecialConditions}
          errors={state.fieldErrors.specialConditions}
          rows={3}
          maxLength={1000}
        />

        <TextField
          name="bankAccountHolder"
          label="Bank account holder"
          errors={state.fieldErrors.bankAccountHolder}
          maxLength={160}
        />

        <TextField
          name="ibanOrAccountNumber"
          label="IBAN or account number"
          errors={state.fieldErrors.ibanOrAccountNumber}
          maxLength={120}
        />

        <TextField
          name="swiftBic"
          label="SWIFT/BIC or N/A"
          defaultValue={defaultOnboardingSwiftBic}
          errors={state.fieldErrors.swiftBic}
          maxLength={60}
        />

        <TextField
          name="bankName"
          label="Bank name"
          errors={state.fieldErrors.bankName}
          maxLength={160}
        />

        <TextAreaField
          name="bankCountryAddress"
          label="Bank country/address"
          errors={state.fieldErrors.bankCountryAddress}
          rows={3}
          maxLength={400}
        />

        <TextAreaField
          name="additionalBankDetails"
          label="Additional bank details (optional)"
          required={false}
          errors={state.fieldErrors.additionalBankDetails}
          rows={2}
          maxLength={1000}
        />

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
