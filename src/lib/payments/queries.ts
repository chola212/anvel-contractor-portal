import { createClient } from "@/lib/supabase/server";

import type {
  PaymentContractorSummary,
  PaymentInvoiceRecord,
  PaymentProjectSummary,
  PaymentRecord,
  PaymentRow,
  PaymentStatementSummary,
} from "./types";

const invoiceColumns = `
  id,
  payment_statement_id,
  timesheet_id,
  contractor_id,
  invoice_type,
  invoice_number,
  invoice_date,
  net_amount,
  vat_amount,
  gross_amount,
  currency,
  status,
  created_at
`;

const legacyInvoiceColumns = `
  id,
  payment_statement_id,
  contractor_id,
  invoice_number,
  invoice_date,
  net_amount,
  vat_amount,
  gross_amount,
  currency,
  status,
  created_at
`;

export type PaymentFilters = {
  month?: string;
  from?: string;
  to?: string;
  status?: string;
};

type LegacyPaymentInvoiceRecord = Omit<
  PaymentInvoiceRecord,
  "timesheet_id" | "invoice_type"
> &
  Partial<Pick<PaymentInvoiceRecord, "timesheet_id" | "invoice_type">>;

function isMissingSelfBillingInvoiceColumn(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    ["timesheet_id", "invoice_type"].some((column) => message.includes(column))
  );
}

function normalizePaymentInvoiceRecord(
  invoice: LegacyPaymentInvoiceRecord,
): PaymentInvoiceRecord {
  return {
    ...invoice,
    timesheet_id: invoice.timesheet_id ?? null,
    invoice_type: invoice.invoice_type ?? "contractor_uploaded",
  };
}

function monthStart(value: string) {
  return `${value}-01`;
}

function monthEnd(value: string) {
  const [year, month] = value.split("-").map(Number);
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${value}-${String(endDay).padStart(2, "0")}`;
}

type PaymentInvoiceFilterableQuery<T> = T & {
  gte(column: string, value: string): PaymentInvoiceFilterableQuery<T>;
  lte(column: string, value: string): PaymentInvoiceFilterableQuery<T>;
};

function applyPaymentInvoiceFilters<T>(
  query: T,
  filters: PaymentFilters = {},
) {
  let nextQuery = query as PaymentInvoiceFilterableQuery<T>;

  if (filters.month) {
    nextQuery = nextQuery
      .gte("invoice_date", monthStart(filters.month))
      .lte("invoice_date", monthEnd(filters.month));
  } else {
    if (filters.from) {
      nextQuery = nextQuery.gte("invoice_date", monthStart(filters.from));
    }

    if (filters.to) {
      nextQuery = nextQuery.lte("invoice_date", monthEnd(filters.to));
    }
  }

  return nextQuery as T;
}

const paymentColumns = `
  id,
  invoice_id,
  status,
  payment_date,
  payment_reference,
  paid_amount,
  currency,
  internal_note,
  created_at,
  updated_at
`;

export async function getPaymentRowsForStaff(filters: PaymentFilters = {}) {
  const supabase = await createClient();
  const { data, error } = await applyPaymentInvoiceFilters(
    supabase
    .from("invoices")
      .select(invoiceColumns),
    filters,
  )
    .order("invoice_date", { ascending: false })
    .returns<PaymentInvoiceRecord[]>();

  if (error) {
    if (isMissingSelfBillingInvoiceColumn(error)) {
      const { data: legacyData, error: legacyError } = await applyPaymentInvoiceFilters(
        supabase
        .from("invoices")
          .select(legacyInvoiceColumns),
        filters,
      )
        .order("invoice_date", { ascending: false })
        .returns<LegacyPaymentInvoiceRecord[]>();

      if (legacyError) {
        throw new Error(
          `Could not load payment invoices: ${legacyError.message}`,
        );
      }

      return filterPaymentRowsByStatus(
        await hydratePaymentRows(legacyData.map(normalizePaymentInvoiceRecord)),
        filters,
      );
    }

    throw new Error(`Could not load payment invoices: ${error.message}`);
  }

  return filterPaymentRowsByStatus(await hydratePaymentRows(data), filters);
}

export async function getPaymentRowsForContractor(
  contractorId: string,
  filters: PaymentFilters = {},
) {
  const supabase = await createClient();
  const { data, error } = await applyPaymentInvoiceFilters(
    supabase
    .from("invoices")
    .select(invoiceColumns)
      .eq("contractor_id", contractorId),
    filters,
  )
    .order("invoice_date", { ascending: false })
    .returns<PaymentInvoiceRecord[]>();

  if (error) {
    if (isMissingSelfBillingInvoiceColumn(error)) {
      const { data: legacyData, error: legacyError } = await applyPaymentInvoiceFilters(
        supabase
        .from("invoices")
        .select(legacyInvoiceColumns)
          .eq("contractor_id", contractorId),
        filters,
      )
        .order("invoice_date", { ascending: false })
        .returns<LegacyPaymentInvoiceRecord[]>();

      if (legacyError) {
        throw new Error(
          `Could not load contractor payment invoices: ${legacyError.message}`,
        );
      }

      return filterPaymentRowsByStatus(
        await hydratePaymentRows(legacyData.map(normalizePaymentInvoiceRecord)),
        filters,
      );
    }

    throw new Error(`Could not load contractor payment invoices: ${error.message}`);
  }

  return filterPaymentRowsByStatus(await hydratePaymentRows(data), filters);
}

function filterPaymentRowsByStatus(rows: PaymentRow[], filters: PaymentFilters) {
  if (!filters.status) {
    return rows;
  }

  return rows.filter(
    (row) => (row.payment?.status ?? "pending") === filters.status,
  );
}

async function hydratePaymentRows(invoices: PaymentInvoiceRecord[]) {
  if (invoices.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const contractorIds = [...new Set(invoices.map((invoice) => invoice.contractor_id))];
  const statementIds = [
    ...new Set(
      invoices
        .map((invoice) => invoice.payment_statement_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [paymentResult, contractorResult, statementResult] = await Promise.all([
    supabase
      .from("payments")
      .select(paymentColumns)
      .in("invoice_id", invoiceIds)
      .returns<PaymentRecord[]>(),
    supabase
      .from("contractors")
      .select("id,legal_name,email,status")
      .in("id", contractorIds)
      .returns<PaymentContractorSummary[]>(),
    statementIds.length > 0
      ? supabase
          .from("payment_statements")
          .select("id,project_id")
          .in("id", statementIds)
          .returns<PaymentStatementSummary[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (paymentResult.error) {
    throw new Error(`Could not load payments: ${paymentResult.error.message}`);
  }

  if (contractorResult.error) {
    throw new Error(
      `Could not load payment contractors: ${contractorResult.error.message}`,
    );
  }

  if (statementResult.error) {
    throw new Error(
      `Could not load payment statements: ${statementResult.error.message}`,
    );
  }

  const projectIds = [
    ...new Set(statementResult.data.map((statement) => statement.project_id)),
  ];
  const projectResult =
    projectIds.length > 0
      ? await supabase
          .from("projects")
          .select("id,name,client_label,status")
          .in("id", projectIds)
          .returns<PaymentProjectSummary[]>()
      : { data: [], error: null };

  if (projectResult.error) {
    throw new Error(`Could not load payment projects: ${projectResult.error.message}`);
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

  return invoices.map<PaymentRow>((invoice) => {
    const statement = invoice.payment_statement_id
      ? statements.get(invoice.payment_statement_id)
      : null;

    return {
      invoice,
      contractor: contractors.get(invoice.contractor_id) ?? null,
      project: statement ? projects.get(statement.project_id) ?? null : null,
      payment: payments.get(invoice.id) ?? null,
    };
  });
}
