import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIcal } from "./ical.ts";

const SAMPLE = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "VERSION:2.0",
  "X-WR-CALNAME:Club Tennis",
  "X-WR-TIMEZONE:America/New_York",
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "END:VTIMEZONE",
  "BEGIN:VEVENT",
  "DTSTART;TZID=America/New_York:20260901T190000",
  "DTEND;TZID=America/New_York:20260901T210000",
  "RRULE:FREQ=WEEKLY;WKST=SU;UNTIL=20261215T045959Z;BYDAY=TU,TH",
  "EXDATE;TZID=America/New_York:20260910T190000",
  "DTSTAMP:20260901T000000Z",
  "UID:weekly123@google.com",
  "SUMMARY:Team Practice",
  "LOCATION:Lenz Tennis Center\\, Princeton\\, NJ",
  "STATUS:CONFIRMED",
  "BEGIN:VALARM",
  "TRIGGER:-P0DT0H30M0S",
  "END:VALARM",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=America/New_York:20260924T193000",
  "DTEND;TZID=America/New_York:20260924T213000",
  "UID:weekly123@google.com",
  "RECURRENCE-ID;TZID=America/New_York:20260924T190000",
  "SUMMARY:Team Practice (moved)",
  "LOCATION:Indoor Courts",
  "STATUS:CONFIRMED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=America/New_York:20260929T190000",
  "DTEND;TZID=America/New_York:20260929T210000",
  "UID:weekly123@google.com",
  "RECURRENCE-ID;TZID=America/New_York:20260929T190000",
  "SUMMARY:Team Practice",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261003T140000Z",
  "DTEND:20261003T160000Z",
  "UID:single456@google.com",
  "SUMMARY:Ladder Match Day with a summary long enough to be folded onto a",
  "  second line",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261010",
  "DTEND;VALUE=DATE:20261011",
  "UID:allday789@google.com",
  "SUMMARY:Fall Tournament",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261020T190000",
  "DTEND:20261020T200000",
  "UID:floating@google.com",
  "SUMMARY:Floating (no tz)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const WINDOW = {
  from: new Date("2026-09-20T00:00:00Z"),
  to: new Date("2026-10-31T00:00:00Z"),
};

test("expands a Google-style weekly feed with exdate, override and cancellation", () => {
  const events = parseIcal(SAMPLE, WINDOW);
  const byUid = new Map(events.map((e) => [e.externalUid, e]));

  const practices = events.filter((e) =>
    e.externalUid.startsWith("weekly123@google.com|"),
  );
  // Tue/Thu from Sep 22 through Oct 29, minus the cancelled Sep 29 instance.
  assert.equal(practices.length, 11);
  assert.ok(
    !practices.some((e) => e.startsAt.toISOString() === "2026-09-29T23:00:00.000Z"),
    "cancelled instance removed",
  );

  const first = practices[0];
  assert.equal(first.startsAt.toISOString(), "2026-09-22T23:00:00.000Z");
  assert.equal(first.endsAt.toISOString(), "2026-09-23T01:00:00.000Z");
  assert.equal(first.location, "Lenz Tennis Center, Princeton, NJ");
  assert.equal(first.title, "Team Practice");

  const moved = byUid.get("weekly123@google.com|2026-09-24T23:00:00.000Z");
  assert.ok(moved);
  assert.equal(moved.title, "Team Practice (moved)");
  assert.equal(moved.startsAt.toISOString(), "2026-09-24T23:30:00.000Z");
  assert.equal(moved.location, "Indoor Courts");

  const single = byUid.get("single456@google.com");
  assert.ok(single);
  assert.equal(single.startsAt.toISOString(), "2026-10-03T14:00:00.000Z");
  assert.equal(
    single.title,
    "Ladder Match Day with a summary long enough to be folded onto a second line",
  );

  const allDay = byUid.get("allday789@google.com");
  assert.ok(allDay);
  assert.equal(allDay.startsAt.toISOString(), "2026-10-10T04:00:00.000Z");
  assert.equal(allDay.endsAt.toISOString(), "2026-10-11T04:00:00.000Z");

  const floating = byUid.get("floating@google.com");
  assert.ok(floating);
  assert.equal(floating.startsAt.toISOString(), "2026-10-20T23:00:00.000Z");

  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i - 1].startsAt <= events[i].startsAt);
  }
});

test("honours COUNT, INTERVAL and DST", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "DTSTART;TZID=America/New_York:20261026T180000",
    "DTEND;TZID=America/New_York:20261026T190000",
    "RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3",
    "UID:biweekly@google.com",
    "SUMMARY:Biweekly",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  const events = parseIcal(ics, {
    from: new Date("2026-10-01T00:00:00Z"),
    to: new Date("2027-01-01T00:00:00Z"),
  });
  assert.deepEqual(
    events.map((e) => e.startsAt.toISOString()),
    [
      "2026-10-26T22:00:00.000Z",
      "2026-11-09T23:00:00.000Z",
      "2026-11-23T23:00:00.000Z",
    ],
  );
});

test("skips cancelled masters and events outside the window", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "DTSTART:20261005T140000Z",
    "DTEND:20261005T150000Z",
    "UID:cancelled@google.com",
    "SUMMARY:Gone",
    "STATUS:CANCELLED",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART:20250105T140000Z",
    "DTEND:20250105T150000Z",
    "UID:old@google.com",
    "SUMMARY:Old",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  assert.deepEqual(parseIcal(ics, WINDOW), []);
});
