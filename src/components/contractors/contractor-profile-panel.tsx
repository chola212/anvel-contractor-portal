import { DetailField } from "@/components/contractors/detail-field";
import { StatusBadge } from "@/components/contractors/status-badge";
import {
  formatOptional,
  maskIban,
  supplierTypeLabels,
  vatTreatmentLabels,
} from "@/lib/contractors/format";
import type { ContractorRecord } from "@/lib/contractors/types";

type ContractorProfilePanelProps = {
  contractor: ContractorRecord;
  showSensitiveDetails: boolean;
};

export function ContractorProfilePanel({
  contractor,
  showSensitiveDetails,
}: ContractorProfilePanelProps) {
  const fiscalAddress = [
    contractor.fiscal_address_line_1 ?? contractor.fiscal_address,
    contractor.fiscal_address_line_2,
  ].filter(Boolean).join("\n");

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-md border border-neutral-200 bg-white p-5 xl:col-span-2">
        <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-teal-700">
              Contractor profile
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              {contractor.legal_name}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {formatOptional(contractor.email)}
            </p>
          </div>
          <StatusBadge status={contractor.status} />
        </div>

        <dl className="mt-2 grid gap-x-6 md:grid-cols-2">
          <DetailField
            label="Trading name"
            value={formatOptional(contractor.trading_name)}
          />
          <DetailField label="Country" value={formatOptional(contractor.country)} />
          <DetailField
            label="Supplier type"
            value={
              contractor.supplier_type
                ? supplierTypeLabels[contractor.supplier_type]
                : "Not provided"
            }
          />
          <DetailField label="Phone" value={formatOptional(contractor.phone)} />
          <DetailField
            label="Company registration"
            value={formatOptional(contractor.company_registration_number)}
          />
          <DetailField label="VAT number" value={formatOptional(contractor.vat_number)} />
          <DetailField label="Tax number" value={formatOptional(contractor.tax_number)} />
          <DetailField
            label="VAT treatment"
            value={
              contractor.vat_treatment
                ? vatTreatmentLabels[contractor.vat_treatment]
                : "Not provided"
            }
          />
        </dl>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Sensitive details
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Bank details are visible only to admins and edited through a
          dedicated audit flow. Fiscal details remain part of the profile
          workflow.
        </p>
        <dl className="mt-3">
          <DetailField
            label="Fiscal address"
            value={
              showSensitiveDetails
                ? formatOptional(fiscalAddress)
                : "Hidden for this role"
            }
          />
          <DetailField
            label="Bank account holder"
            value={
              showSensitiveDetails
                ? formatOptional(contractor.bank_account_holder)
                : "Hidden for this role"
            }
          />
          <DetailField
            label="IBAN"
            value={showSensitiveDetails ? maskIban(contractor.iban) : "Hidden for this role"}
          />
          <DetailField
            label="SWIFT/BIC"
            value={
              showSensitiveDetails
                ? formatOptional(contractor.swift_bic)
                : "Hidden for this role"
            }
          />
        </dl>
      </section>
    </div>
  );
}
