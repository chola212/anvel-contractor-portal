import { requireRole } from "@/lib/auth/profile";
import Link from "next/link";

export default async function SettingsPage() {
  await requireRole(["admin"]);

  const vercelEnvironment = process.env.VERCEL_ENV ?? "local";
  const nodeEnvironment = process.env.NODE_ENV ?? "unknown";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Settings
        </h1>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">
          Company invoice settings
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Company, VAT and bank details for outgoing invoices.
        </p>
        <Link
          href="/settings/company"
          className="mt-4 inline-flex rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white"
        >
          Open company invoice settings
        </Link>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-950">
          Advanced details
        </h2>
        <dl className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-neutral-500">Vercel environment</dt>
            <dd className="mt-1 font-medium capitalize text-neutral-950">
              {vercelEnvironment}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-neutral-500">Runtime mode</dt>
            <dd className="mt-1 font-medium capitalize text-neutral-950">
              {nodeEnvironment}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
