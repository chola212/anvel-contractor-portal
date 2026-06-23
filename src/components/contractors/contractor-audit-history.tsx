import {
  contractorStatusLabels,
  formatOptional,
  supplierTypeLabels,
  vatTreatmentLabels,
} from "@/lib/contractors/format";
import { formatDateTime } from "@/lib/timesheets/format";
import type { AuditLogRecord } from "@/lib/audit/types";
import type {
  ContractorStatus,
  SupplierType,
  VatTreatment,
} from "@/lib/contractors/types";

type ContractorAuditHistoryProps = {
  logs: AuditLogRecord[];
};

type ChangedField = {
  field: string;
  before: string;
  after: string;
};

const fieldLabels: Record<string, string> = {
  legal_name: "Legal name",
  trading_name: "Trading name",
  phone: "Phone",
  country: "Country",
  supplier_type: "Supplier type",
  company_registration_number: "Company registration number",
  vat_number: "VAT number",
  tax_number: "Tax number",
  fiscal_address: "Fiscal address",
  vat_treatment: "VAT treatment",
  status: "Status",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isContractorStatus(value: string): value is ContractorStatus {
  return value in contractorStatusLabels;
}

function isSupplierType(value: string): value is SupplierType {
  return value in supplierTypeLabels;
}

function isVatTreatment(value: string): value is VatTreatment {
  return value in vatTreatmentLabels;
}

function formatAuditValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value !== "string") {
    return String(value);
  }

  if (field === "status" && isContractorStatus(value)) {
    return contractorStatusLabels[value];
  }

  if (field === "supplier_type" && isSupplierType(value)) {
    return supplierTypeLabels[value];
  }

  if (field === "vat_treatment" && isVatTreatment(value)) {
    return vatTreatmentLabels[value];
  }

  return formatOptional(value);
}

function getChangedFields(metadata: Record<string, unknown> | null) {
  if (!metadata || !isRecord(metadata.before) || !isRecord(metadata.after)) {
    return [];
  }

  const before = metadata.before;
  const after = metadata.after;

  return Object.keys(fieldLabels).reduce<ChangedField[]>((changes, field) => {
    const beforeValue = before[field];
    const afterValue = after[field];

    if (beforeValue === afterValue) {
      return changes;
    }

    changes.push({
      field,
      before: formatAuditValue(field, beforeValue),
      after: formatAuditValue(field, afterValue),
    });

    return changes;
  }, []);
}

function actionLabel(action: string) {
  if (action === "contractor_created") {
    return "Contractor created";
  }

  if (action === "contractor_profile_updated") {
    return "Profile updated";
  }

  if (action === "contractor_self_profile_updated") {
    return "Contractor profile updated";
  }

  return action.replaceAll("_", " ");
}

function actorLabel(log: AuditLogRecord) {
  if (log.actor?.full_name) {
    return `${log.actor.full_name} (${log.actor.email})`;
  }

  if (log.actor?.email) {
    return log.actor.email;
  }

  return "Unknown actor";
}

export function ContractorAuditHistory({
  logs,
}: ContractorAuditHistoryProps) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Profile change history
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Admin-only audit history for contractor profile creation and
          non-bank profile updates.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="p-5 text-sm text-neutral-600">
          No contractor profile audit entries have been recorded yet.
        </p>
      ) : (
        <ol className="divide-y divide-neutral-200">
          {logs.map((log) => {
            const changedFields = getChangedFields(log.metadata);

            return (
              <li key={log.id} className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">
                      {actionLabel(log.action)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {actorLabel(log)}
                    </p>
                  </div>
                  <time className="text-xs font-medium text-neutral-500">
                    {formatDateTime(log.created_at)}
                  </time>
                </div>

                {changedFields.length > 0 ? (
                  <dl className="mt-4 grid gap-3 lg:grid-cols-2">
                    {changedFields.map((change) => (
                      <div
                        key={change.field}
                        className="rounded-md border border-neutral-200 bg-neutral-50 p-3"
                      >
                        <dt className="text-xs font-medium uppercase text-neutral-500">
                          {fieldLabels[change.field]}
                        </dt>
                        <dd className="mt-2 grid gap-2 text-sm text-neutral-800">
                          <span>
                            <span className="font-medium text-neutral-600">
                              From:
                            </span>{" "}
                            {change.before}
                          </span>
                          <span>
                            <span className="font-medium text-neutral-600">
                              To:
                            </span>{" "}
                            {change.after}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-neutral-600">
                    No field-level changes were stored for this entry.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
