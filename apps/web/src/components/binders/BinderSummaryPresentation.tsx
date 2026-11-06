import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type {BinderProgressUnit,BinderSummary} from "@/lib/binders/types";

function progressPercent(completed: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, Math.round((completed / total) * 100))) : 0;
}

export function BinderProgress({
  completed,
  total,
  unit,
  label = "Binder progress",
}: {
  completed: number;
  total: number;
  unit: BinderProgressUnit;
  label?: string;
}) {
  const percent = progressPercent(completed, total);
  const accessibleCompleted = Math.min(
    Math.max(0, completed),
    Math.max(0, total),
  );
  const unitLabel =
    unit === "finish_options"
      ? total === 1
        ? "finish option"
        : "finish options"
      : unit === "custom_slots"
        ? total === 1
          ? "custom slot"
          : "custom slots"
        : total === 1
          ? "card print"
          : "card prints";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-950">
          {completed} of {total} {unitLabel}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, total)}
        aria-valuenow={accessibleCompleted}
        aria-valuetext={`${accessibleCompleted} of ${Math.max(0, total)} ${unitLabel} complete`}
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function BinderSummaryCard({ binder }: { binder: BinderSummary }) {
  const community = binder.readAccess === "public" && binder.discoverability === "listed" && binder.joinPolicy === "request_to_join" && binder.contributionPolicy === "approval_required";
  const privacy = community ? "Community" : binder.readAccess === "private" ? binder.joinPolicy === "invite_only" ? "Private · Invite-only" : "Private" : binder.readAccess === "link" ? "View-only link" : binder.readAccess === "public" ? "Public" : null;
  return (
    <Link
      href={`/binders/${encodeURIComponent(binder.publicId)}`}
      className="group grid min-h-44 grid-cols-[92px_minmax(0,1fr)] gap-4 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 sm:grid-cols-1 sm:p-4"
    >
      <div className="aspect-[5/7] overflow-hidden rounded-[10px] bg-slate-50 sm:aspect-[16/10]">
        <PublicCardImage
          src={binder.coverImageUrl ?? undefined}
          alt={`${binder.title} cover artwork`}
          imageClassName="h-full w-full object-contain"
          fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
          sizes="(max-width: 640px) 92px, 360px"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold capitalize text-slate-500">
            {binder.role} · {binder.binderType}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950 group-hover:text-sky-700">
            {binder.title}
          </h3>
          {privacy ? <p className="mt-1 text-xs text-[var(--gv-text-secondary)]">{privacy}</p> : null}
          {binder.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{binder.description}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <BinderProgress
            completed={binder.completedSlots}
            total={binder.totalSlots}
            unit={binder.progressUnit}
          />
          <p className="text-xs text-slate-500">
            {binder.memberCount} {binder.memberCount === 1 ? "member" : "members"}
          </p>
        </div>
      </div>
    </Link>
  );
}

