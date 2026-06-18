import { DocumentList } from "@/components/documents/document-list";
import { DocumentStorageChecklist } from "@/components/documents/document-storage-checklist";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import {
  getDocumentRequirementsForContractor,
  getDocumentsForContractor,
  getDocumentsForStaff,
} from "@/lib/documents/queries";

export default async function DocumentsPage() {
  const profile = await requireCurrentProfile();
  const isContractor = profile.role === "contractor";
  const contractor = isContractor
    ? await getContractorByProfileId(profile.id)
    : null;
  const documents =
    isContractor && contractor
      ? await getDocumentsForContractor(contractor.id)
      : isContractor
        ? []
        : await getDocumentsForStaff();
  const documentRequirements =
    isContractor && contractor
      ? await getDocumentRequirementsForContractor(contractor.supplier_type)
      : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Documents
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Private contractor document metadata and PDF upload. Review actions
          and signed downloads are added only after upload behaviour is tested
          with fake development files.
        </p>
      </section>

      <DocumentStorageChecklist />
      {isContractor ? (
        contractor ? (
          <DocumentUploadForm requirements={documentRequirements} />
        ) : (
          <section className="rounded-md border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold text-neutral-950">
              Contractor profile not found
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Your login is active, but no contractor profile is linked to this
              account yet. Uploads are disabled until a contractor record exists.
            </p>
          </section>
        )
      ) : null}
      <DocumentList
        documents={documents}
        mode={isContractor ? "contractor" : "staff"}
        showFileName={profile.role === "admin" || profile.role === "contractor"}
      />
    </div>
  );
}
