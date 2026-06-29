import { inflateSync, deflateSync } from "node:zlib";

import { anvelSignaturePngBase64 } from "./signature";
import type {
  GeneratedOnboardingDocument,
  OnboardingDocumentFormData,
} from "./types";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 52;
const RIGHT = 52;
const TOP = 58;
const BOTTOM = 58;

const forbiddenGeneratedTokens = [
  "XXXXX",
  "XX.XX",
  "{{",
  "}}",
  "undefined",
  "null",
  "Name client",
];

type PdfLine =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "spacer" }
  | { kind: "signature"; consultantName: string; consultantTitle: string; date: string };

type PngImage = {
  width: number;
  height: number;
  data: Buffer;
};

function normalizeText(value: string) {
  return value
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function pdfText(value: string) {
  return normalizeText(value)
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

function image(name: string, x: number, y: number, width: number, height: number) {
  return `q ${width} 0 0 ${height} ${x} ${y} cm /${name} Do Q`;
}

function wrap(value: string, maxChars: number) {
  const words = normalizeText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function fileDate(value: string) {
  return value.replaceAll("-", "");
}

function safeFilePart(value: string) {
  return normalizeText(value)
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "Consultant";
}

function assertNoForbiddenTokens(lines: PdfLine[]) {
  const body = lines
    .map((line) =>
      line.kind === "signature"
        ? `${line.consultantName} ${line.consultantTitle} ${line.date}`
        : "text" in line
          ? line.text
          : "",
    )
    .join("\n");
  const lowerBody = body.toLowerCase();
  const found = forbiddenGeneratedTokens.find((token) =>
    lowerBody.includes(token.toLowerCase()),
  );

  if (found) {
    throw new Error(`Generated onboarding document still contains forbidden token: ${found}`);
  }
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32BE(offset);
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(base64: string): PngImage {
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const png = Buffer.from(paddedBase64, "base64");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  while (offset < png.length) {
    const length = readUInt32(png, offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = readUInt32(data, 0);
      height = readUInt32(data, 4);
      const bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || ![0, 2, 6].includes(colorType)) {
        throw new Error("Unsupported ANVEL signature PNG format.");
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bytesPerPixel = channels;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const rawRows: Buffer[] = [];
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const source = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const row = Buffer.alloc(stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      const value = source[x];
      row[x] =
        filter === 0
          ? value
          : filter === 1
            ? (value + left) & 255
            : filter === 2
              ? (value + up) & 255
              : filter === 3
                ? (value + Math.floor((left + up) / 2)) & 255
                : (value + paeth(left, up, upLeft)) & 255;
    }

    rawRows.push(row);
    previous = row;
  }

  const rgb = Buffer.alloc(width * height * 3);
  let targetOffset = 0;
  for (const row of rawRows) {
    for (let x = 0; x < width; x += 1) {
      if (colorType === 6) {
        const start = x * 4;
        const alpha = row[start + 3] / 255;
        rgb[targetOffset] = Math.round(row[start] * alpha + 255 * (1 - alpha));
        rgb[targetOffset + 1] = Math.round(row[start + 1] * alpha + 255 * (1 - alpha));
        rgb[targetOffset + 2] = Math.round(row[start + 2] * alpha + 255 * (1 - alpha));
      } else if (colorType === 2) {
        row.copy(rgb, targetOffset, x * 3, x * 3 + 3);
      } else {
        const gray = row[x];
        rgb[targetOffset] = gray;
        rgb[targetOffset + 1] = gray;
        rgb[targetOffset + 2] = gray;
      }
      targetOffset += 3;
    }
  }

  return { width, height, data: deflateSync(rgb) };
}

function renderDocument(lines: PdfLine[]) {
  assertNoForbiddenTokens(lines);
  const signature = decodePng(anvelSignaturePngBase64);
  const pages: string[] = [];
  let commands: string[] = [];
  let y = PAGE_HEIGHT - TOP;

  function newPage() {
    if (commands.length > 0) pages.push(commands.join("\n"));
    commands = [
      "0.09 0.35 0.33 rg",
      text("ANVEL Contractor Portal", LEFT, PAGE_HEIGHT - 34, 8, true),
      "0 0 0 rg",
      rule(LEFT, PAGE_HEIGHT - 44, PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 44, 0.4),
    ];
    y = PAGE_HEIGHT - TOP;
  }

  function ensure(height: number) {
    if (y - height < BOTTOM) newPage();
  }

  newPage();
  lines.forEach((line) => {
    if (line.kind === "spacer") {
      y -= 8;
      return;
    }
    if (line.kind === "title") {
      ensure(46);
      commands.push(text(line.text, LEFT, y, 16, true));
      y -= 28;
      return;
    }
    if (line.kind === "heading") {
      ensure(30);
      commands.push(text(line.text, LEFT, y, 11, true));
      y -= 18;
      return;
    }
    if (line.kind === "signature") {
      ensure(170);
      const leftX = LEFT;
      const rightX = 315;
      commands.push(text("For ANVEL Consulting", leftX, y, 10, true));
      commands.push(text("For the Consultant", rightX, y, 10, true));
      y -= 18;
      commands.push(text("Name: Andres Velasco Fernandez", leftX, y));
      commands.push(text(`Name: ${line.consultantName}`, rightX, y));
      y -= 16;
      commands.push(text("Title: Director", leftX, y));
      commands.push(text(`Title / status: ${line.consultantTitle}`, rightX, y));
      y -= 16;
      commands.push(text(`Date: ${line.date}`, leftX, y));
      commands.push(text("Date:", rightX, y));
      y -= 58;
      commands.push(image("Sig", leftX, y, 132, 44));
      commands.push(text("Signature: _______________________", rightX, y + 14));
      y -= 24;
      return;
    }

    const wrapped = wrap(line.text, 92);
    ensure(wrapped.length * 13 + 8);
    wrapped.forEach((value, index) => {
      commands.push(text(value, LEFT, y - index * 13, 8.6));
    });
    y -= wrapped.length * 13 + 6;
  });
  pages.push(commands.join("\n"));

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  const pageObjectStart = 3;
  const fontObjectStart = pageObjectStart + pages.length;
  const contentObjectStart = fontObjectStart + 2;
  const imageObjectId = contentObjectStart + pages.length;
  const pageRefs = pages.map((_, index) => `${pageObjectStart + index} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >> endobj`);

  pages.forEach((_, index) => {
    const pageId = pageObjectStart + index;
    const contentId = contentObjectStart + index;
    objects.push(`${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectStart} 0 R /F2 ${fontObjectStart + 1} 0 R >> /XObject << /Sig ${imageObjectId} 0 R >> >> /Contents ${contentId} 0 R >> endobj`);
  });

  objects.push(`${fontObjectStart} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);
  objects.push(`${fontObjectStart + 1} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj`);
  pages.forEach((stream, index) => {
    objects.push(`${contentObjectStart + index} 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`);
  });
  objects.push(`${imageObjectId} 0 obj << /Type /XObject /Subtype /Image /Width ${signature.width} /Height ${signature.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${signature.data.length} >> stream\n${signature.data.toString("binary")}\nendstream endobj`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${object}\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, "binary"));
}

function p(textValue: string): PdfLine {
  return { kind: "paragraph", text: textValue };
}

function h(textValue: string): PdfLine {
  return { kind: "heading", text: textValue };
}

function title(textValue: string): PdfLine {
  return { kind: "title", text: textValue };
}

function signature(input: OnboardingDocumentFormData): PdfLine {
  return {
    kind: "signature",
    consultantName: input.consultantLegalName,
    consultantTitle: input.consultantTitleStatus,
    date: formatDate(input.documentDate),
  };
}

function frameworkLines(input: OnboardingDocumentFormData): PdfLine[] {
  return [
    title("Freelance Consultant Framework Agreement"),
    p(`This Freelance Consultant Framework Agreement is entered into between ANVEL Consulting and the Consultant identified below. It governs freelance services provided by the Consultant to ANVEL Consulting for projects and assignments connected with ${input.projectClientLabel} and its clients.`),
    h("ANVEL Consulting"),
    p("ERP UTILITIES CONSULTING SERVICES LTD, trading for these purposes as ANVEL Consulting"),
    h("Consultant"),
    p(input.consultantLegalName),
    p(`Consultant address: ${input.consultantAddress}`),
    p(`Consultant tax/VAT number: ${input.consultantTaxVatNumber}`),
    p(`Effective date: ${formatDate(input.effectiveDate)}`),
    h("1. Purpose and scope"),
    p(`ANVEL Consulting may engage the Consultant to provide SAP consulting, development, support or related professional services in connection with ${input.projectClientLabel} projects.`),
    p("Specific assignments, rates, dates, workload and client-related details will be documented in an Assignment Schedule. If there is any conflict between this Agreement and an Assignment Schedule, the Assignment Schedule will apply only for that specific assignment."),
    h("2. Independent freelance relationship"),
    p("The Consultant acts as an independent freelance professional or independent service provider. Nothing in this Agreement creates an employment relationship, partnership, agency relationship or joint venture between ANVEL Consulting and the Consultant."),
    p("The Consultant remains responsible for all applicable taxes, social security obligations, registrations, insurances and legal requirements connected with the Consultant's own business activities."),
    h("3. Services"),
    p(`The Consultant will provide the services with reasonable professional skill, care and diligence, in line with the assignment description, applicable project standards and instructions reasonably provided by ANVEL Consulting, ${input.projectClientLabel} or the relevant end client.`),
    p("The Consultant will perform the services remotely unless the relevant Assignment Schedule expressly states otherwise."),
    h("4. Timesheets and approvals"),
    p(`Only hours recorded in timesheets and approved through the applicable ${input.projectClientLabel} or end-client approval process are billable.`),
    p("The Consultant must submit timesheets accurately and on time, using the format or system required for the assignment."),
    p("ANVEL Consulting is not obliged to pay for hours that are rejected, not approved, unsupported, duplicated or not connected with the assignment."),
    h("5. Fees and payment"),
    p("The applicable hourly rate or daily rate will be stated in the Assignment Schedule."),
    p("The Consultant may invoice ANVEL Consulting only for approved hours or approved days."),
    p("Payment will be made within the payment term stated in the Assignment Schedule, subject to receipt of a valid invoice and the corresponding approved timesheet."),
    p("Unless otherwise stated in the Assignment Schedule, expenses are not reimbursable unless pre-approved in writing by ANVEL Consulting."),
    h("6. Confidentiality"),
    p(`The Consultant must keep confidential all information received from or concerning ANVEL Consulting, ${input.projectClientLabel}, any end client, their systems, processes, documents, business data, technical data, pricing, credentials, project information and personal data.`),
    p("Confidential information may only be used for the purpose of performing the assignment. It may not be disclosed to third parties without prior written approval."),
    p("The confidentiality obligations continue after the end of the assignment and after the end of this Agreement."),
    h("7. Data protection and security"),
    p("The Consultant must comply with applicable data protection rules, project security rules, access restrictions and any policies communicated for the assignment."),
    p("The Consultant may not copy, download, export, store or transfer client data outside approved systems unless expressly authorised in writing."),
    p("Any suspected data incident, unauthorised access, credential compromise or security issue must be reported immediately to ANVEL Consulting."),
    h("8. Intellectual property"),
    p("All deliverables, documentation, code, configurations, specifications, analysis, reports or other work products created by the Consultant specifically for the assignment will belong to ANVEL Consulting or the relevant client as required by the project arrangements."),
    p("The Consultant retains ownership of pre-existing know-how, generic skills, methods, reusable experience and tools not created specifically for the assignment, provided that no confidential information or client material is reused or disclosed."),
    h("9. Non-circumvention and client protection"),
    p(`During the assignment and for twelve months after the last day of services, the Consultant will not directly or indirectly solicit, contract with, provide services to or accept an engagement from ${input.projectClientLabel} or the relevant end client in connection with the same or similar services, except through ANVEL Consulting or with ANVEL Consulting's prior written consent.`),
    p("This clause is intended to protect the commercial relationship introduced and managed by ANVEL Consulting."),
    h("10. Compliance and conduct"),
    p("The Consultant must act professionally and comply with reasonable instructions, project rules, security requirements, confidentiality obligations and applicable laws."),
    p(`The Consultant must not make commitments on behalf of ANVEL Consulting, ${input.projectClientLabel} or any end client unless expressly authorised in writing.`),
    h("11. Termination"),
    p("Either party may terminate this Agreement or an Assignment Schedule with the notice period stated in the relevant Assignment Schedule."),
    p("ANVEL Consulting may terminate immediately if the Consultant materially breaches confidentiality, data protection, security, professional conduct, non-circumvention or project rules."),
    h("12. Liability"),
    p("The Consultant is responsible for losses caused by wilful misconduct, fraud, gross negligence, breach of confidentiality, breach of data protection, unauthorised disclosure or unauthorised use of systems or data."),
    p("For other claims, liability will be limited to the total fees paid to the Consultant under the relevant Assignment Schedule during the three months preceding the event giving rise to the claim, unless a higher liability is required by applicable law."),
    h("13. Governing law and jurisdiction"),
    p("This Agreement is governed by the laws of Cyprus, unless mandatory law requires otherwise."),
    p("The parties will first attempt to resolve disputes in good faith. If no resolution is reached, the courts of Cyprus will have jurisdiction, unless mandatory law requires another forum."),
    h("14. Entire agreement"),
    p("This Agreement, together with any Assignment Schedule and confidentiality or data protection undertaking signed for the assignment, constitutes the agreement between ANVEL Consulting and the Consultant for the relevant services."),
    { kind: "spacer" },
    signature(input),
  ];
}

function assignmentLines(input: OnboardingDocumentFormData): PdfLine[] {
  const bankLines = [
    `Account holder: ${input.bankAccountHolder}`,
    `IBAN / account number: ${input.ibanOrAccountNumber}`,
    `SWIFT/BIC: ${input.swiftBic}`,
    `Bank name: ${input.bankName}`,
    `Bank country/address: ${input.bankCountryAddress}`,
    input.additionalBankDetails ? `Additional details: ${input.additionalBankDetails}` : null,
  ].filter((line): line is string => Boolean(line));
  return [
    title(`Assignment Schedule - ${input.clientProjectReference}`),
    p(`This Assignment Schedule sets out the commercial and operational terms for a specific ${input.projectClientLabel}-related assignment. It should be read together with the Freelance Consultant Framework Agreement and the NDA / Data Protection Undertaking signed by the Consultant.`),
    p(`Client / project reference: ${input.clientProjectReference}`),
    h("ANVEL Consulting"),
    p("ERP UTILITIES CONSULTING SERVICES LTD, trading for these purposes as ANVEL Consulting"),
    h("Consultant"),
    p(input.consultantLegalName),
    p(`Role / assignment title: ${input.roleAssignmentTitle}`),
    p(`Start date: ${formatDate(input.startDate)}`),
    p(`Expected end date: ${formatDate(input.expectedEndDate)}`),
    p(`Initial duration: ${input.initialDuration}`),
    p(`Work location: ${input.workLocation}`),
    h("1. Assignment description"),
    p(`The Consultant will provide SAP consulting, development, support or related professional services for a ${input.projectClientLabel}-related assignment.`),
    p(`Specific responsibilities: ${input.specificResponsibilities}`),
    p(`The Consultant will coordinate with ANVEL Consulting and, where required, with ${input.projectClientLabel} or the relevant end-client contacts.`),
    h("2. Workload and availability"),
    p(`Expected workload: ${input.expectedWorkload}`),
    p(`Working time zone: ${input.workingTimeZone}`),
    p("Any material change in availability must be communicated to ANVEL Consulting as early as possible."),
    h("3. Rate"),
    p(`Agreed rate payable to the Consultant: ${input.currency} ${input.agreedRateAmount} per ${input.rateUnit}`),
    p("The rate is exclusive of VAT or equivalent taxes, if applicable."),
    p("Only approved hours or approved days are billable."),
    h("4. Timesheet process"),
    p(input.timesheetSubmissionInstructions),
    p(`At the end of each completed month, once the monthly timesheet has been approved by ${input.projectClientLabel} or the end client, the approved timesheet shall be sent to ANVEL Consulting.`),
    p("Timesheets must reflect the actual work performed. Rejected or unapproved time is not billable unless later approved in writing."),
    h("5. Invoicing and payment"),
    p("The Consultant may issue an invoice only after the relevant timesheet has been approved."),
    p(`Unless a different payment term is stated here, ANVEL Consulting will pay the Consultant within ${input.paymentTerm} from receipt of a valid invoice and the corresponding approved timesheet.`),
    p("Payment will be made by bank transfer to the bank account stated by the Consultant."),
    h("Bank account details"),
    ...bankLines.map(p),
    h("6. Expenses"),
    p("No expenses are reimbursable unless they are expressly approved in writing by ANVEL Consulting before being incurred."),
    h("7. Access, equipment and security"),
    p("The Consultant must comply with access, security and data protection rules applicable to the assignment."),
    p("Access credentials are personal and must not be shared."),
    p("Client systems and data may be used only for the assignment."),
    h("8. Deliverables and quality"),
    p("The Consultant must perform the assignment with professional care and provide reasonable status updates when requested."),
    p("Any material issue, delay, conflict, blocker or project risk must be reported to ANVEL Consulting promptly."),
    h("9. Notice period"),
    p("Either party may terminate the assignment by giving two (2) weeks' written notice."),
    p(`ANVEL Consulting may terminate the assignment with immediate effect in case of serious breach, misconduct, confidentiality breach, security breach, non-performance, loss of client approval, or termination/suspension of the corresponding assignment by ${input.projectClientLabel} or the end client.`),
    p(`If ${input.projectClientLabel} or the end client terminates, suspends or reduces the assignment, ANVEL Consulting may terminate or adjust the Consultant's assignment accordingly.`),
    h("10. Special conditions"),
    p(input.specialConditions),
    { kind: "spacer" },
    signature(input),
  ];
}

function ndaLines(input: OnboardingDocumentFormData): PdfLine[] {
  return [
    title("NDA and Data Protection Undertaking"),
    p(`This undertaking applies to all services performed by the Consultant in connection with ANVEL Consulting, ${input.projectClientLabel} and any related end-client assignment.`),
    h("ANVEL Consulting"),
    p("ERP UTILITIES CONSULTING SERVICES LTD, trading for these purposes as ANVEL Consulting"),
    h("Consultant"),
    p(`Consultant: ${input.consultantLegalName}`),
    p(`Project / client reference: ${input.clientProjectReference}`),
    p(`Effective date: ${formatDate(input.effectiveDate)}`),
    h("1. Confidential information"),
    p(`Confidential information includes all non-public information concerning ANVEL Consulting, ${input.projectClientLabel}, any end client, their business, systems, projects, documents, code, configurations, data, processes, credentials, pricing, commercial terms, tickets, incidents, emails, messages, meetings, architecture, integrations, personal data and technical information.`),
    h("2. Confidentiality obligations"),
    p("The Consultant will protect confidential information with at least the same level of care used to protect the Consultant's own confidential information, and in any case with no less than reasonable care."),
    p("Confidential information may be used only for the relevant assignment and may not be disclosed to any third party without prior written approval from ANVEL Consulting."),
    p("The Consultant must not publish, discuss or reference confidential project information on social media, public forums, presentations, training materials or portfolio material."),
    h("3. Data protection"),
    p("The Consultant must process personal data only when necessary for the assignment and only in accordance with the instructions received for the project."),
    p("The Consultant must not copy, export, download, forward, store or transfer personal data outside approved systems unless expressly authorised in writing."),
    p("The Consultant must not use personal data for any private, commercial or unrelated purpose."),
    h("4. Security and access"),
    p("The Consultant must keep credentials confidential and must not share accounts, passwords, tokens, VPN access, certificates or devices used for the assignment."),
    p("The Consultant must use reasonable security measures, including device protection, password protection and secure network access."),
    p("Any suspected security incident, unauthorised access, data loss, malware, phishing, compromised credential or accidental disclosure must be reported immediately to ANVEL Consulting."),
    h("5. Return and deletion"),
    p("At the end of the assignment, or upon request, the Consultant must return, delete or securely destroy all confidential information and project materials in the Consultant's possession, unless retention is required by law and approved by ANVEL Consulting."),
    h("6. Continuing obligations"),
    p("These obligations continue after the end of the assignment and after the end of any agreement between ANVEL Consulting and the Consultant."),
    h("7. Remedies"),
    p(`The Consultant acknowledges that a breach of confidentiality, data protection or security obligations may cause serious harm to ANVEL Consulting, ${input.projectClientLabel} or the relevant end client and may result in termination of the assignment and claims for damages or other remedies available under applicable law.`),
    { kind: "spacer" },
    signature(input),
  ];
}

export function generateOnboardingDocuments(
  input: OnboardingDocumentFormData,
): GeneratedOnboardingDocument[] {
  const consultant = safeFilePart(input.consultantLegalName);
  const project = safeFilePart(input.clientProjectReference);
  const datePart = fileDate(input.documentDate);
  return [
    {
      documentType: "framework_agreement",
      title: "Freelance Consultant Framework Agreement",
      fileName: `Framework_Agreement_${consultant}_${datePart}.pdf`,
      pdf: renderDocument(frameworkLines(input)),
    },
    {
      documentType: "assignment_schedule",
      title: "Assignment Schedule",
      fileName: `Assignment_Schedule_${consultant}_${project}_${datePart}.pdf`,
      pdf: renderDocument(assignmentLines(input)),
    },
    {
      documentType: "nda_data_protection",
      title: "NDA and Data Protection Undertaking",
      fileName: `NDA_Data_Protection_${consultant}_${datePart}.pdf`,
      pdf: renderDocument(ndaLines(input)),
    },
  ];
}
