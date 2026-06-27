const baseUrl = normalizeBaseUrl(
  process.env.SMOKE_BASE_URL ?? "http://localhost:3000",
);
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS ?? "10000", 10);

const publicPageChecks = [
  {
    path: "/login",
    expectedText: "ANVEL Contractor Portal",
    label: "login page",
  },
  {
    path: "/forgot-password",
    expectedText: "ANVEL Contractor Portal",
    label: "forgot password page",
  },
  {
    path: "/reset-password",
    expectedText: "Password requirements",
    label: "reset password page",
  },
];

const protectedRoutes = [
  "/",
  "/profile",
  "/contractors",
  "/projects",
  "/documents",
  "/timesheets",
  "/invoices",
  "/payments",
  "/exports",
  "/settings",
];

const userAgent = "anvel-route-smoke-test/1.0";

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function urlFor(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(urlFor(path), {
      ...options,
      headers: {
        "user-agent": userAgent,
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPublicPage({ path, expectedText, label }) {
  const response = await fetchWithTimeout(path);

  if (!response.ok) {
    throw new Error(
      `${label} returned ${response.status}; expected a successful response.`,
    );
  }

  const body = await response.text();

  if (!body.includes(expectedText)) {
    throw new Error(`${label} did not include expected page text.`);
  }

  return `${label} loaded`;
}

async function checkHealthEndpoint() {
  const response = await fetchWithTimeout("/api/health/supabase");

  if (!response.ok) {
    throw new Error(
      `Supabase health endpoint returned ${response.status}; expected 200.`,
    );
  }

  const payload = await response.json();

  if (!payload.ok || !payload.supabaseUrlConfigured || !payload.authClientReady) {
    throw new Error(
      `Supabase health endpoint is not ready: ${JSON.stringify(payload)}`,
    );
  }

  return "Supabase health endpoint is ready";
}

async function checkProtectedRoute(path) {
  const response = await fetchWithTimeout(path, {
    redirect: "manual",
  });
  const location = response.headers.get("location") ?? "";

  if (![302, 303, 307, 308].includes(response.status)) {
    throw new Error(
      `${path} returned ${response.status}; expected an anonymous redirect to login.`,
    );
  }

  if (!location.includes("/login")) {
    throw new Error(
      `${path} redirected to ${location || "an empty location"}; expected /login.`,
    );
  }

  return `${path} redirects anonymous users to login`;
}

async function run() {
  const checks = [
    ...publicPageChecks.map((check) => () => checkPublicPage(check)),
    checkHealthEndpoint,
    ...protectedRoutes.map((path) => () => checkProtectedRoute(path)),
  ];

  console.log(`Running anonymous route smoke test against ${baseUrl}`);

  for (const check of checks) {
    const message = await check();
    console.log(`OK ${message}`);
  }

  console.log("Anonymous route smoke test passed.");
}

run().catch((error) => {
  console.error("Anonymous route smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
