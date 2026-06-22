import { InvoiceList } from "@/components/invoices/invoice-list";
import { InvoiceUploadForm } from "@/components/invoices/invoice-upload-form";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import {
  getInvoicesForContractor,
  getInvoicesForStaff,
  getUploadableStatementsForContractor,
} from "@/lib/invoices/queries";

export default async function InvoicesPage() {
  const profile = await requireCurrentProfile();
  const isContractor = profile.role === "contractor";
  const contractor = isContractor
    ? await getContractorByProfileId(profile.id)
    : null;
  const invoices =
    isContractor && contractor
      ? await getInvoicesForContractor(contractor.id)
      : isContractor
        ? []
        : await getInvoicesForStaff();
  const uploadableStatements =
    isContractor && contractor
      ? await getUploadableStatementsForContractor(contractor.id)
      : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Invoices
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Official contractor invoice upload and metadata tracking. Admins can
          record manual review status before payment tracking.
        </p>
      </section>

      {isContractor && !contractor ? (
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            Contractor profile not found
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Your login is active, but no contractor profile is linked to this
            account yet. Invoice uploads are unavailable until a contractor
            record exists.
          </p>
        </section>
      ) : (
        <>
          {isContractor ? (
            <InvoiceUploadForm statements={uploadableStatements} />
          ) : null}
          <InvoiceList
            invoices={invoices}
            mode={isContractor ? "contractor" : "staff"}
            showFileName={profile.role === "admin" || profile.role === "contractor"}
            canDownload={profile.role === "admin" || profile.role === "contractor"}
            canReview={profile.role === "admin"}
          />
        </>
      )}
    </div>
  );
}
