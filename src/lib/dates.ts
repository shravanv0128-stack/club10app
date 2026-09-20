export const CLUB_TZ = "America/New_York";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TZ,
  weekday: "long",
  month: "short",
  day: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TZ,
  hour: "numeric",
  minute: "2-digit",
});

export function dayKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso));
}

export function dayLabel(iso: string): string {
  return dayLabelFmt.format(new Date(iso));
}

export function timeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const duration = end.getTime() - start.getTime();
  if (duration > 0 && duration % 86_400_000 === 0 && timeFmt.format(start) === "12:00 AM") {
    return "All day";
  }
  return `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diffMin = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} d ago`;
}
