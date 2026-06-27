import { notFound } from "next/navigation";

import { ContractorOperationalHeader } from "@/components/contractors/contractor-operational-header";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { OperationalFilterForm } from "@/components/filters/operational-filter-form";
import { requireRole } from "@/lib/auth/profile";
import { getContractorById } from "@/lib/contractors/queries";
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
type ContractorDocumentsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsInput>;
};

export default async function ContractorDocumentsPage({
  params,
  searchParams,
}: ContractorDocumentsPageProps) {
  const profile = await requireRole(["admin", "operations"]);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = {
    status: parseStatusFilter(resolvedSearchParams, documentStatuses),
    documentType: parseDocumentTypeFilter(resolvedSearchParams),
    uploadedMonth: parseUploadedMonthFilter(resolvedSearchParams),
  };
  const contractor = await getContractorById(id);

  if (!contractor) {
    notFound();
  }

  const [documents, documentRequirements] = await Promise.all([
    getDocumentsForContractor(contractor.id, filters),
    getDocumentRequirementsForContractor(contractor.supplier_type),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <ContractorOperationalHeader
        contractorId={contractor.id}
        contractorName={contractor.legal_name}
        sectionTitle="Documents"
        selectorHref="/documents"
        selectorLabel="Back to contractor selector"
      />
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
      {profile.role === "admin" ? (
        <DocumentUploadForm
          requirements={documentRequirements}
          contractors={[
            {
              id: contractor.id,
              legal_name: contractor.legal_name,
              email: contractor.email,
            },
          ]}
          mode="staff"
          selectedContractorId={contractor.id}
        />
      ) : null}
      <DocumentList
        documents={documents}
        mode="staff"
        showFileName={profile.role === "admin"}
        canDownload={profile.role === "admin"}
        canReview={profile.role === "admin"}
      />
    </div>
  );
}
