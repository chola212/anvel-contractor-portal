"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

import { passwordRules, passwordSchema } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/client";

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

type ResetStatus = "idle" | "submitting" | "success" | "error";

export function ResetPasswordForm() {
  const [status, setStatus] = useState<ResetStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string[];
    confirmPassword?: string[];
  }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      setStatus("error");
      setMessage("Check the new password and try again.");
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("error");
      setMessage(
        "Open this page from the latest password reset email before choosing a new password.",
      );
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      setStatus("error");
      setMessage(
        "Could not update the password. The reset link may have expired.",
      );
      return;
    }

    await supabase.auth.signOut();
    event.currentTarget.reset();
    setStatus("success");
    setMessage("Password updated. You can now sign in with the new password.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div
          className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-700"
          aria-labelledby="password-rules-heading"
        >
          <p id="password-rules-heading" className="font-medium text-neutral-900">
            Password requirements
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {passwordRules.map((rule) => (
              <li key={rule}>{rule}.</li>
            ))}
          </ul>
        </div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-800"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        {fieldErrors.password?.map((error) => (
          <p key={error} className="text-sm text-red-700">
            {error}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-neutral-800"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        {fieldErrors.confirmPassword?.map((error) => (
          <p key={error} className="text-sm text-red-700">
            {error}
          </p>
        ))}
      </div>

      {message ? (
        <div
          role="status"
          className={
            status === "success"
              ? "rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting" || status === "success"}
        className="w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {status === "submitting" ? "Updating password..." : "Update password"}
      </button>

      <p className="text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-teal-800 hover:text-teal-900">
          Return to sign in
        </Link>
      </p>
    </form>
  );
}
