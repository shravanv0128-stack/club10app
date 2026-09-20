"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function updateProfile(
  profileId: string,
  updates: { role?: Role; tier?: string | null; title?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidatePath("/roster");
}

export async function approveProfile(profileId: string, role: Role) {
  await updateProfile(profileId, { role });
}

export async function rejectProfile(profileId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidatePath("/roster");
}

export async function setCaptainRosterGroup(
  captainId: string,
  rosterGroup: string,
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("captain_assignments")
    .select("id")
    .eq("captain_id", captainId)
    .maybeSingle();

  if (!rosterGroup.trim()) {
    if (existing) {
      await supabase
        .from("captain_assignments")
        .delete()
        .eq("id", existing.id);
    }
    revalidatePath("/roster");
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from("captain_assignments")
      .update({ roster_group: rosterGroup })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("captain_assignments")
      .insert({ captain_id: captainId, roster_group: rosterGroup });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/roster");
}
