import { PaymentStatementGenerateForm } from "@/components/payment-statements/payment-statement-generate-form";
import {
  formatCurrency,
  formatDateTime,
  formatHours,
  vatTreatmentLabels,
} from "@/lib/payment-statements/format";
import type { PaymentStatementRecord } from "@/lib/payment-statements/types";
import type { TimesheetStatus } from "@/lib/timesheets/types";

type PaymentStatementPanelProps = {
  statement: PaymentStatementRecord | null;
  timesheetId: string;
  timesheetStatus: TimesheetStatus;
  canGenerate: boolean;
};

export function PaymentStatementPanel({
  statement,
  timesheetId,
  timesheetStatus,
  canGenerate,
}: PaymentStatementPanelProps) {
  if (!statement) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <p className="text-sm font-medium text-neutral-500">
          Payment statement
        </p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          No payment statement generated
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Self-billing invoices are generated from approved timesheets. Payment
          status remains tracked separately.
        </p>
        {canGenerate && timesheetStatus === "approved" ? (
          <PaymentStatementGenerateForm timesheetId={timesheetId} />
        ) : null}
        {canGenerate && timesheetStatus !== "approved" ? (
          <p className="mt-4 text-sm text-neutral-600">
            Generate this only after the timesheet is approved.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            Payment statement
          </p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-950">
            Self-billing calculation
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            This calculation supports the generated self-billing invoice and
            payment tracking for the approved timesheet.
          </p>
        </div>
        <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          Created {formatDateTime(statement.created_at)}
        </p>
      </div>

      <dl className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-neutral-200 p-4">
          <dt className="text-sm text-neutral-600">Approved hours</dt>
          <dd className="mt-2 font-semibold text-neutral-950">
            {formatHours(statement.total_hours)}
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <dt className="text-sm text-neutral-600">Hourly rate</dt>
          <dd className="mt-2 font-semibold text-neutral-950">
            {formatCurrency(statement.hourly_rate, statement.currency)}
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <dt className="text-sm text-neutral-600">VAT treatment</dt>
          <dd className="mt-2 font-semibold text-neutral-950">
            {vatTreatmentLabels[statement.vat_treatment]}
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <dt className="text-sm text-neutral-600">Net amount</dt>
          <dd className="mt-2 font-semibold text-neutral-950">
            {formatCurrency(statement.net_amount, statement.currency)}
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <dt className="text-sm text-neutral-600">VAT amount</dt>
          <dd className="mt-2 font-semibold text-neutral-950">
            {formatCurrency(statement.vat_amount, statement.currency)}
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <dt className="text-sm text-neutral-600">Gross amount</dt>
          <dd className="mt-2 font-semibold text-neutral-950">
            {formatCurrency(statement.gross_amount, statement.currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
