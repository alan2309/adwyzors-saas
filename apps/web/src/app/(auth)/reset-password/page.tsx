import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xl shadow-md">
            A
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Set new password
          </h1>
          <p className="text-sm text-zinc-400">
            Choose a strong password for your account.
          </p>
        </div>

        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-zinc-800/50" />}>
          <ResetPasswordForm />
        </Suspense>

        <div className="text-center text-xs text-zinc-500">
          Powered by Adwyzors. All rights reserved.
        </div>
      </div>
    </main>
  );
}
