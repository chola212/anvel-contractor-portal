import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-teal-700">
            ERP Utilities Consulting Services Ltd.
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Use the recovery link sent by Supabase, then save a new password for
            your portal account.
          </p>
          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}
