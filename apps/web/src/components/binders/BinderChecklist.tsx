"use client";

import Link from "next/link";
import { useMemo } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import type {
  BinderBulkPreview,
  BinderChecklistSlot,
  BinderEligibleCopy,
} from "@/lib/binders/types";
import {
  AddCopyForm,
  BinderContributionReportForm,
  BulkAddCopiesForm,
  ChecklistFilter,
  SimpleBinderAction,
} from "./BinderForms";

export function BinderChecklist({
  publicId,
  slots,
  eligibleCopies,
  canContribute,
  showEligibleCopies,
  currentFilter,
  bulkPreview,
  showBulkPreview,
}: {
  publicId: string;
  slots: BinderChecklistSlot[];
  eligibleCopies: BinderEligibleCopy[];
  canContribute: boolean;
  showEligibleCopies: boolean;
  currentFilter: string;
  bulkPreview: BinderBulkPreview | null;
  showBulkPreview: boolean;
}) {
  const eligible = useMemo(() => eligibleCopies.filter((copy) => copy.eligible), [eligibleCopies]);

  return (
    <div className="space-y-6">
      {canContribute ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-emerald-950">Add your copy</h3>
              <p className="mt-1 text-sm text-emerald-900/80">
                Only the exact copies you choose are added. Each copy stays in its
                contributor&apos;s Vault. Nothing else in your Vault is shared.
              </p>
            </div>
            <Link
              href={
                showEligibleCopies
                  ? `/binders/${encodeURIComponent(publicId)}?tab=checklist`
                  : `/binders/${encodeURIComponent(publicId)}?tab=checklist&add=1`
              }
              aria-expanded={showEligibleCopies}
              className="min-h-11 rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {showEligibleCopies ? "Hide eligible copies" : "Choose eligible copies"}
            </Link>
            <Link
              href={
                showBulkPreview
                  ? `/binders/${encodeURIComponent(publicId)}?tab=checklist`
                  : `/binders/${encodeURIComponent(publicId)}?tab=checklist&bulk=1`
              }
              aria-expanded={showBulkPreview}
              className="min-h-11 rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-950"
            >
              {showBulkPreview ? "Hide bulk preview" : "Preview bulk add"}
            </Link>
          </div>
          {showEligibleCopies ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {eligible.length > 0 ? (
                eligible.map((copy) => (
                  <li key={copy.copyReference} className="rounded-2xl border border-emerald-200 bg-white p-4">
                    <div className="flex gap-3">
                      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <PublicCardImage
                          src={copy.imageUrl ?? undefined}
                          alt={`${copy.title} card artwork`}
                          imageClassName="h-full w-full object-contain"
                          fallbackClassName="flex h-full items-center justify-center p-1 text-center text-[10px] text-slate-500"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">{copy.title}</p>
                        {copy.finishLabel ? <p className="mt-1 text-sm text-slate-600">{copy.finishLabel}</p> : null}
                        <div className="mt-3">
                          <AddCopyForm publicId={publicId} copyReference={copy.copyReference} label="Add your copy" />
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-emerald-900">
                  You don&apos;t have a matching copy in Vault. Scan or search to add one.
                </li>
              )}
            </ul>
          ) : null}
          {showBulkPreview && bulkPreview ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-white p-4">
              <p className="text-sm text-slate-700">
                {bulkPreview.eligibleCount} eligible · {bulkPreview.duplicateCount} already added ·{" "}
                {bulkPreview.unresolvedCount} need review · {bulkPreview.ineligibleCount} outside this Binder
              </p>
              <BulkAddCopiesForm
                publicId={publicId}
                copyReferences={bulkPreview.eligibleCopies.map((copy) => copy.copyReference)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <ChecklistFilter publicId={publicId} currentFilter={currentFilter} />
      {slots.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => (
                <li
                  key={slot.slotPublicId || `${slot.title}-${slot.subtitle ?? ""}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 h-44 overflow-hidden rounded-xl bg-slate-50">
                    <PublicCardImage
                      src={slot.imageUrl ?? undefined}
                      alt={`${slot.title} card artwork`}
                      imageClassName="h-full w-full object-contain"
                      fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{slot.title}</p>
                      {slot.subtitle ? <p className="mt-1 text-sm text-slate-600">{slot.subtitle}</p> : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        slot.status === "in_binder"
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {slot.status === "in_binder" ? "In Binder" : "Missing"}
                    </span>
                  </div>
                  {slot.needsFinishReview ? (
                    <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs font-medium text-amber-900">
                      Finish needs review and cannot satisfy a finish-specific slot yet.
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-500">
                    {slot.satisfiedQuantity} of {slot.requiredQuantity} required copies
                  </p>
                  {slot.contributions.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      {slot.contributions.map((contribution, index) => (
                        <li
                          key={contribution.contributionPublicId ?? `${contribution.memberLabel}-${index}`}
                          className="space-y-2 text-xs text-slate-600"
                        >
                          <p>
                            {contribution.memberLabel} · {contribution.state}
                          </p>
                          {contribution.contributionPublicId &&
                          contribution.canDecide ? (
                            <div className="flex flex-wrap gap-2">
                              <SimpleBinderAction
                                publicId={publicId}
                                actionName="contribution_decide"
                                label="Approve"
                                tone="primary"
                                fields={{
                                  contributionId: contribution.contributionPublicId,
                                  decision: "approve",
                                }}
                              />
                              <SimpleBinderAction
                                publicId={publicId}
                                actionName="contribution_decide"
                                label="Reject"
                                fields={{
                                  contributionId: contribution.contributionPublicId,
                                  decision: "reject",
                                }}
                              />
                            </div>
                          ) : null}
                          {contribution.contributionPublicId &&
                          contribution.canRemove &&
                          contribution.state === "active" ? (
                            <SimpleBinderAction
                              publicId={publicId}
                              actionName="contribution_remove"
                              label="Remove from Binder"
                              tone="danger"
                              fields={{
                                contributionId: contribution.contributionPublicId,
                                reason: "Removed by Binder management.",
                              }}
                            />
                          ) : null}
                          {contribution.contributionPublicId ? (
                            <BinderContributionReportForm
                              contributionPublicId={
                                contribution.contributionPublicId
                              }
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {slot.contributedByYou && slot.contributionPublicId ? (
                    <div className="mt-3">
                      <SimpleBinderAction
                        publicId={publicId}
                        actionName="contribution_withdraw"
                        label={slot.contributionState === "pending" ? "Withdraw pending copy" : "Remove contribution"}
                        fields={{ contributionId: slot.contributionPublicId }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No checklist slots match this filter.
            </p>
          )}
    </div>
  );
}
