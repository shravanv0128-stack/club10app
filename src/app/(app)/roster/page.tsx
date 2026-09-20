import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import RosterTable from "./roster-table";
import PendingApprovals from "./pending-approvals";

export default async function RosterPage() {
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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  const { data: captainAssignments } = await supabase
    .from("captain_assignments")
    .select("captain_id, roster_group");

  const all = (profiles ?? []) as Profile[];
  const pending = all.filter((p) => p.role === "pending");
  const roster = all.filter((p) => p.role !== "pending");
  const rosterGroups: Record<string, string> = Object.fromEntries(
    (captainAssignments ?? []).map((c) => [c.captain_id, c.roster_group]),
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Roster
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage roles, tiers, and pending signups.
        </p>
      </div>

      {pending.length > 0 && <PendingApprovals profiles={pending} />}

      <RosterTable profiles={roster} rosterGroups={rosterGroups} />
    </div>
  );
}
