import type { PromotionTransitionState } from "@/lib/provisional/publicProvisionalTypes";

type PromotionTransitionNoteProps = {
  state?: PromotionTransitionState | null;
  className?: string;
};

// LOCK: Transition note is historical context only.
// LOCK: Canonical authority must remain primary.
export default function PromotionTransitionNote({ state, className }: PromotionTransitionNoteProps) {
  if (!state?.isPromotedFromProvisional || !state.transitionLabel) {
    return null;
  }

  return (
    <span
      className={[
        "inline-flex w-fit rounded-[8px] bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {state.transitionLabel}
    </span>
  );
}
