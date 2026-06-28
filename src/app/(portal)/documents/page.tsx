import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { ContractorOperationalSelector } from "@/components/contractors/contractor-operational-selector";
import { OperationalFilterForm } from "@/components/filters/operational-filter-form";
import { requireCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { getContractorsForStaff } from "@/lib/contractors/queries";
import {
  getDocumentRequirementsForContractor,
  getDocumentsForContractor,
} from "@/lib/documents/queries";
import { getDocumentRequirementFilterOptions } from "@/lib/documents/requirements";
import {
  parseDocumentTypeFilter,
  parseStatusFilter,
  parseUploadedMonthFilter,
  type SearchParamsInput,
} from "@/lib/filters/search-params";

const documentStatuses = [
  "missing",
  "uploaded",
  "approved",
  "rejected",
  "expired",
] as const;
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const profile = await requireCurrentProfile();
  const resolvedSearchParams = await searchParams;
  const filters = {
    status: parseStatusFilter(resolvedSearchParams, documentStatuses),
    documentType: parseDocumentTypeFilter(resolvedSearchParams),
    uploadedMonth: parseUploadedMonthFilter(resolvedSearchParams),
  };
  const isContractor = profile.role === "contractor";
  const contractor = isContractor
    ? await getContractorByProfileId(profile.id)
    : null;
  const documents =
    isContractor && contractor
      ? await getDocumentsForContractor(contractor.id, filters)
      : [];
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
          Upload and review documents.
        </p>
      </section>

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
      {!isContractor ? (
        <ContractorOperationalSelector
          contractors={await getContractorsForStaff()}
          section="documents"
        />
      ) : (
        <>
        <OperationalFilterForm
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              value: filters.status,
              options: documentStatuses.map((status) => ({
                value: status,
                label: status.replace(/_/g, " "),
              })),
            },
            {
              name: "documentType",
              label: "Document type",
              type: "select",
              value: filters.documentType,
              options: getDocumentRequirementFilterOptions(
                documentRequirements,
              ),
            },
            {
              name: "uploadedMonth",
              label: "Uploaded month",
              type: "month",
              value: filters.uploadedMonth,
            },
          ]}
        />
        <DocumentList
          documents={documents}
          mode="contractor"
          showFileName
          canDownload
          canReview={false}
        />
        </>
      )}
    </div>
  );
}
