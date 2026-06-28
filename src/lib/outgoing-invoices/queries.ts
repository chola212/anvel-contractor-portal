import { createClient } from "@/lib/supabase/server";

import type {
  CompanyInvoiceSettings,
  OutgoingInvoice,
  OutgoingInvoiceDetail,
  ProjectBillingDetails,
} from "./types";

const outgoingInvoiceColumns = "*";

export type OutgoingInvoiceFilters = {
  status?: string;
  projectId?: string;
  contractorId?: string;
  month?: number;
  year?: number;
  billingLegalName?: string;
  invoiceNumber?: string;
};

export type ManualOutgoingInvoiceProjectOption = {
  id: string;
  name: string;
  client_label: string | null;
  start_date: string | null;
  end_date: string | null;
  hasCompleteBillingDetails: boolean;
};

function hasCompleteProjectBillingDetails(
  billing: Pick<
    ProjectBillingDetails,
    | "billing_legal_name"
    | "billing_email"
    | "billing_address"
    | "billing_country"
    | "billing_vat_number"
  > | null,
) {
  if (!billing) return false;
  return [
    billing.billing_legal_name,
    billing.billing_email,
    billing.billing_address,
    billing.billing_country,
    billing.billing_vat_number,
  ].every((value) => value.trim().length > 0);
}

function isProjectInForce(project: {
  start_date: string | null;
  end_date: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    (!project.start_date || project.start_date <= today)
    && (!project.end_date || project.end_date >= today)
  );
}

export async function getCompanyInvoiceSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_invoice_settings")
    .select("*")
    .limit(1)
    .maybeSingle<CompanyInvoiceSettings>();

  if (error) {
    throw new Error(`Could not load company invoice settings: ${error.message}`);
  }

  return data;
}

export async function getManualOutgoingInvoiceProjectOptions() {
  const supabase = await createClient();
  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id,name,client_label,start_date,end_date,status")
    .eq("status", "active")
    .order("name", { ascending: true })
    .returns<
      {
        id: string;
        name: string;
        client_label: string | null;
        start_date: string | null;
        end_date: string | null;
        status: string;
      }[]
    >();

  if (projectError) {
    throw new Error(`Could not load projects for manual invoices: ${projectError.message}`);
  }

  const inForceProjects = projects.filter(isProjectInForce);
  if (inForceProjects.length === 0) return [];

  const projectIds = inForceProjects.map((project) => project.id);
  const { data: billingRows, error: billingError } = await supabase
    .from("project_billing_details")
    .select("project_id,billing_legal_name,billing_email,billing_address,billing_country,billing_vat_number")
    .in("project_id", projectIds)
    .returns<
      Pick<
        ProjectBillingDetails,
        | "project_id"
        | "billing_legal_name"
        | "billing_email"
        | "billing_address"
        | "billing_country"
        | "billing_vat_number"
      >[]
    >();

  if (billingError) {
    throw new Error(`Could not load project billing details: ${billingError.message}`);
  }

  const billingByProject = new Map(
    billingRows.map((billing) => [billing.project_id, billing]),
  );

  return inForceProjects
    .map<ManualOutgoingInvoiceProjectOption>((project) => ({
      id: project.id,
      name: project.name,
      client_label: project.client_label,
      start_date: project.start_date,
      end_date: project.end_date,
      hasCompleteBillingDetails: hasCompleteProjectBillingDetails(
        billingByProject.get(project.id) ?? null,
      ),
    }))
    .sort((left, right) => {
      if (left.hasCompleteBillingDetails !== right.hasCompleteBillingDetails) {
        return left.hasCompleteBillingDetails ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}

export async function getProjectBillingDetails(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_billing_details")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle<ProjectBillingDetails>();

  if (error) {
    throw new Error(`Could not load project billing details: ${error.message}`);
  }

  return data;
}

export async function getOutgoingInvoices(
  filters: OutgoingInvoiceFilters = {},
) {
  const supabase = await createClient();
  let query = supabase.from("outgoing_invoices").select(outgoingInvoiceColumns);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.contractorId) query = query.eq("contractor_id", filters.contractorId);
  if (filters.month) query = query.eq("month", filters.month);
  if (filters.year) query = query.eq("year", filters.year);
  if (filters.billingLegalName) {
    query = query.ilike("billing_legal_name", `%${filters.billingLegalName}%`);
  }
  if (filters.invoiceNumber) {
    query = query.ilike("invoice_number", `%${filters.invoiceNumber}%`);
  }

  const { data, error } = await query
    .order("invoice_date", { ascending: false })
    .returns<OutgoingInvoice[]>();

  if (error) {
    throw new Error(`Could not load outgoing invoices: ${error.message}`);
  }

  return data;
}

export async function getOutgoingInvoiceById(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outgoing_invoices")
    .select(outgoingInvoiceColumns)
    .eq("id", id)
    .maybeSingle<OutgoingInvoice>();

  if (error) {
    throw new Error(`Could not load outgoing invoice: ${error.message}`);
  }

  if (!data) return null;

  const { data: lines, error: linesError } = await supabase
    .from("outgoing_invoice_lines")
    .select("*")
    .eq("outgoing_invoice_id", data.id)
    .order("sort_order")
    .returns<OutgoingInvoiceDetail["lines"]>();

  if (linesError) {
    throw new Error(`Could not load outgoing invoice lines: ${linesError.message}`);
  }

  return { ...data, lines } satisfies OutgoingInvoiceDetail;
}

export async function getOutgoingInvoiceAuditLogs(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,action,created_at,metadata")
    .eq("entity_type", "outgoing_invoice")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string;
        action: string;
        created_at: string;
        metadata: Record<string, unknown> | null;
      }[]
    >();
  if (error) throw new Error(`Could not load outgoing invoice audit history: ${error.message}`);
  return data;
}
