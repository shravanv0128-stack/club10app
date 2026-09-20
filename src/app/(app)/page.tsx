import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dayLabel, timeRange } from "@/lib/dates";
import type { Practice, Profile } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: next } = await supabase
    .from("practices")
    .select("*")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle<Practice>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Welcome, {profile?.full_name ?? profile?.email}
      </h1>

      <Link
        href="/practices"
        className="flex flex-col gap-1 rounded-xl border border-black/[.08] bg-white p-5 transition-colors hover:bg-black/[.02] dark:border-white/[.08] dark:bg-[#0a0a0a] dark:hover:bg-[#111]"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Next practice
        </span>
        {next ? (
          <>
            <span className="text-base font-semibold text-black dark:text-zinc-50">
              {next.title}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {dayLabel(next.starts_at)} · {timeRange(next.starts_at, next.ends_at)}
              {next.location ? ` · ${next.location}` : ""}
            </span>
          </>
        ) : (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            No upcoming practices.
          </span>
        )}
      </Link>

      {profile?.role === "exec" && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Use{" "}
          <Link
            href="/roster"
            className="underline hover:text-black dark:hover:text-zinc-50"
          >
            Roster
          </Link>{" "}
          to manage the team.
        </p>
      )}
    </div>
  );
}
