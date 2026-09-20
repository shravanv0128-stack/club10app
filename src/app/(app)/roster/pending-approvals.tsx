"use client";

import { useTransition } from "react";
import type { Profile, Role } from "@/lib/types";
import { approveProfile, rejectProfile } from "./actions";

const ROLES: { role: Role; label: string }[] = [
  { role: "member", label: "Member" },
  { role: "captain", label: "Captain" },
  { role: "exec", label: "Exec" },
];

export default function PendingApprovals({
  profiles,
}: {
  profiles: Profile[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.08] dark:bg-[#0a0a0a]">
      <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
        Pending approvals ({profiles.length})
      </h2>
      <div className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.06]">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="text-sm font-medium text-black dark:text-zinc-50">
                {p.full_name ?? "Unnamed"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {p.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ROLES.map(({ role, label }) => (
                <button
                  key={role}
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => approveProfile(p.id, role))
                  }
                  className="rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  Approve as {label}
                </button>
              ))}
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(() => rejectProfile(p.id))
                }
                className="rounded-full px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
