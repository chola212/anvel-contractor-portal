import { logoutAction } from "@/app/auth/actions";

export default function AccountRequiredPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
        <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-teal-700">
            ANVEL Contractor Portal
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Account profile required
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Your login exists, but the portal cannot find an active profile and
            role for this account. Ask an admin to finish setting up your
            portal access.
          </p>
          <form action={logoutAction} className="mt-6">
            <button
              type="submit"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-100"
            >
              Sign out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
