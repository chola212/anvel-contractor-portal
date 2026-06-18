import { vatTreatmentLabels } from "@/lib/contractors/format";
import type { VatTreatment } from "@/lib/contractors/types";
import { invoiceStatusLabels } from "@/lib/invoices/format";
import type { InvoiceStatus } from "@/lib/invoices/types";
import { createClient } from "@/lib/supabase/server";

export const accountantExportStatuses = [
  "all",
  "uploaded",
  "checked",
  "correction_required",
  "approved_for_payment",
  "paid",
  "on_hold",
] as const;

export type AccountantExportStatus = (typeof accountantExportStatuses)[number];

export type AccountantExportFilters = {
  month?: string;
  status?: AccountantExportStatus;
};

type ExportInvoiceRecord = {
  id: string;
  payment_statement_id: string | null;
  contractor_id: string;
  invoice_number: string;
  invoice_date: string;
  net_amount: number | string;
  vat_amount: number | string;
  gross_amount: number | string;
  currency: string;
  status: InvoiceStatus;
  created_at: string;
};

type ExportContractorRecord = {
  id: string;
  legal_name: string;
  email: string;
  country: string | null;
  vat_number: string | null;
};

type ExportStatementRecord = {
  id: string;
  project_id: string;
  total_hours: number | string;
  vat_treatment: VatTreatment;
};

type ExportProjectRecord = {
  id: string;
  name: string;
  client_label: string | null;
};

type ExportPaymentRecord = {
  invoice_id: string;
  status: string;
  payment_date: string | null;
  payment_reference: string | null;
  paid_amount: number | string | null;
  currency: string;
};

export type AccountantExportRow = {
  supplier_name: string;
  supplier_email: string;
  supplier_country: string;
  vat_number: string;
  invoice_number: string;
  invoice_date: string;
  net_amount: string;
  vat_amount: string;
  gross_amount: string;
  currency: string;
  vat_treatment: string;
  invoice_status: string;
  payment_status: string;
  payment_date: string;
  payment_reference: string;
  project: string;
  client_label: string;
  total_hours: string;
};

export function parseAccountantExportFilters(
  params: URLSearchParams,
): AccountantExportFilters {
  const month = params.get("month") ?? undefined;
  const requestedStatus = params.get("status") ?? "all";
  const status = accountantExportStatuses.includes(
    requestedStatus as AccountantExportStatus,
  )
    ? (requestedStatus as AccountantExportStatus)
    : "all";

  return {
    month: isValidMonth(month) ? month : undefined,
    status,
  };
}

export async function getAccountantExportRows(filters: AccountantExportFilters) {
  const supabase = await createClient();
  let invoiceQuery = supabase
    .from("invoices")
    .select(
      "id,payment_statement_id,contractor_id,invoice_number,invoice_date,net_amount,vat_amount,gross_amount,currency,status,created_at",
    )
    .order("invoice_date", { ascending: false });

  if (filters.status && filters.status !== "all") {
    invoiceQuery = invoiceQuery.eq("status", filters.status);
  }

  if (filters.month) {
    const [startDate, endDate] = getMonthDateRange(filters.month);
    invoiceQuery = invoiceQuery.gte("invoice_date", startDate).lte("invoice_date", endDate);
  }

  const { data: invoices, error: invoiceError } =
    await invoiceQuery.returns<ExportInvoiceRecord[]>();

  if (invoiceError) {
    throw new Error(`Could not load export invoices: ${invoiceError.message}`);
  }

  if (invoices.length === 0) {
    return [];
  }

  const contractorIds = [...new Set(invoices.map((invoice) => invoice.contractor_id))];
  const statementIds = [
    ...new Set(
      invoices
        .map((invoice) => invoice.payment_statement_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const invoiceIds = invoices.map((invoice) => invoice.id);

  const [contractorResult, statementResult, paymentResult] = await Promise.all([
    supabase
      .from("contractors")
      .select("id,legal_name,email,country,vat_number")
      .in("id", contractorIds)
      .returns<ExportContractorRecord[]>(),
    statementIds.length > 0
      ? supabase
          .from("payment_statements")
          .select("id,project_id,total_hours,vat_treatment")
          .in("id", statementIds)
          .returns<ExportStatementRecord[]>()
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("payments")
      .select("invoice_id,status,payment_date,payment_reference,paid_amount,currency")
      .in("invoice_id", invoiceIds)
      .returns<ExportPaymentRecord[]>(),
  ]);

  if (contractorResult.error) {
    throw new Error(
      `Could not load export contractors: ${contractorResult.error.message}`,
    );
  }

  if (statementResult.error) {
    throw new Error(
      `Could not load export statements: ${statementResult.error.message}`,
    );
  }

  if (paymentResult.error) {
    throw new Error(`Could not load export payments: ${paymentResult.error.message}`);
  }

  const projectIds = [
    ...new Set(statementResult.data.map((statement) => statement.project_id)),
  ];
  const projectResult =
    projectIds.length > 0
      ? await supabase
          .from("projects")
          .select("id,name,client_label")
          .in("id", projectIds)
          .returns<ExportProjectRecord[]>()
      : { data: [], error: null };

  if (projectResult.error) {
    throw new Error(`Could not load export projects: ${projectResult.error.message}`);
  }

  const contractors = new Map(
    contractorResult.data.map((contractor) => [contractor.id, contractor]),
  );
  const statements = new Map(
    statementResult.data.map((statement) => [statement.id, statement]),
  );
  const projects = new Map(projectResult.data.map((project) => [project.id, project]));
  const payments = new Map(
    paymentResult.data.map((payment) => [payment.invoice_id, payment]),
  );

  return invoices.map<AccountantExportRow>((invoice) => {
    const contractor = contractors.get(invoice.contractor_id);
    const statement = invoice.payment_statement_id
      ? statements.get(invoice.payment_statement_id)
      : null;
    const project = statement ? projects.get(statement.project_id) : null;
    const payment = payments.get(invoice.id);

    return {
      supplier_name: contractor?.legal_name ?? "Not available",
      supplier_email: contractor?.email ?? "Not available",
      supplier_country: contractor?.country ?? "Not provided",
      vat_number: contractor?.vat_number ?? "Not provided",
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      net_amount: formatDecimal(invoice.net_amount),
      vat_amount: formatDecimal(invoice.vat_amount),
      gross_amount: formatDecimal(invoice.gross_amount),
      currency: invoice.currency,
      vat_treatment: statement
        ? vatTreatmentLabels[statement.vat_treatment]
        : "Not available",
      invoice_status: invoiceStatusLabels[invoice.status],
      payment_status: payment?.status ?? "Not set",
      payment_date: payment?.payment_date ?? "Not set",
      payment_reference: payment?.payment_reference ?? "Not set",
      project: project?.name ?? "Not available",
      client_label: project?.client_label ?? "Not provided",
      total_hours: statement ? formatDecimal(statement.total_hours) : "Not available",
    };
  });
}

export function toAccountantCsv(rows: AccountantExportRow[]) {
  const headers: (keyof AccountantExportRow)[] = [
    "supplier_name",
    "supplier_email",
    "supplier_country",
    "vat_number",
    "invoice_number",
    "invoice_date",
    "net_amount",
    "vat_amount",
    "gross_amount",
    "currency",
    "vat_treatment",
    "invoice_status",
    "payment_status",
    "payment_date",
    "payment_reference",
    "project",
    "client_label",
    "total_hours",
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\r\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDecimal(value: number | string | null) {
  if (value === null) {
    return "Not set";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "Not set";
  }

  return numericValue.toFixed(2);
}

function isValidMonth(value: string | undefined) {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

function getMonthDateRange(month: string): [string, string] {
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  return [startDate, endDate];
}
