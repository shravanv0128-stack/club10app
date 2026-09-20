import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dayKey, dayLabel, timeRange } from "@/lib/dates";
import type { Practice, Profile } from "@/lib/types";

const UPCOMING_DAYS = 30;

export default async function PracticesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Pick<Profile, "role">>();

  const isExec = viewer?.role === "exec";
  const now = new Date();
  const until = new Date(now.getTime() + UPCOMING_DAYS * 86_400_000);

  const { data } = await supabase
    .from("practices")
    .select("*")
    .gte("ends_at", now.toISOString())
    .lt("starts_at", until.toISOString())
    .order("starts_at", { ascending: true });

  const practices = (data ?? []) as Practice[];
  const days: { key: string; label: string; items: Practice[] }[] = [];
  for (const p of practices) {
    const key = dayKey(p.starts_at);
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(p);
    else days.push({ key, label: dayLabel(p.starts_at), items: [p] });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Practices
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Next {UPCOMING_DAYS} days.
          </p>
        </div>
        {isExec && (
          <Link
            href="/practices/settings"
            className="shrink-0 text-xs text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Calendar sync
          </Link>
        )}
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isExec ? (
            <>
              No upcoming practices.{" "}
              <Link
                href="/practices/settings"
                className="underline hover:text-black dark:hover:text-zinc-50"
              >
                Set up calendar sync
              </Link>
              .
            </>
          ) : (
            "No upcoming practices."
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.key} className="flex flex-col gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {day.label}
              </h2>
              <ul className="divide-y divide-black/[.06] rounded-xl border border-black/[.08] bg-white dark:divide-white/[.06] dark:border-white/[.08] dark:bg-[#0a0a0a]">
                {day.items.map((p) => (
                  <li key={p.id} className="flex flex-col gap-0.5 px-4 py-3">
                    <p className="text-sm font-medium text-black dark:text-zinc-50">
                      {p.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {timeRange(p.starts_at, p.ends_at)}
                      {p.location ? ` · ${p.location}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
