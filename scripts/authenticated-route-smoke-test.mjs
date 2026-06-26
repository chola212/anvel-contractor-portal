const baseUrl = normalizeBaseUrl(
  process.env.SMOKE_BASE_URL ?? "http://localhost:3000",
);
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS ?? "10000", 10);
const adminCookie = process.env.SMOKE_ADMIN_COOKIE;
const contractorCookie = process.env.SMOKE_CONTRACTOR_COOKIE;

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

function assertCookiesPresent() {
  const missing = [];

  if (!adminCookie) {
    missing.push("SMOKE_ADMIN_COOKIE");
  }

  if (!contractorCookie) {
    missing.push("SMOKE_CONTRACTOR_COOKIE");
  }

  if (missing.length > 0) {
    throw new Error(
      [
        `Missing required environment variable(s): ${missing.join(", ")}.`,
        "Copy temporary browser cookies from controlled production smoke-test sessions.",
        "Do not save cookies in files, GitHub, chat, or documentation.",
        "See 14_AUTHENTICATED_ROUTE_SMOKE_TEST_RUNBOOK.md for the exact steps.",
      ].join(" "),
    );
  }
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
  assertCookiesPresent();

  console.log(`Running authenticated route smoke test against ${baseUrl}`);
  console.log("Cookie values are intentionally not printed.");

  for (const route of adminAccessibleRoutes) {
    const message = await checkAccessible("admin", adminCookie, route);
    console.log(`OK ${message}`);
  }

  for (const route of contractorAccessibleRoutes) {
    const message = await checkAccessible(
      "contractor",
      contractorCookie,
      route,
    );
    console.log(`OK ${message}`);
  }

  for (const path of contractorBlockedRoutes) {
    const message = await checkBlocked("contractor", contractorCookie, path);
    console.log(`OK ${message}`);
  }

  console.log("Authenticated route smoke test passed.");
}

run().catch((error) => {
  console.error("Authenticated route smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
