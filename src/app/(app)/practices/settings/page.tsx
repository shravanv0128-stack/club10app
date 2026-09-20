import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CalendarSettings, Profile } from "@/lib/types";
import CalendarSyncForm from "./calendar-sync-form";

export default async function CalendarSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!viewer || viewer.role !== "exec") {
    redirect("/");
  }

  const { data: settings } = await supabase
    .from("calendar_settings")
    .select("*")
    .eq("singleton", true)
    .maybeSingle<CalendarSettings>();

  const { count } = await supabase
    .from("practices")
    .select("id", { count: "exact", head: true })
    .gte("starts_at", new Date().toISOString());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <Link
          href="/practices"
          className="text-xs text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Practices
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">
          Calendar sync
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Paste the club Google Calendar&apos;s secret iCal address. Practices
          are pulled from it when you sync.
        </p>
      </div>

      <CalendarSyncForm
        settings={settings ?? null}
        upcomingCount={count ?? 0}
      />
    </div>
  );
}
