"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const error = params.get("error");

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: "princeton.edu" },
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Club10
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in with your Princeton Google account.
        </p>
      </div>
      {error && (
        <p className="max-w-sm text-sm text-red-600 dark:text-red-400">
          {error === "domain"
            ? "Only @princeton.edu accounts are allowed."
            : "Something went wrong signing you in."}
        </p>
      )}
      <button
        onClick={signInWithGoogle}
        className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Sign in with Google
      </button>
      <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-500">
        The `hd` hint above only narrows Google&apos;s account picker.
        Domain restriction is enforced server-side in the auth callback,
        which signs out and rejects any non-@princeton.edu account.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
