"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "./actions";

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    null
  );

  if (state?.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-900/50 bg-green-950/30 p-4 text-sm text-green-400">
          If an account with that email exists, we&apos;ve sent a password reset
          link. Check your inbox (or terminal in dev mode).
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-400"
        >
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full justify-center rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Send Reset Link"}
      </button>

      <Link
        href="/login"
        className="block text-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        Back to Sign In
      </Link>
    </form>
  );
}
