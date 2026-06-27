type SelfBillingPdfInput = {
  invoiceNumber: string;
  invoiceDate: string;
  contractorLegalName: string;
  contractorEmail: string;
  contractorVatNumber: string | null;
  contractorTaxNumber: string | null;
  projectName: string;
  monthLabel: string;
  totalHours: string;
  hourlyRate: string;
  netAmount: string;
  vatTreatment: string;
  vatAmount: string;
  grossAmount: string;
  currency: string;
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function line(text: string, x: number, y: number, size = 10) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

export function createSelfBillingInvoicePdf(input: SelfBillingPdfInput) {
  const lines = [
    line("Self-billing invoice", 72, 760, 18),
    line("ANVEL / ERP Utilities Consulting Services Ltd.", 72, 735, 11),
    line("Email: contact@anvelconsulting.com", 72, 719, 10),
    line(`Invoice number: ${input.invoiceNumber}`, 72, 690, 11),
    line(`Invoice date: ${input.invoiceDate}`, 72, 674, 11),
    line(`Contractor: ${input.contractorLegalName}`, 72, 640, 11),
    line(`Contractor email: ${input.contractorEmail}`, 72, 624, 10),
    line(`VAT number: ${input.contractorVatNumber ?? "Not provided"}`, 72, 608, 10),
    line(`Tax number: ${input.contractorTaxNumber ?? "Not provided"}`, 72, 592, 10),
    line(`Project: ${input.projectName}`, 72, 560, 11),
    line(`Timesheet month: ${input.monthLabel}`, 72, 544, 10),
    line(`Total hours: ${input.totalHours}`, 72, 512, 10),
    line(`Hourly rate: ${input.hourlyRate}`, 72, 496, 10),
    line(`Net amount: ${input.netAmount}`, 72, 464, 10),
    line(`VAT treatment: ${input.vatTreatment}`, 72, 448, 10),
    line(`VAT amount: ${input.vatAmount}`, 72, 432, 10),
    line(`Gross amount: ${input.grossAmount}`, 72, 416, 12),
    line(`Currency: ${input.currency}`, 72, 400, 10),
    line(
      "This self-billing invoice was generated from an approved contractor timesheet.",
      72,
      360,
      9,
    ),
  ];
  const stream = lines.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, "binary"));
}
