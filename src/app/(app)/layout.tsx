import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<Profile["role"], string> = {
  pending: "Pending",
  member: "Member",
  captain: "Captain",
  exec: "Exec",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error) {
    console.error("[app layout] profile lookup failed", {
      userId: user.id,
      email: user.email,
      error,
    });
  }

  if (!profile || profile.role === "pending") {
    redirect("/pending-approval");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.08]">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-black dark:text-zinc-50">
            Club10
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Dashboard
            </Link>
            <Link
              href="/practices"
              className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Practices
            </Link>
            {profile.role === "exec" && (
              <Link
                href="/roster"
                className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Roster
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span>{profile.full_name ?? profile.email}</span>
            <span className="rounded-full border border-black/[.08] px-2 py-0.5 text-xs text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              {ROLE_LABEL[profile.role]}
            </span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border border-black/[.08] px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
