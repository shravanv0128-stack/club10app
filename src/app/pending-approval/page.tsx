export default function PendingApprovalPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Awaiting approval
      </h1>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Your account is signed in but hasn&apos;t been approved yet. An exec
        needs to assign you a role before you can access the team app.
      </p>
    </div>
  );
}
