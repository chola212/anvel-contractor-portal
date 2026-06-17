import Link from "next/link";

import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import {
  formatDate,
  formatDocumentType,
  formatFileSize,
} from "@/lib/documents/format";
import type { ContractorDocument } from "@/lib/documents/types";

type DocumentListProps = {
  documents: ContractorDocument[];
  mode: "staff" | "contractor";
  showFileName: boolean;
};

export function DocumentList({
  documents,
  mode,
  showFileName,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          No document metadata found
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Document records will appear here after fake development document
          metadata is created. Do not upload real contractor documents outside
          production.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-950">
          Contractor documents
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Metadata only. File download and upload actions are intentionally
          disabled until private storage policies are applied.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              {mode === "staff" ? (
                <th scope="col" className="px-5 py-3 font-medium">
                  Contractor
                </th>
              ) : null}
              <th scope="col" className="px-5 py-3 font-medium">
                Document
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                File
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Expiry
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Access
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {documents.map((document) => (
              <tr key={document.id}>
                {mode === "staff" ? (
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/contractors/${document.contractor_id}`}
                      className="font-medium text-teal-800 hover:text-teal-950"
                    >
                      {document.contractor?.legal_name ?? "Unknown contractor"}
                    </Link>
                    <p className="mt-1 text-neutral-600">
                      {document.contractor?.email ?? "No email"}
                    </p>
                  </td>
                ) : null}
                <td className="px-5 py-4 align-top">
                  <p className="font-medium text-neutral-950">
                    {document.requirement?.name ??
                      formatDocumentType(document.document_type)}
                  </p>
                  <p className="mt-1 text-neutral-600">
                    {document.requirement?.is_required
                      ? "Required"
                      : "Optional"}
                  </p>
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  <p>{showFileName ? document.file_name : "Hidden for this role"}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatFileSize(document.file_size_bytes)}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <DocumentStatusBadge status={document.status} />
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  {formatDate(document.expiry_date)}
                </td>
                <td className="px-5 py-4 align-top text-neutral-700">
                  Signed download not enabled yet
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
