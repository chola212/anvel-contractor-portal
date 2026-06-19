"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/app/forgot-password/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Sending reset link..." : "Send reset link"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const initialState: ForgotPasswordState = {
    message: null,
    status: "idle",
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-800">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        {state.fieldErrors.email?.map((error) => (
          <p key={error} className="text-sm text-red-700">
            {error}
          </p>
        ))}
      </div>

      {state.message ? (
        <div
          role="status"
          className={
            state.status === "success"
              ? "rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton />

      <p className="text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-teal-800 hover:text-teal-900">
          Return to sign in
        </Link>
      </p>
    </form>
  );
}
