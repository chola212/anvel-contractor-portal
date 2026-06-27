import { PaymentList } from "@/components/payments/payment-list";
import { ContractorOperationalSelector } from "@/components/contractors/contractor-operational-selector";
import { OperationalFilterForm } from "@/components/filters/operational-filter-form";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { getContractorsForStaff } from "@/lib/contractors/queries";
import {
  parseMonthRangeFilters,
  parseStatusFilter,
  type SearchParamsInput,
} from "@/lib/filters/search-params";
import { getPaymentRowsForContractor } from "@/lib/payments/queries";

const paymentStatuses = ["pending", "approved", "paid", "on_hold"] as const;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const profile = await requireCurrentProfile();
  const resolvedSearchParams = await searchParams;
  const filters = {
    ...parseMonthRangeFilters(resolvedSearchParams),
    status: parseStatusFilter(resolvedSearchParams, paymentStatuses),
  };
  const isContractor = profile.role === "contractor";
  const contractor = isContractor
    ? await getContractorByProfileId(profile.id)
    : null;
  const rows =
    isContractor && contractor
      ? await getPaymentRowsForContractor(contractor.id, filters)
      : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Payments
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Manual payment status tracking for self-billing and optional manual
          invoices. This screen does not process bank payments or collect
          payment cards.
        </p>
      </section>

      {isContractor && !contractor ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            Contractor profile not found
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Your login is active, but no contractor profile is linked to this
            account yet. Payment status is unavailable until a contractor record
            exists.
          </p>
        </section>
      ) : (
        isContractor ? (
          <>
            <OperationalFilterForm
              fields={[
                { name: "month", label: "Invoice month", type: "month", value: filters.month },
                { name: "from", label: "From month", type: "month", value: filters.from },
                { name: "to", label: "To month", type: "month", value: filters.to },
                {
                  name: "status",
                  label: "Payment status",
                  type: "select",
                  value: filters.status,
                  options: paymentStatuses.map((status) => ({
                    value: status,
                    label: status.replace(/_/g, " "),
                  })),
                },
              ]}
            />
            <PaymentList rows={rows} mode="contractor" canManage={false} />
          </>
        ) : (
          <ContractorOperationalSelector
            contractors={await getContractorsForStaff()}
            section="payments"
          />
        )
      )}
    </div>
  );
}
