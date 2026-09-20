"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseIcal } from "@/lib/ical";
import type { CalendarSettings } from "@/lib/types";

const FETCH_TIMEOUT_MS = 15_000;
const WINDOW_PAST_DAYS = 60;
const WINDOW_FUTURE_DAYS = 180;

type ActionResult = { error?: string };
export type SyncResult = ActionResult & { upserted?: number; removed?: number };

async function requireExec() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  return { supabase, user: profile?.role === "exec" ? user : null };
}

function normalizeIcalUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (value.toLowerCase().startsWith("webcal://")) {
    value = "https://" + value.slice("webcal://".length);
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function saveCalendarUrl(rawUrl: string): Promise<ActionResult> {
  const { supabase, user } = await requireExec();
  if (!user) return { error: "Only exec can change calendar settings." };

  const url = normalizeIcalUrl(rawUrl);
  if (!url) return { error: "Enter an https:// or webcal:// iCal URL." };

  const { error } = await supabase
    .from("calendar_settings")
    .upsert(
      {
        singleton: true,
        ical_url: url,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "singleton" },
    );

  if (error) return { error: error.message };
  revalidatePath("/practices/settings");
  return {};
}

async function fetchIcs(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "text/calendar, text/plain;q=0.9, */*;q=0.1" },
    });
    if (!res.ok) throw new Error(`Calendar returned HTTP ${res.status}`);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      throw new Error("URL did not return an iCal feed");
    }
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timed out fetching the calendar");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function syncCalendar(): Promise<SyncResult> {
  const { supabase, user } = await requireExec();
  if (!user) return { error: "Only exec can sync the calendar." };

  const { data: settings } = await supabase
    .from("calendar_settings")
    .select("*")
    .eq("singleton", true)
    .maybeSingle<CalendarSettings>();

  if (!settings) return { error: "Save an iCal URL first." };

  const now = Date.now();
  const window = {
    from: new Date(now - WINDOW_PAST_DAYS * 86_400_000),
    to: new Date(now + WINDOW_FUTURE_DAYS * 86_400_000),
  };

  let result: SyncResult;
  try {
    const ics = await fetchIcs(settings.ical_url);
    const events = parseIcal(ics, window);
    const syncedAt = new Date().toISOString();

    const rows = events.map((e) => ({
      external_uid: e.externalUid,
      title: e.title,
      location: e.location,
      starts_at: e.startsAt.toISOString(),
      ends_at: e.endsAt.toISOString(),
      updated_at: syncedAt,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("practices")
        .upsert(rows, { onConflict: "external_uid" });
      if (error) throw new Error(error.message);
    }

    const { data: existing, error: selectError } = await supabase
      .from("practices")
      .select("id, external_uid")
      .gte("starts_at", window.from.toISOString())
      .lt("starts_at", window.to.toISOString());
    if (selectError) throw new Error(selectError.message);

    const keep = new Set(rows.map((r) => r.external_uid));
    const staleIds = (existing ?? [])
      .filter((p) => !keep.has(p.external_uid))
      .map((p) => p.id);

    if (staleIds.length > 0) {
      const { error } = await supabase
        .from("practices")
        .delete()
        .in("id", staleIds);
      if (error) throw new Error(error.message);
    }

    result = { upserted: rows.length, removed: staleIds.length };

    await supabase
      .from("calendar_settings")
      .update({ last_synced_at: syncedAt, last_sync_error: null })
      .eq("id", settings.id);

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "calendar_sync",
      target_type: "practices",
      new_value: {
        upserted: rows.length,
        removed: staleIds.length,
        window_from: window.from.toISOString(),
        window_to: window.to.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await supabase
      .from("calendar_settings")
      .update({ last_sync_error: message })
      .eq("id", settings.id);
    result = { error: message };
  }

  revalidatePath("/");
  revalidatePath("/practices");
  revalidatePath("/practices/settings");
  return result;
}
