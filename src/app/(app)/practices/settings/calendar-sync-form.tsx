"use client";

import { useState, useTransition } from "react";
import type { CalendarSettings } from "@/lib/types";
import { relativeTime } from "@/lib/dates";
import { saveCalendarUrl, syncCalendar } from "../actions";

export default function CalendarSyncForm({
  settings,
  upcomingCount,
}: {
  settings: CalendarSettings | null;
  upcomingCount: number;
}) {
  const [url, setUrl] = useState(settings?.ical_url ?? "");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const savedUrl = settings?.ical_url ?? "";
  const dirty = url.trim() !== savedUrl;

  function save() {
    startTransition(async () => {
      const res = await saveCalendarUrl(url);
      setMessage(
        res.error ? { text: res.error, error: true } : { text: "Saved.", error: false },
      );
    });
  }

  function sync() {
    startTransition(async () => {
      const res = await syncCalendar();
      setMessage(
        res.error
          ? { text: res.error, error: true }
          : {
              text: `Synced · ${res.upserted} updated · ${res.removed} removed`,
              error: false,
            },
      );
    });
  }

  const status = message
    ? message
    : settings?.last_sync_error
      ? { text: `Last sync failed: ${settings.last_sync_error}`, error: true }
      : settings?.last_synced_at
        ? {
            text: `Last synced ${relativeTime(settings.last_synced_at)} · ${upcomingCount} upcoming practice${upcomingCount === 1 ? "" : "s"}`,
            error: false,
          }
        : { text: "Never synced.", error: false };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.08] dark:bg-[#0a0a0a]">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          iCal URL
        </span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirty && save()}
          placeholder="https://calendar.google.com/calendar/ical/.../private-.../basic.ics"
          disabled={isPending}
          className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={isPending || !dirty}
          className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Save
        </button>
        <button
          onClick={sync}
          disabled={isPending || !savedUrl || dirty}
          className="rounded-full border border-black/[.08] px-4 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          {isPending ? "Working…" : "Sync now"}
        </button>
      </div>

      <p
        className={`text-xs ${
          status.error
            ? "text-red-600 dark:text-red-400"
            : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {status.text}
      </p>
    </div>
  );
}
