import { DocumentList } from "@/components/documents/document-list";
import { DocumentStorageChecklist } from "@/components/documents/document-storage-checklist";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import {
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
          Read-only document metadata for private contractor documents. Uploads,
          reviews, and signed downloads are added only after storage policies
          are applied to the development Supabase project.
        </p>
      </section>

      <DocumentStorageChecklist />
      <DocumentList
        documents={documents}
        mode={isContractor ? "contractor" : "staff"}
        showFileName={profile.role === "admin" || profile.role === "contractor"}
      />
    </div>
  );
}
