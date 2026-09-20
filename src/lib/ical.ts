export const DEFAULT_TZ = "America/New_York";

export type ParsedEvent = {
  externalUid: string;
  title: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
};

type Property = { name: string; params: Record<string, string>; value: string };

type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateOnly: boolean;
};

type ParsedDate = { wall: WallTime; tz: string | null; instant: Date };

const MAX_OCCURRENCES = 1000;
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function unfold(text: string): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if ((raw.startsWith(" ") || raw.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1);
    } else if (raw.length > 0) {
      lines.push(raw);
    }
  }
  return lines;
}

function parseLine(line: string): Property | null {
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(";");
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    params[part.slice(0, eq).toUpperCase()] = part
      .slice(eq + 1)
      .replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value };
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(tz, f);
  }
  return f;
}

function isValidTz(tz: string): boolean {
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

function tzOffsetMs(instant: Date, tz: string): number {
  const p: Record<string, number> = {};
  for (const { type, value } of formatter(tz).formatToParts(instant)) {
    if (type !== "literal") p[type] = Number(value);
  }
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour === 24 ? 0 : p.hour,
    p.minute,
    p.second,
  );
  return asUtc - instant.getTime();
}

function wallAsUtcMs(w: WallTime): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
}

export function wallToInstant(w: WallTime, tz: string): Date {
  const guess = wallAsUtcMs(w);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  const second = guess - tzOffsetMs(new Date(first), tz);
  return new Date(second);
}

function parseWall(value: string): WallTime | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4] ?? 0),
    minute: Number(m[5] ?? 0),
    second: Number(m[6] ?? 0),
    dateOnly: m[4] === undefined,
  };
}

function parseDate(prop: Property, value: string, defaultTz: string): ParsedDate | null {
  const wall = parseWall(value);
  if (!wall) return null;
  if (value.endsWith("Z")) {
    return { wall, tz: "UTC", instant: new Date(wallAsUtcMs(wall)) };
  }
  const tzParam = prop.params.TZID;
  const tz = tzParam && isValidTz(tzParam) ? tzParam : defaultTz;
  return { wall, tz, instant: wallToInstant(wall, tz) };
}

function parseDuration(value: string): number | null {
  const m = value.match(
    /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const ms =
    (Number(m[2] ?? 0) * 7 + Number(m[3] ?? 0)) * 86_400_000 +
    Number(m[4] ?? 0) * 3_600_000 +
    Number(m[5] ?? 0) * 60_000 +
    Number(m[6] ?? 0) * 1000;
  return sign * ms;
}

function addDays(w: WallTime, days: number): WallTime {
  const d = new Date(wallAsUtcMs(w) + days * 86_400_000);
  return {
    ...w,
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function weekdayOf(w: WallTime): number {
  return new Date(wallAsUtcMs(w)).getUTCDay();
}

type RRule = {
  freq: "DAILY" | "WEEKLY";
  interval: number;
  byDay: number[];
  count: number | null;
  until: Date | null;
  wkst: number;
};

function parseRRule(value: string, start: ParsedDate, defaultTz: string): RRule | null {
  const parts: Record<string, string> = {};
  for (const kv of value.split(";")) {
    const eq = kv.indexOf("=");
    if (eq > 0) parts[kv.slice(0, eq).toUpperCase()] = kv.slice(eq + 1);
  }
  const freq = parts.FREQ;
  if (freq !== "DAILY" && freq !== "WEEKLY") return null;

  let until: Date | null = null;
  if (parts.UNTIL) {
    const u = parseDate(
      { name: "UNTIL", params: start.tz ? { TZID: start.tz } : {}, value: parts.UNTIL },
      parts.UNTIL,
      start.tz ?? defaultTz,
    );
    if (!u) return null;
    until = u.wall.dateOnly
      ? new Date(u.instant.getTime() + 86_400_000 - 1)
      : u.instant;
  }

  const byDay = (parts.BYDAY ?? "")
    .split(",")
    .map((d) => WEEKDAYS.indexOf(d.replace(/^[+-]?\d+/, "").trim()))
    .filter((i) => i >= 0);

  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL ?? 1) || 1),
    byDay: byDay.length > 0 ? byDay : [weekdayOf(start.wall)],
    count: parts.COUNT ? Number(parts.COUNT) : null,
    until,
    wkst: Math.max(0, WEEKDAYS.indexOf(parts.WKST ?? "MO")),
  };
}

function expandRRule(
  rule: RRule,
  start: ParsedDate,
  windowEnd: Date,
): WallTime[] {
  const tz = start.tz ?? DEFAULT_TZ;
  const startMs = start.instant.getTime();
  const out: WallTime[] = [];
  const push = (w: WallTime): boolean => {
    const instant = wallToInstant(w, tz);
    if (instant.getTime() < startMs) return true;
    if (rule.until && instant.getTime() > rule.until.getTime()) return false;
    if (instant.getTime() >= windowEnd.getTime()) return false;
    out.push(w);
    if (rule.count !== null && out.length >= rule.count) return false;
    return out.length < MAX_OCCURRENCES;
  };

  if (rule.freq === "DAILY") {
    for (let i = 0; ; i += rule.interval) {
      const w = addDays(start.wall, i);
      if (rule.byDay.length < 7 && !rule.byDay.includes(weekdayOf(w))) {
        if (rule.until && wallAsUtcMs(w) > rule.until.getTime() + 86_400_000) break;
        if (wallAsUtcMs(w) > windowEnd.getTime() + 86_400_000) break;
        continue;
      }
      if (!push(w)) break;
    }
    return out;
  }

  const offsetToWeekStart = (weekdayOf(start.wall) - rule.wkst + 7) % 7;
  const weekStart = addDays(start.wall, -offsetToWeekStart);
  const dayOffsets = rule.byDay
    .map((d) => (d - rule.wkst + 7) % 7)
    .sort((a, b) => a - b);

  outer: for (let week = 0; ; week += rule.interval) {
    const base = addDays(weekStart, week * 7);
    if (wallAsUtcMs(base) > windowEnd.getTime() + 7 * 86_400_000) break;
    for (const off of dayOffsets) {
      if (!push(addDays(base, off))) break outer;
    }
  }
  return out;
}

type RawEvent = {
  uid: string;
  summary: string;
  location: string | null;
  start: ParsedDate;
  end: Date;
  rrule: string | null;
  exdates: Date[];
  recurrenceId: Date | null;
  cancelled: boolean;
};

function collectEvents(lines: string[]): { events: Property[][]; calendarTz: string | null } {
  const events: Property[][] = [];
  let calendarTz: string | null = null;
  let current: Property[] | null = null;
  let depth = 0;

  for (const line of lines) {
    const prop = parseLine(line);
    if (!prop) continue;
    if (prop.name === "BEGIN") {
      if (prop.value.toUpperCase() === "VEVENT") {
        current = [];
        depth = 0;
      } else if (current) {
        depth++;
      }
      continue;
    }
    if (prop.name === "END") {
      if (prop.value.toUpperCase() === "VEVENT" && current) {
        events.push(current);
        current = null;
      } else if (current && depth > 0) {
        depth--;
      }
      continue;
    }
    if (current) {
      if (depth === 0) current.push(prop);
    } else if (prop.name === "X-WR-TIMEZONE") {
      calendarTz = prop.value.trim();
    }
  }
  return { events, calendarTz };
}

function toRawEvent(props: Property[], defaultTz: string): RawEvent | null {
  const get = (name: string) => props.find((p) => p.name === name);
  const uid = get("UID")?.value.trim();
  const dtstartProp = get("DTSTART");
  if (!uid || !dtstartProp) return null;

  const start = parseDate(dtstartProp, dtstartProp.value.trim(), defaultTz);
  if (!start) return null;

  let end: Date | null = null;
  const dtendProp = get("DTEND");
  if (dtendProp) {
    end = parseDate(dtendProp, dtendProp.value.trim(), defaultTz)?.instant ?? null;
  }
  if (!end) {
    const durationProp = get("DURATION");
    const dur = durationProp ? parseDuration(durationProp.value.trim()) : null;
    end = new Date(
      start.instant.getTime() +
        (dur ?? (start.wall.dateOnly ? 86_400_000 : 0)),
    );
  }

  const exdates: Date[] = [];
  for (const p of props) {
    if (p.name !== "EXDATE") continue;
    for (const v of p.value.split(",")) {
      const d = parseDate(p, v.trim(), start.tz ?? defaultTz);
      if (d) exdates.push(d.instant);
    }
  }

  const ridProp = get("RECURRENCE-ID");
  const recurrenceId = ridProp
    ? (parseDate(ridProp, ridProp.value.trim(), start.tz ?? defaultTz)?.instant ?? null)
    : null;

  return {
    uid,
    summary: unescapeText(get("SUMMARY")?.value ?? "") || "Practice",
    location: unescapeText(get("LOCATION")?.value ?? "") || null,
    start,
    end,
    rrule: get("RRULE")?.value.trim() ?? null,
    exdates,
    recurrenceId,
    cancelled: (get("STATUS")?.value.trim().toUpperCase() ?? "") === "CANCELLED",
  };
}

export function parseIcal(
  text: string,
  window: { from: Date; to: Date },
  options: { defaultTz?: string } = {},
): ParsedEvent[] {
  const { events, calendarTz } = collectEvents(unfold(text));
  const defaultTz =
    options.defaultTz ??
    (calendarTz && isValidTz(calendarTz) ? calendarTz : DEFAULT_TZ);

  const raws = events
    .map((props) => toRawEvent(props, defaultTz))
    .filter((e): e is RawEvent => e !== null);

  const inWindow = (d: Date) =>
    d.getTime() >= window.from.getTime() && d.getTime() < window.to.getTime();

  const result = new Map<string, ParsedEvent>();

  for (const ev of raws) {
    if (ev.recurrenceId) continue;
    if (ev.cancelled) continue;

    if (!ev.rrule) {
      if (inWindow(ev.start.instant)) {
        result.set(ev.uid, {
          externalUid: ev.uid,
          title: ev.summary,
          location: ev.location,
          startsAt: ev.start.instant,
          endsAt: ev.end,
        });
      }
      continue;
    }

    const rule = parseRRule(ev.rrule, ev.start, defaultTz);
    if (!rule) continue;
    const durationMs = ev.end.getTime() - ev.start.instant.getTime();
    const tz = ev.start.tz ?? defaultTz;
    const excluded = new Set(ev.exdates.map((d) => d.getTime()));

    for (const wall of expandRRule(rule, ev.start, window.to)) {
      const startsAt = wallToInstant(wall, tz);
      if (excluded.has(startsAt.getTime())) continue;
      if (!inWindow(startsAt)) continue;
      const key = `${ev.uid}|${startsAt.toISOString()}`;
      result.set(key, {
        externalUid: key,
        title: ev.summary,
        location: ev.location,
        startsAt,
        endsAt: new Date(startsAt.getTime() + durationMs),
      });
    }
  }

  for (const ev of raws) {
    if (!ev.recurrenceId) continue;
    const key = `${ev.uid}|${ev.recurrenceId.toISOString()}`;
    result.delete(key);
    if (!ev.cancelled && inWindow(ev.start.instant)) {
      result.set(key, {
        externalUid: key,
        title: ev.summary,
        location: ev.location,
        startsAt: ev.start.instant,
        endsAt: ev.end,
      });
    }
  }

  return [...result.values()].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}
