import { PaymentList } from "@/components/payments/payment-list";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import {
  getPaymentRowsForContractor,
  getPaymentRowsForStaff,
} from "@/lib/payments/queries";

export default async function PaymentsPage() {
  const profile = await requireCurrentProfile();
  const isContractor = profile.role === "contractor";
  const contractor = isContractor
    ? await getContractorByProfileId(profile.id)
    : null;
  const rows =
    isContractor && contractor
      ? await getPaymentRowsForContractor(contractor.id)
      : isContractor
        ? []
        : await getPaymentRowsForStaff();

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
          Manual payment status tracking for uploaded contractor invoices. This
          screen does not process bank payments, collect payment cards, or create
          self-billed invoices.
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
        <PaymentList
          rows={rows}
          mode={isContractor ? "contractor" : "staff"}
          canManage={profile.role === "admin"}
        />
      )}
    </div>
  );
}
