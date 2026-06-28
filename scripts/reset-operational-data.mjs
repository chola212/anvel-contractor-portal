import { createClient } from "@supabase/supabase-js";

const requiredFlag = "YES_DELETE_OPERATIONAL_DATA";

if (process.env.ALLOW_OPERATIONAL_DATA_RESET !== requiredFlag) {
  console.error(
    `Refusing to reset data. Set ALLOW_OPERATIONAL_DATA_RESET=${requiredFlag} to continue.`,
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. This script must use server-only credentials.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const tables = [
  "outgoing_invoice_lines",
  "outgoing_invoices",
  "payments",
  "invoices",
  "payment_statements",
  "timesheet_entries",
  "timesheets",
  "contractor_documents",
  "contractor_project_commercials",
  "contractor_projects",
  "project_billing_details",
  "projects",
  "audit_logs",
];

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Could not count ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function deleteRows(table) {
  const { error } = await supabase.from(table).delete().not("id", "is", null);

  if (error) {
    throw new Error(`Could not delete ${table}: ${error.message}`);
  }
}

async function listStorageFiles(bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw new Error(`Could not list ${bucket}/${prefix}: ${error.message}`);
  }

  const files = [];

  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      files.push(...(await listStorageFiles(bucket, path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

async function clearBucket(bucket) {
  const files = await listStorageFiles(bucket);

  if (files.length === 0) {
    return 0;
  }

  for (let index = 0; index < files.length; index += 100) {
    const batch = files.slice(index, index + 100);
    const { error } = await supabase.storage.from(bucket).remove(batch);

    if (error) {
      throw new Error(`Could not remove files from ${bucket}: ${error.message}`);
    }
  }

  return files.length;
}

async function main() {
  console.log("Operational data reset starting. Contractors, profiles and auth users are preserved.");
  const before = new Map();

  for (const table of tables) {
    before.set(table, await countRows(table));
  }

  console.table(Object.fromEntries(before));

  const documentFiles = await clearBucket("contractor-documents");
  const invoiceFiles = await clearBucket("contractor-invoices");
  const outgoingInvoiceFiles = await clearBucket("outgoing-invoices");

  for (const table of tables) {
    await deleteRows(table);
  }

  const after = new Map();

  for (const table of tables) {
    after.set(table, await countRows(table));
  }

  console.table(Object.fromEntries(after));
  console.log(`Removed ${documentFiles} contractor document file(s).`);
  console.log(`Removed ${invoiceFiles} contractor invoice file(s).`);
  console.log(`Removed ${outgoingInvoiceFiles} outgoing invoice file(s).`);
  console.log("Operational data reset complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
