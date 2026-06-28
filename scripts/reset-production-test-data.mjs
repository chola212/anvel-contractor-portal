import { createClient } from "@supabase/supabase-js";

const requiredFlag = "YES_DELETE_TEST_DATA";
const optionalAuthPruneFlag = "YES_DELETE_EXTRA_AUTH_USERS";
const preservedAdminEmail = "andres@anvelconsulting.com";
const preservedContractorEmail = "andresvelascofdez@gmail.com";

if (process.env.ALLOW_PRODUCTION_TEST_DATA_RESET !== requiredFlag) {
  console.error(
    `Refusing to reset data. Set ALLOW_PRODUCTION_TEST_DATA_RESET=${requiredFlag} to continue.`,
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

const operationalTables = [
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

const countedTables = [
  ...operationalTables,
  "contractors",
  "profiles",
  "document_requirements",
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

async function printCounts(label) {
  const counts = {};

  for (const table of countedTables) {
    counts[table] = await countRows(table);
  }

  console.log(label);
  console.table(counts);
}

async function deleteAllRows(table) {
  const { error } = await supabase.from(table).delete().not("id", "is", null);

  if (error) {
    throw new Error(`Could not delete ${table}: ${error.message}`);
  }
}

async function deleteRowsById(table, ids) {
  for (let index = 0; index < ids.length; index += 100) {
    const batch = ids.slice(index, index + 100);

    if (batch.length === 0) {
      continue;
    }

    const { error } = await supabase.from(table).delete().in("id", batch);

    if (error) {
      throw new Error(`Could not delete ${table}: ${error.message}`);
    }
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

  for (let index = 0; index < files.length; index += 100) {
    const batch = files.slice(index, index + 100);
    const { error } = await supabase.storage.from(bucket).remove(batch);

    if (error) {
      throw new Error(`Could not remove files from ${bucket}: ${error.message}`);
    }
  }

  return files.length;
}

async function loadPreservedRecords() {
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,role,is_active")
    .in("email", [preservedAdminEmail, preservedContractorEmail]);

  if (profileError) {
    throw new Error(`Could not load preserved profiles: ${profileError.message}`);
  }

  const adminProfile = profiles.find(
    (profile) => profile.email === preservedAdminEmail,
  );
  const contractorProfile = profiles.find(
    (profile) => profile.email === preservedContractorEmail,
  );

  if (!adminProfile || !contractorProfile) {
    throw new Error(
      "Both preserved profile rows must exist before running the reset.",
    );
  }

  if (adminProfile.role !== "admin" || !adminProfile.is_active) {
    throw new Error("The preserved admin profile must be active and role=admin.");
  }

  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select("id,profile_id,email")
    .eq("profile_id", contractorProfile.id)
    .maybeSingle();

  if (contractorError || !contractor) {
    throw new Error(
      contractorError?.message ??
        "The preserved contractor row linked to the preserved contractor profile was not found.",
    );
  }

  return { adminProfile, contractorProfile, contractor };
}

async function deleteExtraContractorsAndProfiles(preserved) {
  const { data: contractors, error: contractorError } = await supabase
    .from("contractors")
    .select("id");

  if (contractorError) {
    throw new Error(`Could not load contractors: ${contractorError.message}`);
  }

  await deleteRowsById(
    "contractors",
    contractors
      .map((contractor) => contractor.id)
      .filter((id) => id !== preserved.contractor.id),
  );

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email");

  if (profileError) {
    throw new Error(`Could not load profiles: ${profileError.message}`);
  }

  const preservedProfileIds = new Set([
    preserved.adminProfile.id,
    preserved.contractorProfile.id,
  ]);

  await deleteRowsById(
    "profiles",
    profiles
      .map((profile) => profile.id)
      .filter((id) => !preservedProfileIds.has(id)),
  );
}

async function optionallyDeleteExtraAuthUsers() {
  if (process.env.ALLOW_AUTH_USER_PRUNE !== optionalAuthPruneFlag) {
    console.log(
      `Auth user pruning skipped. Set ALLOW_AUTH_USER_PRUNE=${optionalAuthPruneFlag} to delete extra auth users.`,
    );
    return;
  }

  const preservedEmails = new Set([
    preservedAdminEmail.toLowerCase(),
    preservedContractorEmail.toLowerCase(),
  ]);
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(`Could not list auth users: ${error.message}`);
    }

    for (const user of data.users) {
      const email = user.email?.toLowerCase();

      if (!email || preservedEmails.has(email)) {
        continue;
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        user.id,
      );

      if (deleteError) {
        throw new Error(
          `Could not delete auth user ${email}: ${deleteError.message}`,
        );
      }
    }

    if (data.users.length < 100) {
      break;
    }

    page += 1;
  }
}

async function verifyReset() {
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,role,is_active")
    .order("email", { ascending: true });

  if (profileError) {
    throw new Error(`Could not verify profiles: ${profileError.message}`);
  }

  const profileEmails = profiles.map((profile) => profile.email).sort();
  const expectedEmails = [preservedAdminEmail, preservedContractorEmail].sort();

  if (JSON.stringify(profileEmails) !== JSON.stringify(expectedEmails)) {
    throw new Error(`Unexpected profile emails remain: ${profileEmails.join(", ")}`);
  }

  const { data: contractors, error: contractorError } = await supabase
    .from("contractors")
    .select("id,profile_id,email");

  if (contractorError) {
    throw new Error(`Could not verify contractors: ${contractorError.message}`);
  }

  if (contractors.length !== 1) {
    throw new Error(`Expected one contractor row, found ${contractors.length}.`);
  }

  const contractorProfile = profiles.find(
    (profile) => profile.email === preservedContractorEmail,
  );

  if (contractors[0].profile_id !== contractorProfile.id) {
    throw new Error("Remaining contractor is not linked to the preserved contractor profile.");
  }

  for (const table of operationalTables) {
    const count = await countRows(table);

    if (count !== 0) {
      throw new Error(`Expected ${table} to be empty, found ${count}.`);
    }
  }
}

async function main() {
  console.log("Production test data reset starting.");
  console.log(`Preserving admin profile/auth user: ${preservedAdminEmail}`);
  console.log(`Preserving contractor profile/auth user: ${preservedContractorEmail}`);

  const preserved = await loadPreservedRecords();
  await printCounts("Counts before deletion");

  const documentFiles = await clearBucket("contractor-documents");
  const invoiceFiles = await clearBucket("contractor-invoices");
  const outgoingInvoiceFiles = await clearBucket("outgoing-invoices");

  for (const table of operationalTables) {
    await deleteAllRows(table);
  }

  await deleteExtraContractorsAndProfiles(preserved);
  await optionallyDeleteExtraAuthUsers();
  await verifyReset();
  await printCounts("Counts after deletion");

  console.log(`Removed ${documentFiles} contractor document file(s).`);
  console.log(`Removed ${invoiceFiles} contractor invoice file(s).`);
  console.log(`Removed ${outgoingInvoiceFiles} outgoing invoice file(s).`);
  console.log("Production test data reset complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
