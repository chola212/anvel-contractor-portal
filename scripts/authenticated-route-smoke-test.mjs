import { createServerClient } from "@supabase/ssr";

const baseUrl = normalizeBaseUrl(
  process.env.SMOKE_BASE_URL ?? "http://localhost:3000",
);
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS ?? "10000", 10);
const adminCookie = process.env.SMOKE_ADMIN_COOKIE;
const contractorCookie = process.env.SMOKE_CONTRACTOR_COOKIE;
const adminEmail = process.env.SMOKE_ADMIN_EMAIL;
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
const contractorEmail = process.env.SMOKE_CONTRACTOR_EMAIL;
const contractorPassword = process.env.SMOKE_CONTRACTOR_PASSWORD;
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const userAgent = "anvel-authenticated-route-smoke-test/1.0";

const adminAccessibleRoutes = [
  { path: "/", expectedText: "Contractor operations workspace" },
  { path: "/contractors", expectedText: "Contractors" },
  { path: "/projects", expectedText: "Projects" },
  { path: "/documents", expectedText: "Documents" },
  { path: "/timesheets", expectedText: "Timesheets" },
  { path: "/invoices", expectedText: "Invoices" },
  { path: "/payments", expectedText: "Payments" },
  { path: "/exports", expectedText: "Exports" },
  { path: "/settings", expectedText: "Settings" },
];

const contractorAccessibleRoutes = [
  { path: "/", expectedText: "Contractor operations workspace" },
  { path: "/profile", expectedText: "My Profile" },
  { path: "/documents", expectedText: "Documents" },
  { path: "/timesheets", expectedText: "Timesheets" },
  { path: "/invoices", expectedText: "Invoices" },
  { path: "/payments", expectedText: "Payments" },
];

const contractorBlockedRoutes = [
  "/contractors",
  "/projects",
  "/exports",
  "/settings",
];

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function urlFor(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

function missingAuthMessage(role) {
  const prefix = role.toUpperCase();

  return [
    `Missing ${role} smoke-test authentication.`,
    `Set SMOKE_${prefix}_COOKIE, or set SMOKE_${prefix}_EMAIL and SMOKE_${prefix}_PASSWORD.`,
    "When using email/password, also set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    "Set SMOKE_BASE_URL to the app URL under test, for example http://localhost:3000.",
    "Use dedicated fake-data smoke accounts only. Do not save passwords or cookies in files, GitHub, chat, or documentation.",
  ].join(" ");
}

function cookieHeaderFromJar(cookieJar) {
  return [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function signInAndCreateCookie(role, email, password) {
  if (!email || !password) {
    throw new Error(missingAuthMessage(role));
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      [
        "Missing Supabase browser configuration for smoke-test sign-in.",
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      ].join(" "),
    );
  }

  const cookieJar = new Map();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return [...cookieJar.entries()].map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookieJar.set(name, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`${role} smoke-test sign-in failed: ${error.message}`);
  }

  const cookie = cookieHeaderFromJar(cookieJar);

  if (!cookie) {
    throw new Error(`${role} smoke-test sign-in did not create auth cookies.`);
  }

  return cookie;
}

async function resolveAuthCookie(role, cookie, email, password) {
  if (cookie) {
    return cookie;
  }

  return signInAndCreateCookie(role, email, password);
}

async function resolveAuthCookies() {
  const [resolvedAdminCookie, resolvedContractorCookie] = await Promise.all([
    resolveAuthCookie("admin", adminCookie, adminEmail, adminPassword),
    resolveAuthCookie(
      "contractor",
      contractorCookie,
      contractorEmail,
      contractorPassword,
    ),
  ]);

  return { resolvedAdminCookie, resolvedContractorCookie };
}

async function fetchWithCookie(path, cookie) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlFor(path), {
      redirect: "manual",
      headers: {
        cookie,
        "user-agent": userAgent,
      },
      signal: controller.signal,
    });
    const body = await response.text();

    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkAccessible(role, cookie, { path, expectedText }) {
  const { response, body } = await fetchWithCookie(path, cookie);

  if (!response.ok) {
    throw new Error(
      `${role} ${path} returned ${response.status}; expected a successful response.`,
    );
  }

  if (!body.includes(expectedText)) {
    throw new Error(
      `${role} ${path} did not include expected page text: ${expectedText}.`,
    );
  }

  return `${role} can open ${path}`;
}

async function checkBlocked(role, cookie, path) {
  const { response, body } = await fetchWithCookie(path, cookie);
  const blockedStatuses = [301, 302, 303, 307, 308, 401, 403, 404];

  if (blockedStatuses.includes(response.status)) {
    return `${role} is blocked from ${path} with ${response.status}`;
  }

  if (
    response.ok &&
    (body.includes("Account required") ||
      body.includes("not available for this role"))
  ) {
    return `${role} is blocked from ${path} by page content`;
  }

  throw new Error(
    `${role} ${path} returned ${response.status}; expected it to be blocked.`,
  );
}

async function run() {
  const { resolvedAdminCookie, resolvedContractorCookie } =
    await resolveAuthCookies();

  console.log(`Running authenticated route smoke test against ${baseUrl}`);
  console.log("Credentials and cookie values are intentionally not printed.");

  for (const route of adminAccessibleRoutes) {
    const message = await checkAccessible("admin", resolvedAdminCookie, route);
    console.log(`OK ${message}`);
  }

  for (const route of contractorAccessibleRoutes) {
    const message = await checkAccessible(
      "contractor",
      resolvedContractorCookie,
      route,
    );
    console.log(`OK ${message}`);
  }

  for (const path of contractorBlockedRoutes) {
    const message = await checkBlocked(
      "contractor",
      resolvedContractorCookie,
      path,
    );
    console.log(`OK ${message}`);
  }

  console.log("Authenticated route smoke test passed.");
}

run().catch((error) => {
  console.error("Authenticated route smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
