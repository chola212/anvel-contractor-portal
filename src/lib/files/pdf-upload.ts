export const maxPdfUploadSizeBytes = 10 * 1024 * 1024;

export type PdfUploadValidationResult = {
  file: File | null;
  error: string | null;
};

export async function validatePdfUploadFile({
  value,
  emptyMessage,
}: {
  value: FormDataEntryValue | null;
  emptyMessage: string;
}): Promise<PdfUploadValidationResult> {
  if (!(value instanceof File) || value.size === 0) {
    return {
      file: null,
      error: emptyMessage,
    };
  }

  if (value.size > maxPdfUploadSizeBytes) {
    return {
      file: null,
      error: "PDF files must be 10 MB or smaller.",
    };
  }

  if (value.type !== "application/pdf" || !value.name.toLowerCase().endsWith(".pdf")) {
    return {
      file: null,
      error: "Only PDF files are accepted.",
    };
  }

  const header = Buffer.from(await value.slice(0, 5).arrayBuffer()).toString("ascii");
  if (header !== "%PDF-") {
    return {
      file: null,
      error: "Only valid PDF files are accepted.",
    };
  }

  return {
    file: value,
    error: null,
  };
}
