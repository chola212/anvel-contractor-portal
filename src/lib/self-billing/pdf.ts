import type { VatTreatment } from "@/lib/contractors/types";

type SelfBillingPdfInput = {
  invoiceNumber: string;
  invoiceDate: string;
  contractorLegalName: string;
  contractorEmail: string;
  contractorAddress: string | null;
  contractorAddressLine1: string | null;
  contractorAddressLine2: string | null;
  contractorCountry: string | null;
  contractorVatNumber: string | null;
  companyLegalName: string;
  companyTradingName: string | null;
  companyAddress: string;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  companyCityRegion: string | null;
  companyCountry: string;
  companyVatNumber: string;
  projectName: string;
  contractorName: string;
  monthLabel: string;
  timesheetReference: string;
  quantity: number | string;
  unitLabel: string;
  hourlyRate: number | string;
  netAmount: number | string;
  vatTreatment: VatTreatment;
  vatAmount: number | string;
  grossAmount: number | string;
  currency: string;
};

function pdfText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function text(value: string, x: number, y: number, size = 9, bold = false) {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`;
}

function rule(x1: number, y1: number, x2: number, y2: number, width = 0.6) {
  return `${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function box(x: number, y: number, width: number, height: number, fill = false) {
  return `${fill ? "0.94 0.96 0.96 rg " : ""}${x} ${y} ${width} ${height} re ${fill ? "B" : "S"}`;
}

function right(value: string, rightX: number, y: number, size = 9, bold = false) {
  const approximateWidth = value.length * size * 0.52;
  return text(value, rightX - approximateWidth, y, size, bold);
}

function money(value: number | string, currency: string) {
  return `${Number(value).toFixed(2)} ${currency}`;
}

function wrapText(value: string, maxLength = 54, maxLines = 2) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function vatLabel(vatTreatment: VatTreatment) {
  return vatTreatment === "cyprus_vat_19"
    ? "VAT (19%)"
    : vatTreatment === "eu_reverse_charge"
      ? "VAT (0% - reverse charge)"
      : vatTreatment === "non_eu_accountant_review"
        ? "VAT (accountant review)"
        : "VAT (accountant review required)";
}

function cleanAddressLine(value: string | null | undefined) {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function appendUniqueLine(lines: string[], value: string | null | undefined) {
  const cleaned = cleanAddressLine(value);
  if (!cleaned) return;
  const normalized = cleaned.toLowerCase();
  if (!lines.some((line) => line.toLowerCase() === normalized)) {
    lines.push(cleaned);
  }
}

function splitLongAddressLine(value: string, maxLength = 42) {
  if (value.length <= maxLength) return [value];

  const words = value.split(/\s+/);
  let firstLine = "";
  const secondLineWords: string[] = [];

  for (const word of words) {
    if (secondLineWords.length > 0) {
      secondLineWords.push(word);
      continue;
    }

    const next = firstLine ? `${firstLine} ${word}` : word;
    if (next.length > maxLength && firstLine) {
      secondLineWords.push(word);
    } else if (next.length > maxLength) {
      firstLine = word.slice(0, maxLength);
      secondLineWords.push(word.slice(maxLength));
    } else {
      firstLine = next;
    }
  }

  return [firstLine, secondLineWords.join(" ")]
    .map(cleanAddressLine)
    .filter((line): line is string => Boolean(line))
    .slice(0, 2);
}

function addressLines(
  line1: string | null | undefined,
  line2: string | null | undefined,
  fallback: string | null,
) {
  const fallbackLines = (fallback ?? "")
    .split(/\r?\n/)
    .map(cleanAddressLine)
    .filter((line): line is string => Boolean(line));
  const explicitLine1 = cleanAddressLine(line1);
  const explicitLine2 = cleanAddressLine(line2);
  const lines: string[] = [];

  if (explicitLine1 || explicitLine2) {
    const firstLineParts =
      explicitLine1 && !explicitLine2
        ? splitLongAddressLine(explicitLine1)
        : explicitLine1
          ? [explicitLine1]
          : [];
    firstLineParts.forEach((line) => appendUniqueLine(lines, line));
    appendUniqueLine(lines, explicitLine2);
  } else if (fallbackLines.length === 1) {
    splitLongAddressLine(fallbackLines[0]).forEach((line) =>
      appendUniqueLine(lines, line),
    );
  } else {
    fallbackLines.forEach((line) => appendUniqueLine(lines, line));
  }

  return lines.slice(0, 2);
}

function locationLine(...parts: Array<string | null | undefined>) {
  const line = parts.map(cleanAddressLine).filter(Boolean).join(", ");
  return line || null;
}

function addressBlockLines(
  lines: string[],
  location: string | null | undefined,
) {
  const blockLines: string[] = [];
  lines.forEach((line) => appendUniqueLine(blockLines, line));
  appendUniqueLine(blockLines, location);
  return blockLines;
}

function renderLines(lines: string[], x: number, startY: number, lineHeight = 14) {
  return lines.map((line, index) => text(line, x, startY - index * lineHeight));
}

export function createSelfBillingInvoicePdf(input: SelfBillingPdfInput) {
  const descriptionLines = wrapText(
    `Consultancy services - ${input.contractorName} - ${input.projectName} - ${input.monthLabel}`,
  );
  const noteLines = wrapText(
    "This self-billing invoice was generated by ERP Utilities Consulting Services LTD under a self-billing arrangement based on the approved contractor timesheet.",
    86,
    3,
  );
  const supplierAddressLines = addressBlockLines(
    addressLines(
      input.contractorAddressLine1,
      input.contractorAddressLine2,
      input.contractorAddress,
    ),
    input.contractorCountry,
  );
  const customerAddressLines = addressBlockLines(
    addressLines(
      input.companyAddressLine1,
      input.companyAddressLine2,
      input.companyAddress,
    ),
    locationLine(input.companyCityRegion, input.companyCountry),
  );
  const supplierVatY = 666 - supplierAddressLines.length * 12;
  const customerVatY = 677 - customerAddressLines.length * 14;
  const supplierVat = input.contractorVatNumber
    ? [`VAT No.: ${input.contractorVatNumber}`]
    : [];

  const commands = [
    "0.09 0.35 0.33 rg",
    box(45, 742, 505, 65, true),
    "0 0 0 rg",
    text("SELF-BILLING INVOICE", 62, 775, 21, true),
    text(input.companyTradingName ?? input.companyLegalName, 62, 755, 10),
    right(input.invoiceNumber, 530, 778, 13, true),
    right(`Invoice date: ${input.invoiceDate}`, 530, 760, 9),
    right(`Total due: ${money(input.grossAmount, input.currency)}`, 530, 746, 9, true),
    text("FROM / SUPPLIER", 55, 710, 9, true),
    text(input.contractorLegalName, 55, 692, 10, true),
    text(`Email: ${input.contractorEmail}`, 55, 678),
    ...renderLines(supplierAddressLines, 55, 666, 12),
    ...supplierVat.map((value, index) => text(value, 55, supplierVatY - index * 14)),
    text("INVOICE TO / CUSTOMER", 320, 710, 9, true),
    text(input.companyLegalName, 320, 692, 10, true),
    ...renderLines(customerAddressLines, 320, 677),
    text(`VAT No.: ${input.companyVatNumber}`, 320, customerVatY),
    rule(45, 618, 550, 618),
    box(45, 552, 505, 62, true),
    "0 0 0 rg",
    text("Project", 58, 596, 8, true),
    text(input.projectName, 58, 579),
    text("Consultant / contractor", 248, 596, 8, true),
    text(input.contractorName, 248, 579),
    text("Period", 405, 596, 8, true),
    text(input.monthLabel, 405, 579),
    text("Currency", 500, 596, 8, true),
    text(input.currency, 500, 579),
    text(`Timesheet reference: ${input.timesheetReference}`, 58, 560, 8),
    box(45, 428, 505, 106),
    "0.09 0.35 0.33 rg",
    box(45, 510, 505, 24, true),
    "0 0 0 rg",
    text("Description", 55, 518, 8, true),
    right("Quantity", 375, 518, 8, true),
    right("Unit", 425, 518, 8, true),
    right("Rate", 482, 518, 8, true),
    right("Net", 540, 518, 8, true),
    ...descriptionLines.map((value, index) =>
      text(value, 55, 492 - index * 16, 7.5),
    ),
    right(Number(input.quantity).toFixed(2), 375, 486, 8),
    right(input.unitLabel, 425, 486, 8),
    right(Number(input.hourlyRate).toFixed(2), 482, 486, 8),
    right(money(input.netAmount, input.currency), 540, 486, 8),
    rule(45, 465, 550, 465),
    box(330, 320, 220, 105, true),
    "0 0 0 rg",
    text("Subtotal", 345, 400, 9),
    right(money(input.netAmount, input.currency), 535, 400, 9),
    text(vatLabel(input.vatTreatment), 345, 376, 9),
    right(money(input.vatAmount, input.currency), 535, 376, 9),
    rule(345, 361, 535, 361),
    text("TOTAL DUE", 345, 336, 11, true),
    right(money(input.grossAmount, input.currency), 535, 336, 11, true),
    text("NOTES", 55, 295, 9, true),
    ...noteLines.map((value, index) => text(value, 55, 277 - index * 14, 8)),
    rule(45, 145, 550, 145),
    text(
      `${input.contractorLegalName}${input.contractorVatNumber ? ` | VAT No. ${input.contractorVatNumber}` : ""}`,
      55,
      127,
      8,
    ),
    right(`Total due: ${money(input.grossAmount, input.currency)}`, 540, 127, 9, true),
  ];
  const stream = commands.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    `6 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "binary"));
}
