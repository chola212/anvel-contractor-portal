import { createClient } from "@/lib/supabase/server";

import type {
  ContractorInvoice,
  InvoiceContractorSummary,
  InvoicePaymentStatementSummary,
  InvoiceProjectSummary,
  InvoiceRecord,
  InvoiceUploadStatement,
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
  file_path,
  file_name,
  status,
  reviewed_by,
  reviewed_at,
  review_comment,
  generated_by,
  generated_at,
  emailed_at,
  email_status,
  created_at,
  updated_at
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
  file_path,
  file_name,
  status,
  reviewed_by,
  reviewed_at,
  review_comment,
  created_at,
  updated_at
`;

type LegacyInvoiceRecord = Omit<
  InvoiceRecord,
  | "timesheet_id"
  | "invoice_type"
  | "generated_by"
  | "generated_at"
  | "emailed_at"
  | "email_status"
> &
  Partial<
    Pick<
      InvoiceRecord,
      | "timesheet_id"
      | "invoice_type"
      | "generated_by"
      | "generated_at"
      | "emailed_at"
      | "email_status"
    >
  >;

function isMissingSelfBillingInvoiceColumn(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    [
      "timesheet_id",
      "invoice_type",
      "generated_by",
      "generated_at",
      "emailed_at",
      "email_status",
    ].some((column) => message.includes(column))
  );
}

function normalizeInvoiceRecord(invoice: LegacyInvoiceRecord): InvoiceRecord {
  return {
    ...invoice,
    timesheet_id: invoice.timesheet_id ?? null,
    invoice_type: invoice.invoice_type ?? "contractor_uploaded",
    generated_by: invoice.generated_by ?? null,
    generated_at: invoice.generated_at ?? null,
    emailed_at: invoice.emailed_at ?? null,
    email_status: invoice.email_status ?? "not_sent",
  };
}

export async function getInvoicesForStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceColumns)
    .order("created_at", { ascending: false })
    .returns<InvoiceRecord[]>();

  if (error) {
    if (isMissingSelfBillingInvoiceColumn(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("invoices")
        .select(legacyInvoiceColumns)
        .order("created_at", { ascending: false })
        .returns<LegacyInvoiceRecord[]>();

      if (legacyError) {
        throw new Error(`Could not load invoices: ${legacyError.message}`);
      }

      return hydrateInvoices(legacyData.map(normalizeInvoiceRecord));
    }

    throw new Error(`Could not load invoices: ${error.message}`);
  }

  return hydrateInvoices(data);
}

export async function getInvoicesForContractor(contractorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceColumns)
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: false })
    .returns<InvoiceRecord[]>();

  if (error) {
    if (isMissingSelfBillingInvoiceColumn(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("invoices")
        .select(legacyInvoiceColumns)
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false })
        .returns<LegacyInvoiceRecord[]>();

      if (legacyError) {
        throw new Error(
          `Could not load contractor invoices: ${legacyError.message}`,
        );
      }

      return hydrateInvoices(legacyData.map(normalizeInvoiceRecord));
    }

    throw new Error(`Could not load contractor invoices: ${error.message}`);
  }

  return hydrateInvoices(data);
}

export async function getInvoiceById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceColumns)
    .eq("id", id)
    .maybeSingle<InvoiceRecord>();

  if (error) {
    if (isMissingSelfBillingInvoiceColumn(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("invoices")
        .select(legacyInvoiceColumns)
        .eq("id", id)
        .maybeSingle<LegacyInvoiceRecord>();

      if (legacyError) {
        throw new Error(`Could not load invoice: ${legacyError.message}`);
      }

      return legacyData ? normalizeInvoiceRecord(legacyData) : null;
    }

    throw new Error(`Could not load invoice: ${error.message}`);
  }

  return data ? normalizeInvoiceRecord(data) : null;
}

export async function getUploadableStatementsForContractor(contractorId: string) {
  const supabase = await createClient();
  const { data: statements, error } = await supabase
    .from("payment_statements")
    .select(
      "id,timesheet_id,contractor_id,project_id,total_hours,net_amount,vat_amount,gross_amount,currency,created_at",
    )
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: false })
    .returns<InvoiceUploadStatement[]>();

  if (error) {
    throw new Error(`Could not load payment statements: ${error.message}`);
  }

  if (statements.length === 0) {
    return [];
  }

  const statementIds = statements.map((statement) => statement.id);
  const projectIds = [...new Set(statements.map((statement) => statement.project_id))];
  const [invoiceResult, projectResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("payment_statement_id")
      .in("payment_statement_id", statementIds)
      .returns<Pick<InvoiceRecord, "payment_statement_id">[]>(),
    supabase
      .from("projects")
      .select("id,name,client_label,status")
      .in("id", projectIds)
      .returns<InvoiceProjectSummary[]>(),
  ]);

  if (invoiceResult.error) {
    throw new Error(
      `Could not check existing invoices: ${invoiceResult.error.message}`,
    );
  }

  if (projectResult.error) {
    throw new Error(
      `Could not load statement projects: ${projectResult.error.message}`,
    );
  }

  const invoicedStatementIds = new Set(
    invoiceResult.data
      .map((invoice) => invoice.payment_statement_id)
      .filter((id): id is string => Boolean(id)),
  );
  const projects = new Map<string, InvoiceProjectSummary>(
    projectResult.data.map((project) => [project.id, project]),
  );

  return statements
    .filter((statement) => !invoicedStatementIds.has(statement.id))
    .map((statement) => ({
      ...statement,
      project: projects.get(statement.project_id) ?? null,
    }));
}

async function hydrateInvoices(invoices: InvoiceRecord[]) {
  if (invoices.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const contractorIds = [...new Set(invoices.map((invoice) => invoice.contractor_id))];
  const statementIds = [
    ...new Set(
      invoices
        .map((invoice) => invoice.payment_statement_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [contractorResult, statementResult] = await Promise.all([
    supabase
      .from("contractors")
      .select("id,legal_name,email,status")
      .in("id", contractorIds)
      .returns<InvoiceContractorSummary[]>(),
    statementIds.length > 0
      ? supabase
          .from("payment_statements")
          .select("id,timesheet_id,project_id,total_hours,gross_amount,currency,created_at")
          .in("id", statementIds)
          .returns<InvoicePaymentStatementSummary[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (contractorResult.error) {
    throw new Error(
      `Could not load invoice contractors: ${contractorResult.error.message}`,
    );
  }

  if (statementResult.error) {
    throw new Error(
      `Could not load invoice statements: ${statementResult.error.message}`,
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
          .returns<InvoiceProjectSummary[]>()
      : { data: [], error: null };

  if (projectResult.error) {
    throw new Error(`Could not load invoice projects: ${projectResult.error.message}`);
  }

  const contractors = new Map<string, InvoiceContractorSummary>(
    contractorResult.data.map((contractor) => [contractor.id, contractor]),
  );
  const statements = new Map<string, InvoicePaymentStatementSummary>(
    statementResult.data.map((statement) => [statement.id, statement]),
  );
  const projects = new Map<string, InvoiceProjectSummary>(
    projectResult.data.map((project) => [project.id, project]),
  );

  return invoices.map<ContractorInvoice>((invoice) => {
    const statement = invoice.payment_statement_id
      ? statements.get(invoice.payment_statement_id) ?? null
      : null;

    return {
      ...invoice,
      contractor: contractors.get(invoice.contractor_id) ?? null,
      statement,
      project: statement ? projects.get(statement.project_id) ?? null : null,
    };
  });
}
