"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "@/app/login/actions";

type LoginFormProps = {
  nextPath?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const initialLoginState: LoginState = {
    message: null,
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(loginAction, initialLoginState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath ?? "/"} />

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

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-800"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-teal-800 hover:text-teal-900"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        />
        {state.fieldErrors.password?.map((error) => (
          <p key={error} className="text-sm text-red-700">
            {error}
          </p>
        ))}
      </div>

      {state.message ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
