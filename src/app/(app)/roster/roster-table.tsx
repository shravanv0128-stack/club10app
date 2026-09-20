"use client";

import { useMemo, useState, useTransition } from "react";
import type { Profile, Role } from "@/lib/types";
import { setCaptainRosterGroup, updateProfile } from "./actions";

const ROLES: Role[] = ["member", "captain", "exec"];

const ROLE_BADGE: Record<Role, string> = {
  pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  member: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  captain: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  exec: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

function RosterRow({
  profile,
  rosterGroup,
}: {
  profile: Profile;
  rosterGroup?: string;
}) {
  const [editing, setEditing] = useState<"role" | "tier" | "title" | null>(
    null,
  );
  const [tier, setTier] = useState(profile.tier ?? "");
  const [title, setTitle] = useState(profile.title ?? "");
  const [group, setGroup] = useState(rosterGroup ?? "");
  const [isPending, startTransition] = useTransition();

  function commitTier() {
    setEditing(null);
    if (tier !== (profile.tier ?? "")) {
      startTransition(() =>
        updateProfile(profile.id, { tier: tier.trim() || null }),
      );
    }
  }

  function commitTitle() {
    setEditing(null);
    if (title !== (profile.title ?? "")) {
      startTransition(() =>
        updateProfile(profile.id, { title: title.trim() || null }),
      );
    }
  }

  function commitGroup() {
    if (group !== (rosterGroup ?? "")) {
      startTransition(() => setCaptainRosterGroup(profile.id, group.trim()));
    }
  }

  function changeRole(role: Role) {
    startTransition(() => updateProfile(profile.id, { role }));
  }

  return (
    <tr className="border-b border-black/[.06] last:border-0 dark:border-white/[.06]">
      <td className="px-4 py-3 pr-4">
        <p className="text-sm font-medium text-black dark:text-zinc-50">
          {profile.full_name ?? "Unnamed"}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {profile.email}
        </p>
      </td>
      <td className="py-3 pr-4">
        {editing === "role" ? (
          <select
            autoFocus
            disabled={isPending}
            defaultValue={profile.role}
            onChange={(e) => {
              changeRole(e.target.value as Role);
              setEditing(null);
            }}
            onBlur={() => setEditing(null)}
            className="rounded border border-black/[.08] bg-transparent px-2 py-1 text-xs dark:border-white/[.145]"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setEditing("role")}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[profile.role]}`}
          >
            {profile.role}
          </button>
        )}
      </td>
      <td className="py-3 pr-4">
        {editing === "tier" ? (
          <input
            autoFocus
            disabled={isPending}
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            onBlur={commitTier}
            onKeyDown={(e) => e.key === "Enter" && commitTier()}
            className="w-24 rounded border border-black/[.08] bg-transparent px-2 py-1 text-xs dark:border-white/[.145]"
          />
        ) : (
          <button
            onClick={() => setEditing("tier")}
            className="text-xs text-zinc-700 hover:underline dark:text-zinc-300"
          >
            {profile.tier || "—"}
          </button>
        )}
      </td>
      <td className="py-3 pr-4">
        {editing === "title" ? (
          <input
            autoFocus
            disabled={isPending}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && commitTitle()}
            className="w-32 rounded border border-black/[.08] bg-transparent px-2 py-1 text-xs dark:border-white/[.145]"
          />
        ) : (
          <button
            onClick={() => setEditing("title")}
            className="text-xs text-zinc-700 hover:underline dark:text-zinc-300"
          >
            {profile.title || "—"}
          </button>
        )}
      </td>
      <td className="py-3">
        {profile.role === "captain" ? (
          <input
            disabled={isPending}
            value={group}
            placeholder="Roster group"
            onChange={(e) => setGroup(e.target.value)}
            onBlur={commitGroup}
            onKeyDown={(e) => e.key === "Enter" && commitGroup()}
            className="w-36 rounded border border-black/[.08] bg-transparent px-2 py-1 text-xs dark:border-white/[.145]"
          />
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}

export default function RosterTable({
  profiles,
  rosterGroups,
}: {
  profiles: Profile[];
  rosterGroups: Record<string, string>;
}) {
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const tiers = useMemo(
    () =>
      Array.from(new Set(profiles.map((p) => p.tier).filter(Boolean))) as string[],
    [profiles],
  );

  const filtered = profiles.filter((p) => {
    if (roleFilter !== "all" && p.role !== roleFilter) return false;
    if (tierFilter !== "all" && p.tier !== tierFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "member", "captain", "exec"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              roleFilter === r
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/[.08] text-zinc-600 hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-400 dark:hover:bg-[#1a1a1a]"
            }`}
          >
            {r === "all" ? "All roles" : r}
          </button>
        ))}
        {tiers.length > 0 && (
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-full border border-black/[.08] bg-transparent px-3 py-1 text-xs dark:border-white/[.145]"
          >
            <option value="all">All tiers</option>
            {tiers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/[.08] dark:border-white/[.08]">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-black/[.08] text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.08] dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-0 py-3 font-medium">Role</th>
              <th className="px-0 py-3 font-medium">Tier</th>
              <th className="px-0 py-3 font-medium">Title</th>
              <th className="px-0 py-3 font-medium">Roster group</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <RosterRow
                key={p.id}
                profile={p}
                rosterGroup={rosterGroups[p.id]}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No members match these filters.
          </p>
        )}
      </div>
    </div>
  );
}
