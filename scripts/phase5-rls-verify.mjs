import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const seedIds = {
  otherContractor: "00000000-0000-4000-8000-000000000201",
  ownProject: "00000000-0000-4000-8000-000000000301",
  otherProject: "00000000-0000-4000-8000-000000000302",
  ownContractorProject: "00000000-0000-4000-8000-000000000401",
  otherContractorProject: "00000000-0000-4000-8000-000000000402",
  ownRequirement: "00000000-0000-4000-8000-000000000501",
  ownDocument: "00000000-0000-4000-8000-000000000601",
  otherDocument: "00000000-0000-4000-8000-000000000602",
  ownTimesheet: "00000000-0000-4000-8000-000000000701",
  otherTimesheet: "00000000-0000-4000-8000-000000000702",
  ownEntry: "00000000-0000-4000-8000-000000000801",
  otherEntry: "00000000-0000-4000-8000-000000000802",
  ownStatement: "00000000-0000-4000-8000-000000000901",
  otherStatement: "00000000-0000-4000-8000-000000000902",
  ownInvoice: "00000000-0000-4000-8000-000000001001",
  otherInvoice: "00000000-0000-4000-8000-000000001002",
  ownPayment: "00000000-0000-4000-8000-000000001101",
  otherPayment: "00000000-0000-4000-8000-000000001102",
  auditLog: "00000000-0000-4000-8000-000000001201",
};

function loadEnvFile(fileName) {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminEmail = process.env.PHASE5_ADMIN_EMAIL ?? "admin.test@anvel.local";
const contractorEmail =
  process.env.PHASE5_CONTRACTOR_EMAIL ?? "contractor.test@anvel.local";
const adminPassword =
  process.env.PHASE5_ADMIN_PASSWORD ?? process.env.PHASE5_TEST_PASSWORD;
const contractorPassword =
  process.env.PHASE5_CONTRACTOR_PASSWORD ?? process.env.PHASE5_TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

if (!adminPassword || !contractorPassword) {
  throw new Error(
    "Set PHASE5_TEST_PASSWORD, or set PHASE5_ADMIN_PASSWORD and PHASE5_CONTRACTOR_PASSWORD.",
  );
}

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function signIn(email, password, label) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    if (error?.message === "Invalid login credentials") {
      throw new Error(
        [
          `Could not sign in as ${label} (${email}).`,
          "Supabase returned: Invalid login credentials.",
          "Check the fake user's password in Authentication > Users,",
          `then rerun with PHASE5_${label.toUpperCase()}_PASSWORD set to the matching value.`,
        ].join(" "),
      );
    }

    throw new Error(`Could not sign in as ${label} (${email}): ${error?.message}`);
  }

  return { supabase, user: data.user };
}

async function readRequiredProfile(adminClient, email, expectedRole) {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id,email,full_name,role,is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read profile for ${email}: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      `Missing public.profiles row for ${email}. Create the fake profile before running Phase 5.`,
    );
  }

  if (data.role !== expectedRole || !data.is_active) {
    throw new Error(
      `Profile for ${email} must be active with role '${expectedRole}'. Current role: '${data.role}', active: ${data.is_active}.`,
    );
  }

  return data;
}

async function writeRow(client, table, payload, options) {
  const { error } = await client.from(table).upsert(payload, options);

  if (error) {
    throw new Error(`Could not upsert ${table}: ${error.message}`);
  }
}

async function writeRows(client, table, payload) {
  const { error } = await client.from(table).upsert(payload);

  if (error) {
    throw new Error(`Could not upsert ${table}: ${error.message}`);
  }
}

async function writeAuditLogIfMissing(client, payload) {
  const { data, error: selectError } = await client
    .from("audit_logs")
    .select("id")
    .eq("id", payload.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Could not check audit_logs: ${selectError.message}`);
  }

  if (data) {
    return;
  }

  const { error: insertError } = await client.from("audit_logs").insert(payload);

  if (insertError) {
    throw new Error(`Could not insert audit_logs: ${insertError.message}`);
  }
}

async function seedFakeData(adminClient, contractorUser) {
  await writeRow(
    adminClient,
    "contractors",
    {
      profile_id: contractorUser.id,
      legal_name: "Phase 5 Contractor Test Ltd",
      email: contractorEmail,
      country: "CY",
      supplier_type: "limited_company",
      vat_treatment: "cyprus_vat_19",
      bank_account_holder: "Phase 5 Contractor Test Ltd",
      iban: "CY00000000000000000000000000",
      swift_bic: "TESTCY00",
      status: "active",
    },
    { onConflict: "profile_id" },
  );

  const { data: ownContractor, error: ownContractorError } = await adminClient
    .from("contractors")
    .select("id")
    .eq("profile_id", contractorUser.id)
    .single();

  if (ownContractorError || !ownContractor) {
    throw new Error(
      `Could not read seeded contractor: ${ownContractorError?.message}`,
    );
  }

  await writeRow(adminClient, "contractors", {
    id: seedIds.otherContractor,
    profile_id: null,
    legal_name: "Phase 5 Other Contractor Ltd",
    email: "other.contractor.test@anvel.local",
    country: "CY",
    supplier_type: "limited_company",
    vat_treatment: "cyprus_vat_19",
    bank_account_holder: "Phase 5 Other Contractor Ltd",
    iban: "CY99999999999999999999999999",
    swift_bic: "OTHRCY00",
    status: "active",
  });

  await writeRows(adminClient, "projects", [
    {
      id: seedIds.ownProject,
      name: "Phase 5 Assigned Project",
      client_label: "Internal test client",
      country: "CY",
      status: "active",
    },
    {
      id: seedIds.otherProject,
      name: "Phase 5 Other Project",
      client_label: "Internal test client",
      country: "CY",
      status: "active",
    },
  ]);

  await writeRows(adminClient, "contractor_projects", [
    {
      id: seedIds.ownContractorProject,
      contractor_id: ownContractor.id,
      project_id: seedIds.ownProject,
      hourly_rate: 50,
      sales_rate: 80,
      status: "active",
    },
    {
      id: seedIds.otherContractorProject,
      contractor_id: seedIds.otherContractor,
      project_id: seedIds.otherProject,
      hourly_rate: 55,
      sales_rate: 90,
      status: "active",
    },
  ]);

  await writeRow(adminClient, "document_requirements", {
    id: seedIds.ownRequirement,
    supplier_type: "limited_company",
    name: "Phase 5 Signed agreement",
    is_required: true,
    requires_expiry_date: false,
  });

  await writeRows(adminClient, "contractor_documents", [
    {
      id: seedIds.ownDocument,
      contractor_id: ownContractor.id,
      document_requirement_id: seedIds.ownRequirement,
      document_type: "signed_agreement",
      file_path: "phase-5/own/test.pdf",
      file_name: "own-test.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1024,
      status: "uploaded",
    },
    {
      id: seedIds.otherDocument,
      contractor_id: seedIds.otherContractor,
      document_requirement_id: seedIds.ownRequirement,
      document_type: "signed_agreement",
      file_path: "phase-5/other/test.pdf",
      file_name: "other-test.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1024,
      status: "uploaded",
    },
  ]);

  await writeRows(adminClient, "timesheets", [
    {
      id: seedIds.ownTimesheet,
      contractor_id: ownContractor.id,
      project_id: seedIds.ownProject,
      year: 2026,
      month: 6,
      status: "draft",
    },
    {
      id: seedIds.otherTimesheet,
      contractor_id: seedIds.otherContractor,
      project_id: seedIds.otherProject,
      year: 2026,
      month: 6,
      status: "draft",
    },
  ]);

  await writeRows(adminClient, "timesheet_entries", [
    {
      id: seedIds.ownEntry,
      timesheet_id: seedIds.ownTimesheet,
      work_date: "2026-06-02",
      hours: 8,
      note: "Phase 5 own test entry",
    },
    {
      id: seedIds.otherEntry,
      timesheet_id: seedIds.otherTimesheet,
      work_date: "2026-06-02",
      hours: 8,
      note: "Phase 5 other test entry",
    },
  ]);

  await writeRows(adminClient, "payment_statements", [
    {
      id: seedIds.ownStatement,
      timesheet_id: seedIds.ownTimesheet,
      contractor_id: ownContractor.id,
      project_id: seedIds.ownProject,
      total_hours: 8,
      hourly_rate: 50,
      net_amount: 400,
      vat_treatment: "cyprus_vat_19",
      vat_amount: 76,
      gross_amount: 476,
    },
    {
      id: seedIds.otherStatement,
      timesheet_id: seedIds.otherTimesheet,
      contractor_id: seedIds.otherContractor,
      project_id: seedIds.otherProject,
      total_hours: 8,
      hourly_rate: 55,
      net_amount: 440,
      vat_treatment: "cyprus_vat_19",
      vat_amount: 83.6,
      gross_amount: 523.6,
    },
  ]);

  await writeRows(adminClient, "invoices", [
    {
      id: seedIds.ownInvoice,
      payment_statement_id: seedIds.ownStatement,
      contractor_id: ownContractor.id,
      invoice_number: "PHASE5-OWN-001",
      invoice_date: "2026-06-30",
      net_amount: 400,
      vat_amount: 76,
      gross_amount: 476,
      file_path: "phase-5/own/invoice.pdf",
      file_name: "own-invoice.pdf",
      status: "uploaded",
    },
    {
      id: seedIds.otherInvoice,
      payment_statement_id: seedIds.otherStatement,
      contractor_id: seedIds.otherContractor,
      invoice_number: "PHASE5-OTHER-001",
      invoice_date: "2026-06-30",
      net_amount: 440,
      vat_amount: 83.6,
      gross_amount: 523.6,
      file_path: "phase-5/other/invoice.pdf",
      file_name: "other-invoice.pdf",
      status: "uploaded",
    },
  ]);

  await writeRows(adminClient, "payments", [
    {
      id: seedIds.ownPayment,
      invoice_id: seedIds.ownInvoice,
      status: "pending",
      paid_amount: null,
    },
    {
      id: seedIds.otherPayment,
      invoice_id: seedIds.otherInvoice,
      status: "pending",
      paid_amount: null,
    },
  ]);

  await writeAuditLogIfMissing(adminClient, {
    id: seedIds.auditLog,
    actor_profile_id: null,
    action: "phase5_rls_verification",
    entity_type: "rls_test",
    entity_id: ownContractor.id,
    metadata: { note: "Fake development RLS verification row" },
  });

  return {
    ownContractorId: ownContractor.id,
  };
}

async function selectIds(client, table, column, ids) {
  const { data, error } = await client.from(table).select(column).in(column, ids);

  if (error) {
    throw new Error(`Could not query ${table}: ${error.message}`);
  }

  return data.map((row) => row[column]).sort();
}

async function selectPaymentInvoiceIds(client, ids) {
  const { data, error } = await client
    .from("payments")
    .select("invoice_id")
    .in("invoice_id", ids);

  if (error) {
    throw new Error(`Could not query payments: ${error.message}`);
  }

  return data.map((row) => row.invoice_id).sort();
}

function record(results, name, passed, details) {
  results.push({
    test: name,
    passed,
    details,
  });
}

function sameMembers(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

async function runChecks(adminClient, contractorClient, context) {
  const results = [];
  const own = context.ownContractorId;
  const other = seedIds.otherContractor;

  const adminContractors = await selectIds(adminClient, "contractors", "id", [
    own,
    other,
  ]);
  record(
    results,
    "Admin can read both fake contractors",
    sameMembers(adminContractors, [other, own].sort()),
    adminContractors.join(", "),
  );

  const contractorContractors = await selectIds(
    contractorClient,
    "contractors",
    "id",
    [own, other],
  );
  record(
    results,
    "Contractor can read only own contractor row",
    sameMembers(contractorContractors, [own]),
    contractorContractors.join(", "),
  );

  const contractorProjects = await selectIds(contractorClient, "projects", "id", [
    seedIds.ownProject,
    seedIds.otherProject,
  ]);
  record(
    results,
    "Contractor can read only assigned project",
    sameMembers(contractorProjects, [seedIds.ownProject]),
    contractorProjects.join(", "),
  );

  const contractorAssignments = await selectIds(
    contractorClient,
    "contractor_projects",
    "id",
    [seedIds.ownContractorProject, seedIds.otherContractorProject],
  );
  record(
    results,
    "Contractor can read only own assignment",
    sameMembers(contractorAssignments, [seedIds.ownContractorProject]),
    contractorAssignments.join(", "),
  );

  const contractorDocuments = await selectIds(
    contractorClient,
    "contractor_documents",
    "id",
    [seedIds.ownDocument, seedIds.otherDocument],
  );
  record(
    results,
    "Contractor can read only own document metadata",
    sameMembers(contractorDocuments, [seedIds.ownDocument]),
    contractorDocuments.join(", "),
  );

  const contractorTimesheets = await selectIds(
    contractorClient,
    "timesheets",
    "id",
    [seedIds.ownTimesheet, seedIds.otherTimesheet],
  );
  record(
    results,
    "Contractor can read only own timesheet",
    sameMembers(contractorTimesheets, [seedIds.ownTimesheet]),
    contractorTimesheets.join(", "),
  );

  const contractorEntries = await selectIds(
    contractorClient,
    "timesheet_entries",
    "id",
    [seedIds.ownEntry, seedIds.otherEntry],
  );
  record(
    results,
    "Contractor can read only own timesheet entry",
    sameMembers(contractorEntries, [seedIds.ownEntry]),
    contractorEntries.join(", "),
  );

  const contractorStatements = await selectIds(
    contractorClient,
    "payment_statements",
    "id",
    [seedIds.ownStatement, seedIds.otherStatement],
  );
  record(
    results,
    "Contractor can read only own payment statement",
    sameMembers(contractorStatements, [seedIds.ownStatement]),
    contractorStatements.join(", "),
  );

  const contractorInvoices = await selectIds(contractorClient, "invoices", "id", [
    seedIds.ownInvoice,
    seedIds.otherInvoice,
  ]);
  record(
    results,
    "Contractor can read only own invoice",
    sameMembers(contractorInvoices, [seedIds.ownInvoice]),
    contractorInvoices.join(", "),
  );

  const contractorPaymentInvoiceIds = await selectPaymentInvoiceIds(
    contractorClient,
    [seedIds.ownInvoice, seedIds.otherInvoice],
  );
  record(
    results,
    "Contractor can read only own payment status",
    sameMembers(contractorPaymentInvoiceIds, [seedIds.ownInvoice]),
    contractorPaymentInvoiceIds.join(", "),
  );

  const contractorAuditLogs = await selectIds(
    contractorClient,
    "audit_logs",
    "id",
    [seedIds.auditLog],
  );
  record(
    results,
    "Contractor cannot read audit logs",
    contractorAuditLogs.length === 0,
    contractorAuditLogs.join(", "),
  );

  return results;
}

function printResults(results) {
  console.table(
    results.map((result) => ({
      Status: result.passed ? "PASS" : "FAIL",
      Test: result.test,
      Details: result.details,
    })),
  );
}

const admin = await signIn(adminEmail, adminPassword, "admin");
const contractorProfile = await readRequiredProfile(
  admin.supabase,
  contractorEmail,
  "contractor",
);

console.log(
  `Found active contractor profile: ${contractorProfile.email} (${contractorProfile.id})`,
);

const contractor = await signIn(
  contractorEmail,
  contractorPassword,
  "contractor",
);
const context = await seedFakeData(admin.supabase, contractor.user);
const results = await runChecks(admin.supabase, contractor.supabase, context);

printResults(results);

const failed = results.filter((result) => !result.passed);

if (failed.length > 0) {
  process.exitCode = 1;
  throw new Error(`${failed.length} Phase 5 RLS checks failed.`);
}

console.log("Phase 5 RLS verification passed with fake development data.");
