import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailField } from "@/components/contractors/detail-field";
import { PaymentStatementPanel } from "@/components/payment-statements/payment-statement-panel";
import { TimesheetCalendarForm } from "@/components/timesheets/timesheet-calendar-form";
import { TimesheetEntryList } from "@/components/timesheets/timesheet-entry-list";
import { TimesheetReviewForm } from "@/components/timesheets/timesheet-review-form";
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge";
import { TimesheetSubmitForm } from "@/components/timesheets/timesheet-submit-form";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { getPaymentStatementForTimesheet } from "@/lib/payment-statements/queries";
import { getAssignmentPeriodsForContractorProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateTime,
  formatHours,
  formatTimesheetMonth,
} from "@/lib/timesheets/format";
import {
  getTimesheetById,
  getTimesheetInvoiceLifecycle,
  getTimesheetReopenEvents,
} from "@/lib/timesheets/queries";

type TimesheetDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TimesheetDetailPage({
  params,
}: TimesheetDetailPageProps) {
  const profile = await requireCurrentProfile();
  const { id } = await params;
  const timesheet = await getTimesheetById(id);

  if (!timesheet) {
    notFound();
  }

  const contractor =
    profile.role === "contractor"
      ? await getContractorByProfileId(profile.id)
      : null;
  const isEditableByContractor =
    contractor?.id === timesheet.contractor_id &&
    ["draft", "rejected", "reopened"].includes(timesheet.status);
  const [paymentStatement, reopenEvents, invoiceLifecycle] = await Promise.all([
    getPaymentStatementForTimesheet(timesheet.id),
    getTimesheetReopenEvents(timesheet.id),
    getTimesheetInvoiceLifecycle(timesheet.id),
  ]);
  const assignmentPeriods = isEditableByContractor
    ? await getAssignmentPeriodsForContractorProject(
        timesheet.contractor_id,
        timesheet.project_id,
      )
    : [];
  let reopenedByLabel = timesheet.reopened_by
    ? "ANVEL administrator"
    : "Not set";

  if (profile.role === "admin" && timesheet.reopened_by) {
    const supabase = await createClient();
    const { data: reopenedBy } = await supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", timesheet.reopened_by)
      .maybeSingle<{ full_name: string; email: string }>();
    reopenedByLabel = reopenedBy
      ? `${reopenedBy.full_name} (${reopenedBy.email})`
      : "Administrator profile no longer available";
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <Link
          href="/timesheets"
          className="inline-flex min-h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-900 transition-colors hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        >
          Back to timesheets
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-teal-700">
              {timesheet.project?.name ?? "Unknown project"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
              {formatTimesheetMonth(timesheet.year, timesheet.month)}
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Monthly timesheet detail. Contractors record only days actually
              worked, with no mandatory task description.
            </p>
          </div>
          <TimesheetStatusBadge status={timesheet.status} />
        </div>
      </section>

      {isEditableByContractor ? (
        <>
          <TimesheetCalendarForm
            timesheetId={timesheet.id}
            year={timesheet.year}
            month={timesheet.month}
            entries={timesheet.entries}
            assignments={assignmentPeriods}
            comments={timesheet.comments}
          />
          <TimesheetSubmitForm
            timesheetId={timesheet.id}
            entryCount={timesheet.entry_count}
          />
        </>
      ) : null}

      {profile.role === "admin" ? (
        <TimesheetReviewForm
          timesheetId={timesheet.id}
          status={timesheet.status}
        />
      ) : null}

      <PaymentStatementPanel
        statement={paymentStatement}
        timesheetId={timesheet.id}
        timesheetStatus={timesheet.status}
        canGenerate={profile.role === "admin" && !paymentStatement}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Contractor</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {timesheet.contractor?.legal_name ?? "Unknown contractor"}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Project</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {timesheet.project?.client_label ?? "No client label"}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Total hours</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {formatHours(timesheet.total_hours)}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-600">Entries</p>
          <p className="mt-2 font-semibold text-neutral-950">
            {timesheet.entry_count}
          </p>
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Review state
        </h2>
        <dl className="mt-2 grid gap-x-6 md:grid-cols-2">
          <DetailField
            label="Submitted at"
            value={formatDateTime(timesheet.submitted_at)}
          />
          <DetailField
            label="Approved at"
            value={formatDateTime(timesheet.approved_at)}
          />
          <DetailField
            label="Rejected at"
            value={formatDateTime(timesheet.rejected_at)}
          />
          <DetailField
            label="Correction reason"
            value={timesheet.rejection_reason ?? "Not set"}
          />
          <DetailField
            label="Reopened at"
            value={formatDateTime(timesheet.reopened_at)}
          />
          <DetailField
            label="Reopened by"
            value={reopenedByLabel}
          />
          <DetailField
            label="Latest reopen reason"
            value={timesheet.reopen_reason ?? "Not set"}
          />
          <DetailField
            label="Comments"
            value={timesheet.comments ?? "No comments"}
          />
        </dl>
      </section>

      {reopenEvents.length > 0 ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            Reopen history
          </h2>
          <ul className="mt-3 divide-y divide-neutral-100">
            {reopenEvents.map((event) => (
              <li key={event.id} className="py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-neutral-950">
                    Reopened from {event.previous_status}
                  </span>
                  <span className="text-neutral-500">
                    {formatDateTime(event.reopened_at)}
                  </span>
                </div>
                <p className="mt-1 leading-6 text-neutral-700">{event.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {invoiceLifecycle.selfBilling.length > 0 ||
      invoiceLifecycle.outgoing.length > 0 ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            Related invoice lifecycle
          </h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {invoiceLifecycle.selfBilling.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-md border border-neutral-200 p-4 text-sm"
              >
                <p className="font-medium text-neutral-950">
                  Self-billing {invoice.invoice_number}
                </p>
                <p className="mt-1 capitalize text-neutral-600">
                  Status: {invoice.status.replaceAll("_", " ")}
                </p>
                {invoice.status === "cancelled" ? (
                  <>
                    <p className="mt-2 font-medium text-red-800">
                      This invoice is cancelled and no longer valid.
                    </p>
                    <p className="mt-1 text-neutral-600">
                      {invoice.cancellation_reason}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Cancellation email:{" "}
                      {invoice.cancellation_email_status.replaceAll("_", " ")}
                    </p>
                  </>
                ) : null}
              </div>
            ))}
            {profile.role === "admin"
              ? invoiceLifecycle.outgoing.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="rounded-md border border-neutral-200 p-4 text-sm"
                  >
                    <Link
                      href={`/outgoing-invoices/${invoice.id}`}
                      className="font-medium text-teal-800 hover:text-teal-950"
                    >
                      Outgoing {invoice.invoice_number}
                    </Link>
                    <p className="mt-1 capitalize text-neutral-600">
                      Status: {invoice.status.replaceAll("_", " ")}
                    </p>
                    {invoice.status === "cancelled" ? (
                      <>
                        <p className="mt-2 text-neutral-600">
                          {invoice.cancellation_reason}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Cancellation email:{" "}
                          {invoice.cancellation_email_status.replaceAll(
                            "_",
                            " ",
                          )}
                        </p>
                      </>
                    ) : null}
                  </div>
                ))
              : null}
          </div>
        </section>
      ) : null}

      <TimesheetEntryList
        entries={timesheet.entries}
        timesheetId={timesheet.id}
        editable={isEditableByContractor}
      />
    </div>
  );
}
