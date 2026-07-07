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

function chunkInvoiceLines<T>(lines: T[]) {
  const chunks: T[][] = [lines.slice(0, 10)];
  let remaining = lines.slice(10);

  while (remaining.length > 16) {
    const lineCount = Math.min(28, remaining.length - 16);
    chunks.push(remaining.slice(0, lineCount));
    remaining = remaining.slice(lineCount);
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
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
  fallback: string,
) {
  const explicitLine1 = cleanAddressLine(line1);
  const explicitLine2 = cleanAddressLine(line2);
  const fallbackLines = fallback
    .split(/\r?\n/)
    .map(cleanAddressLine)
    .filter((line): line is string => Boolean(line));
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

function periodLabel(invoice: OutgoingInvoiceDetail) {
  if (invoice.period_label?.trim()) return invoice.period_label.trim();
  if (invoice.invoice_source === "manual") return "";
  if (invoice.month >= 1 && invoice.month <= 12) {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(invoice.year, invoice.month - 1, 1)));
  }
  return "";
}

function renderLineTable({
  lines,
  tableTopY,
  firstRowY,
}: {
  lines: OutgoingInvoiceDetail["lines"];
  tableTopY: number;
  firstRowY: number;
}) {
  const rowHeight = 18;
  const tableBottomY = firstRowY - lines.length * rowHeight - 8;
  const commands = [
    box(45, tableBottomY, 505, tableTopY - tableBottomY),
    "0.09 0.35 0.33 rg",
    box(45, tableTopY - 24, 505, 24, true),
    "0 0 0 rg",
    text("Description", 55, tableTopY - 16, 8, true),
    right("Quantity", 375, tableTopY - 16, 8, true),
    right("Unit", 425, tableTopY - 16, 8, true),
    right("Rate", 482, tableTopY - 16, 8, true),
    right("Net", 540, tableTopY - 16, 8, true),
  ];

  lines.forEach((line, index) => {
    const rowY = firstRowY - index * rowHeight;
    const descriptionLines = wrapDescription(line.description, 46);
    descriptionLines.forEach((value, descriptionIndex) => {
      commands.push(text(value, 55, rowY - descriptionIndex * 8, 7));
    });
    commands.push(
      right(Number(line.quantity).toFixed(2), 375, rowY, 8),
      right(line.unit_label, 425, rowY, 8),
      right(Number(line.unit_rate).toFixed(2), 482, rowY, 8),
      right(money(line.net_amount), 540, rowY, 8),
    );
  });

  return { commands, tableBottomY };
}

function vatLabel(invoice: OutgoingInvoiceDetail) {
  return invoice.vat_treatment === "cyprus_vat_19"
    ? "VAT (19%)"
    : invoice.vat_treatment === "eu_reverse_charge_0"
      ? "VAT (0% - reverse charge)"
      : invoice.vat_treatment === "non_eu_outside_scope"
        ? "VAT (outside scope)"
        : "VAT (manual review)";
}

function renderTotals(invoice: OutgoingInvoiceDetail, lineSubtotal: number, boxY: number) {
  const vatAmount = Number(invoice.vat_rate) > 0
    ? Math.round(lineSubtotal * Number(invoice.vat_rate)) / 100
    : 0;
  const grossAmount = lineSubtotal + vatAmount;
  return [
    box(330, boxY, 220, 105, true),
    "0 0 0 rg",
    text("Subtotal", 345, boxY + 80, 9),
    right(money(lineSubtotal), 535, boxY + 80, 9),
    text(vatLabel(invoice), 345, boxY + 56, 9),
    right(money(vatAmount), 535, boxY + 56, 9),
    rule(345, boxY + 41, 535, boxY + 41),
    text("TOTAL DUE", 345, boxY + 16, 11, true),
    right(money(grossAmount), 535, boxY + 16, 11, true),
  ];
}

function renderPaymentDetails(invoice: OutgoingInvoiceDetail, startY: number) {
  return [
    text("NOTES", 55, startY, 9, true),
    text(
      invoice.billing_invoice_notes ??
        invoice.company_invoice_notes ??
        "Payment is due within 30 calendar days.",
      55,
      startY - 18,
      8,
    ),
    text("BANK DETAILS", 55, startY - 60, 9, true),
    text(`Bank: ${invoice.company_bank_name}`, 55, startY - 78, 8),
    text(`Account name: ${invoice.company_bank_account_name}`, 55, startY - 94, 8),
    text(`IBAN: ${invoice.company_iban}`, 55, startY - 110, 8),
    text(`SWIFT/BIC: ${invoice.company_swift_bic}`, 55, startY - 126, 8),
  ];
}

function buildPdf(pages: string[][]) {
  const pageCount = pages.length;
  const fontRegularId = 3 + pageCount;
  const fontBoldId = 4 + pageCount;
  const firstContentId = 5 + pageCount;
  const pageIds = Array.from({ length: pageCount }, (_, index) => 3 + index);
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    `2 0 obj << /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >> endobj`,
    ...pageIds.map((pageId, index) =>
      `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${firstContentId + index} 0 R >> endobj`
    ),
    `${fontRegularId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
    `${fontBoldId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj`,
    ...pages.map((commands, index) => {
      const stream = commands.join("\n");
      return `${firstContentId + index} 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`;
    }),
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

export function createOutgoingInvoicePdf(invoice: OutgoingInvoiceDetail) {
  const invoiceLines = invoice.lines.length > 0
    ? invoice.lines
    : [{
      id: "missing-line",
      outgoing_invoice_id: invoice.id,
      description: "Consultancy fees",
      quantity: invoice.quantity,
      unit_label: invoice.unit_label,
      unit_rate: invoice.sales_rate,
      net_amount: invoice.net_amount,
      sort_order: 1,
      created_at: invoice.created_at,
    }];
  const invoicePeriodLabel = periodLabel(invoice);
  const companyAddressLines = addressBlockLines(
    addressLines(
      invoice.company_address_line_1,
      invoice.company_address_line_2,
      invoice.company_address,
    ),
    locationLine(invoice.company_city_region, invoice.company_country),
  );
  const billingAddressLines = addressBlockLines(
    addressLines(
      invoice.billing_address_line_1,
      invoice.billing_address_line_2,
      invoice.billing_address,
    ),
    invoice.billing_country,
  );
  const companyVatY = 677 - companyAddressLines.length * 14;
  const billingVatY = 677 - billingAddressLines.length * 14;
  const lineSubtotal = invoiceLines.reduce(
    (total, line) => total + Number(line.net_amount),
    0,
  );
  const chunks = chunkInvoiceLines(invoiceLines);
  const firstTable = renderLineTable({
    lines: chunks[0],
    tableTopY: 534,
    firstRowY: 492,
  });
  const firstPage = [
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
    ...renderLines(companyAddressLines, 55, 677),
    text(`VAT No.: ${invoice.company_vat_number}`, 55, companyVatY),
    text("INVOICE TO", 320, 710, 9, true),
    text(invoice.billing_legal_name, 320, 692, 10, true),
    ...renderLines(billingAddressLines, 320, 677),
    text(`VAT No.: ${invoice.billing_vat_number}`, 320, billingVatY),
    rule(45, 630, 550, 630),
    box(45, 552, 505, 62, true),
    "0 0 0 rg",
    text("Project", 58, 596, 8, true),
    text(invoice.project_name, 58, 579),
    text("Consultant", 300, 596, 8, true),
    text(invoice.consultant_name, 300, 579),
    text("Period", 405, 596, 8, true),
    text(invoicePeriodLabel, 405, 579),
    text("Currency", 500, 596, 8, true),
    text("EUR", 500, 579),
    ...(invoice.po_reference
      ? [text(`PO reference: ${invoice.po_reference}`, 58, 560, 8)]
      : []),
    ...firstTable.commands,
    ...(chunks.length === 1
      ? [
        ...renderTotals(invoice, lineSubtotal, Math.min(320, firstTable.tableBottomY - 113)),
        ...renderPaymentDetails(invoice, Math.min(295, firstTable.tableBottomY - 138)),
      ]
      : [text("Continued on next page", 55, firstTable.tableBottomY - 24, 8, true)]),
    rule(45, 28, 550, 28),
    text(
      `${invoice.company_legal_name} | VAT No. ${invoice.company_vat_number}`,
      55,
      12,
      8,
    ),
    right(`Total due: ${money(lineSubtotal + (Number(invoice.vat_rate) > 0 ? Math.round(lineSubtotal * Number(invoice.vat_rate)) / 100 : 0))}`, 540, 12, 9, true),
  ];
  const pages = [firstPage];

  chunks.slice(1).forEach((chunk, chunkIndex) => {
    const isLastPage = chunkIndex === chunks.length - 2;
    const table = renderLineTable({
      lines: chunk,
      tableTopY: 700,
      firstRowY: 658,
    });
    pages.push([
      text("INVOICE CONTINUED", 55, 780, 18, true),
      right(invoice.invoice_number, 540, 784, 12, true),
      text(invoice.billing_legal_name, 55, 755, 9),
      ...table.commands,
      ...(isLastPage
        ? [
          ...renderTotals(invoice, lineSubtotal, Math.min(245, table.tableBottomY - 113)),
          ...renderPaymentDetails(invoice, Math.min(220, table.tableBottomY - 138)),
        ]
        : [text("Continued on next page", 55, table.tableBottomY - 24, 8, true)]),
      rule(45, 28, 550, 28),
      text(
        `${invoice.company_legal_name} | VAT No. ${invoice.company_vat_number}`,
        55,
        12,
        8,
      ),
      right(`Total due: ${money(lineSubtotal + (Number(invoice.vat_rate) > 0 ? Math.round(lineSubtotal * Number(invoice.vat_rate)) / 100 : 0))}`, 540, 12, 9, true),
    ]);
  });

  return buildPdf(pages);
}
