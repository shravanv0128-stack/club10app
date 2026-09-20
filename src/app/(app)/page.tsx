import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Welcome, {profile?.full_name ?? profile?.email}
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {profile?.role === "exec"
          ? "Use Roster to manage the team."
          : "Nothing here yet — more is on the way."}
      </p>
    </div>
  );
}
