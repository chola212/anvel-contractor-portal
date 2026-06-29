import Link from "next/link";

import type { ContractorOnboardingDocument } from "@/lib/onboarding/types";

type OnboardingDocumentHistoryProps = {
  documents: ContractorOnboardingDocument[];
};

function labelForDocumentType(value: string) {
  if (value === "framework_agreement") return "Framework Agreement";
  if (value === "assignment_schedule") return "Assignment Schedule";
  if (value === "nda_data_protection") return "NDA / Data Protection";
  return value;
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function OnboardingDocumentHistory({
  documents,
}: OnboardingDocumentHistoryProps) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-5">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-neutral-500">Internal archive</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-950">
          Sent onboarding documents
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Admin-only copies of generated PDFs. Contractors do not access this
          storage area through the portal.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
          No onboarding documents have been generated yet.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Document</th>
                <th className="px-3 py-3 font-semibold">Contractor</th>
                <th className="px-3 py-3 font-semibold">Sent to</th>
                <th className="px-3 py-3 font-semibold">Sent</th>
                <th className="px-3 py-3 font-semibold">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="px-3 py-3 font-medium text-neutral-900">
                    {labelForDocumentType(document.document_type)}
                  </td>
                  <td className="px-3 py-3 text-neutral-700">
                    {document.contractor?.legal_name ?? "Unlinked"}
                  </td>
                  <td className="px-3 py-3 text-neutral-700">
                    {document.sent_to}
                  </td>
                  <td className="px-3 py-3 text-neutral-700">
                    {formatDateTime(document.sent_at)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/onboarding/documents/${document.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-teal-800 hover:text-teal-950"
                    >
                      Download PDF
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
