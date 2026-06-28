import type { OutgoingInvoiceDetail } from "./types";

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

function money(value: number | string) {
  return `${Number(value).toFixed(2)} EUR`;
}

function wrapDescription(value: string, maxLength = 54) {
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
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function splitAddressLines(
  line1: string | null | undefined,
  line2: string | null | undefined,
  fallback: string,
) {
  const fallbackLines = fallback.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return [
    line1?.trim() || fallbackLines[0] || fallback,
    line2?.trim() || fallbackLines.slice(1).join(", "),
  ].filter(Boolean);
}

export function createOutgoingInvoicePdf(invoice: OutgoingInvoiceDetail) {
  const line = invoice.lines[0];
  const companyAddressLines = splitAddressLines(
    invoice.company_address_line_1,
    invoice.company_address_line_2,
    invoice.company_address,
  );
  const billingAddressLines = splitAddressLines(
    invoice.billing_address_line_1,
    invoice.billing_address_line_2,
    invoice.billing_address,
  );
  const descriptionLines = wrapDescription(
    line?.description ?? "Consultancy fees",
  );
  const vatLabel =
    invoice.vat_treatment === "cyprus_vat_19"
      ? "VAT (19%)"
      : invoice.vat_treatment === "eu_reverse_charge_0"
        ? "VAT (0% - reverse charge)"
        : invoice.vat_treatment === "non_eu_outside_scope"
          ? "VAT (outside scope)"
          : "VAT (manual review)";
  const commands = [
    "0.09 0.35 0.33 rg",
    box(45, 742, 505, 65, true),
    "0 0 0 rg",
    text("INVOICE", 62, 775, 24, true),
    text(invoice.company_trading_name ?? invoice.company_legal_name, 62, 755, 10),
    right(invoice.invoice_number, 530, 778, 13, true),
    right(`Invoice date: ${invoice.invoice_date}`, 530, 760, 9),
    right(`Due date: ${invoice.due_date}`, 530, 746, 9),
    text("FROM", 55, 710, 9, true),
    text(invoice.company_legal_name, 55, 692, 10, true),
    text(companyAddressLines[0] ?? "", 55, 677),
    ...(companyAddressLines[1] ? [text(companyAddressLines[1], 55, 663)] : []),
    text(
      [invoice.company_city_region, invoice.company_country].filter(Boolean).join(", "),
      55,
      companyAddressLines[1] ? 649 : 663,
    ),
    text(`VAT No.: ${invoice.company_vat_number}`, 55, companyAddressLines[1] ? 635 : 649),
    text("INVOICE TO", 320, 710, 9, true),
    text(invoice.billing_legal_name, 320, 692, 10, true),
    text(billingAddressLines[0] ?? "", 320, 677),
    ...(billingAddressLines[1] ? [text(billingAddressLines[1], 320, 663)] : []),
    text(invoice.billing_country, 320, billingAddressLines[1] ? 649 : 663),
    text(`VAT No.: ${invoice.billing_vat_number}`, 320, billingAddressLines[1] ? 635 : 649),
    rule(45, 630, 550, 630),
    box(45, 552, 505, 62, true),
    "0 0 0 rg",
    text("Project", 58, 596, 8, true),
    text(invoice.project_name, 58, 579),
    text("Consultant", 300, 596, 8, true),
    text(invoice.consultant_name, 300, 579),
    text("Period", 405, 596, 8, true),
    text(
      new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(invoice.year, invoice.month - 1, 1))),
      405,
      579,
    ),
    text("Currency", 500, 596, 8, true),
    text("EUR", 500, 579),
    ...(invoice.po_reference
      ? [text(`PO reference: ${invoice.po_reference}`, 58, 560, 8)]
      : []),
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
    right(Number(invoice.quantity).toFixed(2), 375, 486, 8),
    right(invoice.unit_label, 425, 486, 8),
    right(Number(invoice.sales_rate).toFixed(2), 482, 486, 8),
    right(money(invoice.net_amount), 540, 486, 8),
    rule(45, 465, 550, 465),
    box(330, 320, 220, 105, true),
    "0 0 0 rg",
    text("Subtotal", 345, 400, 9),
    right(money(invoice.net_amount), 535, 400, 9),
    text(vatLabel, 345, 376, 9),
    right(money(invoice.vat_amount), 535, 376, 9),
    rule(345, 361, 535, 361),
    text("TOTAL DUE", 345, 336, 11, true),
    right(money(invoice.gross_amount), 535, 336, 11, true),
    text("NOTES", 55, 295, 9, true),
    text(
      invoice.billing_invoice_notes ??
        invoice.company_invoice_notes ??
        "Payment is due within 30 calendar days.",
      55,
      277,
      8,
    ),
    text("BANK DETAILS", 55, 235, 9, true),
    text(`Bank: ${invoice.company_bank_name}`, 55, 217, 8),
    text(`Account name: ${invoice.company_bank_account_name}`, 55, 201, 8),
    text(`IBAN: ${invoice.company_iban}`, 55, 185, 8),
    text(`SWIFT/BIC: ${invoice.company_swift_bic}`, 55, 169, 8),
    rule(45, 145, 550, 145),
    text(
      `${invoice.company_legal_name} | VAT No. ${invoice.company_vat_number}`,
      55,
      127,
      8,
    ),
    right(`Total due: ${money(invoice.gross_amount)}`, 540, 127, 9, true),
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
