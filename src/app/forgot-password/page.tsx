import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/auth/profile";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-teal-700">
            ERP Utilities Consulting Services Ltd.
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Reset password
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Enter the email address for your ANVEL portal account. If the
            account exists, Supabase will send a reset link.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}
