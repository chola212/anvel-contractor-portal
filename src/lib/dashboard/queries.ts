import { createClient } from "@/lib/supabase/server";

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

export type DashboardMetric = {
  label: string;
  value: number;
  description: string;
};

export type DashboardSection = {
  title: string;
  description: string;
  metrics: DashboardMetric[];
};

function readCount(result: CountResult, label: string) {
  if (result.error) {
    throw new Error(`Could not load ${label}: ${result.error.message}`);
  }

  return result.count ?? 0;
}

export async function getDashboardSections() {
  const supabase = await createClient();

  const [
    activeContractors,
    activeAssignments,
    documentsNeedingReview,
    submittedTimesheets,
    correctionTimesheets,
    approvedTimesheets,
    uploadedInvoices,
    correctionInvoices,
    openPayments,
  ] = await Promise.all([
    supabase
      .from("contractors")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("contractor_projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("contractor_documents")
      .select("id", { count: "exact", head: true })
      .in("status", ["uploaded", "rejected", "expired"]),
    supabase
      .from("timesheets")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("timesheets")
      .select("id", { count: "exact", head: true })
      .in("status", ["rejected", "reopened"]),
    supabase
      .from("timesheets")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "uploaded"),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "correction_required"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "approved", "on_hold"]),
  ]);

  return [
    {
      title: "Contractor operations",
      description:
        "Current active contractor records, assignments and document review workload.",
      metrics: [
        {
          label: "Active contractors",
          value: readCount(activeContractors, "active contractors"),
          description: "Accepted contractor profiles visible to this role.",
        },
        {
          label: "Active assignments",
          value: readCount(activeAssignments, "active assignments"),
          description: "Current project assignments visible through RLS.",
        },
        {
          label: "Documents needing review",
          value: readCount(documentsNeedingReview, "documents needing review"),
          description: "Uploaded, rejected or expired document records.",
        },
      ],
    },
    {
      title: "Timesheet workflow",
      description:
        "Monthly timesheet states for submission, approval and correction.",
      metrics: [
        {
          label: "Submitted timesheets",
          value: readCount(submittedTimesheets, "submitted timesheets"),
          description: "Timesheets waiting for admin review.",
        },
        {
          label: "Correction required",
          value: readCount(correctionTimesheets, "timesheets needing correction"),
          description: "Rejected or reopened timesheets.",
        },
        {
          label: "Approved timesheets",
          value: readCount(approvedTimesheets, "approved timesheets"),
          description: "Timesheets ready for payment statement review.",
        },
      ],
    },
    {
      title: "Invoice and payment workflow",
      description:
        "Official invoice and manual payment status for visible records.",
      metrics: [
        {
          label: "Invoices awaiting review",
          value: readCount(uploadedInvoices, "uploaded invoices"),
          description: "Uploaded invoices not yet checked by admin.",
        },
        {
          label: "Invoice corrections",
          value: readCount(correctionInvoices, "invoice corrections"),
          description: "Invoices sent back for contractor correction.",
        },
        {
          label: "Open payment statuses",
          value: readCount(openPayments, "open payments"),
          description: "Pending, approved or on-hold manual payment rows.",
        },
      ],
    },
  ] satisfies DashboardSection[];
}
