import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import PageSection from "@/components/layout/PageSection";
import ProductState from "@/components/layout/ProductState";
import type {
  BinderDashboard,
  BinderProgressUnit,
  BinderPublicProjection,
  BinderSummary,
  BinderTemplateSummary,
} from "@/lib/binders/types";
import {
  BinderInvitationReportForm,
  BinderPublicContributionSafetyControls,
  BinderTrustSafetyControls,
  SimpleBinderAction,
} from "./BinderForms";

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
  return (
    <Link
      href={`/binders/${encodeURIComponent(binder.publicId)}`}
      className="group grid min-h-44 grid-cols-[92px_minmax(0,1fr)] gap-4 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 sm:grid-cols-1 sm:p-4"
    >
      <div className="aspect-[5/7] overflow-hidden rounded-md bg-slate-50 sm:aspect-[16/10]">
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

function DashboardSection({
  title,
  description,
  items,
  empty,
}: {
  title: string;
  description?: string;
  items: BinderSummary[];
  empty: string;
}) {
  return (
    <PageSection spacing="loose">
      <div>
        <h2 className="gv-section-title">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((binder) => (
            <BinderSummaryCard key={binder.publicId} binder={binder} />
          ))}
        </div>
      ) : (
        <ProductState compact eyebrow={title} title="Nothing here yet" description={empty} />
      )}
    </PageSection>
  );
}

export function BinderDashboardView({
  dashboard,
  sharedEnabled,
  invitationPageHref,
  suspendedPageHref,
}: {
  dashboard: BinderDashboard;
  sharedEnabled: boolean;
  invitationPageHref?: string | null;
  suspendedPageHref?: string | null;
}) {
  return (
    <div className="space-y-10">
      <DashboardSection
        title="Continue building"
        description="Pick up the collection goals you are actively building."
        items={dashboard.continueBuilding}
        empty="No Binders yet. Start with a Pokémon Binder."
      />
      {sharedEnabled || dashboard.sharedWithMe.length > 0 ? (
        <DashboardSection
          title="Shared with me"
          description="Binders where another collector invited you to build or view."
          items={dashboard.sharedWithMe}
          empty="Build together—invite family or friends."
        />
      ) : null}
      {sharedEnabled || dashboard.invitations.length > 0 ? (
        <PageSection spacing="loose">
          <div>
            <h2 className="gv-section-title">Invitations</h2>
            <p className="mt-1 text-sm text-slate-600">Invitations are different from view-only links.</p>
          </div>
          {dashboard.invitations.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {dashboard.invitations.map((invitation) => (
                <li
                  key={invitation.invitationPublicId}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <p className="font-semibold text-slate-950">{invitation.binderTitle}</p>
                  <p className="mt-1 text-sm capitalize text-slate-600">
                    Invited as {invitation.role}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Respond here without re-exposing the private invitation token.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sharedEnabled ? (
                      <SimpleBinderAction
                        publicId={invitation.binderPublicId}
                        actionName="invite_respond"
                        label="Accept"
                        tone="primary"
                        fields={{
                          invitationId: invitation.invitationPublicId,
                          decision: "accept",
                        }}
                      />
                    ) : null}
                    <SimpleBinderAction
                      publicId={invitation.binderPublicId}
                      actionName="invite_respond"
                      label="Decline"
                      fields={{
                        invitationId: invitation.invitationPublicId,
                        decision: "decline",
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <BinderInvitationReportForm
                      invitationPublicId={invitation.invitationPublicId}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ProductState
              compact
              eyebrow="Invitations"
              title="No pending invitations"
              description="New Binder invitations will appear here without exposing their private invitation links."
            />
          )}
          {dashboard.invitationsNextCursor && invitationPageHref ? (
            <Link href={invitationPageHref} className="gv-secondary-button">
              More invitations
            </Link>
          ) : null}
        </PageSection>
      ) : null}
      {dashboard.suspended.length > 0 ? (
        <PageSection spacing="loose">
          <div>
            <h2 className="gv-section-title">Suspended memberships</h2>
            <p className="mt-1 text-sm text-slate-600">
              Suspended access does not expose the Binder checklist, activity,
              members, or progress. You can leave or send a safety report.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {dashboard.suspended.map((binder) => (
              <li
                key={binder.publicId}
                className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <div>
                  <p className="font-semibold text-amber-950">
                    Suspended Binder
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Details stay hidden while access is suspended.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {binder.canLeave ? (
                    <SimpleBinderAction
                      publicId={binder.publicId}
                      actionName="leave"
                      label="Leave Binder"
                      tone="danger"
                    />
                  ) : null}
                </div>
                {binder.canReport ? (
                  <BinderTrustSafetyControls
                    publicId={binder.publicId}
                    allowBlock={false}
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {dashboard.suspendedNextCursor && suspendedPageHref ? (
            <Link href={suspendedPageHref} className="gv-secondary-button">
              More suspended memberships
            </Link>
          ) : null}
        </PageSection>
      ) : null}
      {dashboard.legacyCandidates.length > 0 ? (
        <PageSection spacing="loose">
          <div>
            <h2 className="gv-section-title">Collection goals you already track</h2>
            <p className="mt-1 text-sm text-slate-600">
              Turn an existing tracked goal into a Binder, or dismiss the
              suggestion. Your original watch remains unchanged.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {dashboard.legacyCandidates.map((candidate) => (
              <li
                key={candidate.watchPublicId}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex gap-3">
                  <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    <PublicCardImage
                      src={candidate.imageUrl ?? undefined}
                      alt={`${candidate.title} artwork`}
                      imageClassName="h-full w-full object-contain"
                      fallbackClassName="flex h-full items-center justify-center text-[10px] text-slate-500"
                    />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <p className="font-semibold text-slate-950">{candidate.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <SimpleBinderAction
                        publicId=""
                        actionName="legacy_decide"
                        label="Create Binder"
                        tone="primary"
                        fields={{
                          watchId: candidate.watchPublicId,
                          decision: "convert",
                          title: `${candidate.title} Binder`,
                        }}
                      />
                      <SimpleBinderAction
                        publicId=""
                        actionName="legacy_decide"
                        label="Dismiss"
                        fields={{
                          watchId: candidate.watchPublicId,
                          decision: "dismiss",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}
      <DashboardSection
        title="Completed"
        items={dashboard.completed}
        empty="Completed collection goals will be celebrated here."
      />
      <DashboardSection
        title="Archived"
        items={dashboard.archived}
        empty="Archived Binders stay safe and can be restored."
      />
    </div>
  );
}

export function BinderPublicView({
  binder,
  memberHref,
  showTrustSafety = true,
  checklistPageHref,
}: {
  binder: BinderPublicProjection;
  memberHref?: string | null;
  showTrustSafety?: boolean;
  checklistPageHref?: string | null;
}) {
  return (
    <div className="space-y-8">
      <PageSection surface="card" spacing="loose">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="aspect-[5/7] w-full shrink-0 overflow-hidden rounded-lg bg-slate-50 sm:w-40">
            <PublicCardImage
              src={binder.coverImageUrl ?? undefined}
              alt={`${binder.title} cover artwork`}
              imageClassName="h-full w-full object-contain"
              fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
              priority
              sizes="(max-width: 640px) 90vw, 160px"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="gv-eyebrow">Binder</p>
            <h1 className="gv-display-title break-words">{binder.title}</h1>
            <p className="text-sm font-medium text-emerald-800">{binder.targetLabel}</p>
            {binder.description ? (
              <p className="gv-body-copy max-w-2xl whitespace-pre-wrap break-words">
                {binder.description}
              </p>
            ) : null}
          </div>
          {memberHref ? (
            <Link href={memberHref} className="gv-primary-button">
              Open Binder
            </Link>
          ) : null}
        </div>
        <BinderProgress
          completed={binder.completedSlots}
          total={binder.totalSlots}
          unit={binder.progressUnit}
        />
        <p className="text-sm text-slate-600">
          Built by {binder.memberCount} {binder.memberCount === 1 ? "collector" : "collectors"}.
          Cards stay in each collector&apos;s Vault.
        </p>
      </PageSection>

      <PageSection spacing="loose">
        <div>
          <h2 className="gv-section-title">Checklist</h2>
          <p className="mt-1 text-sm text-slate-600">
            This public view shows canonical card information only—never exact Vault copies, certificates, prices, or private notes.
          </p>
        </div>
        {binder.checklist.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {binder.checklist.map((slot) => (
              <li
                key={slot.slotPublicId || `${slot.title}-${slot.subtitle ?? ""}`}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="mb-3 aspect-[5/7] overflow-hidden rounded-md bg-slate-50">
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
                    <p className="mt-1 text-xs font-medium text-slate-700">
                      {slot.printingLabels.join(" · ")}
                    </p>
                    {slot.contributors.length > 0 ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Added by{" "}
                        {slot.contributors
                          .map((contributor) =>
                            contributor.identityVisible && contributor.alias
                              ? contributor.alias
                              : "A Binder member",
                          )
                          .join(", ")}
                      </p>
                    ) : null}
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
                {showTrustSafety
                  ? slot.publicContributionActions.map((safetyAction) => (
                      <BinderPublicContributionSafetyControls
                        key={`${safetyAction.contributionActionRef ?? "contribution"}-${safetyAction.memberActionRef ?? "member"}`}
                        publicId={binder.publicId}
                        safetyAction={safetyAction}
                      />
                    ))
                  : null}
                {showTrustSafety && slot.publicContributionActionsHasMore ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Some additional contribution details are not shown in this
                    view.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <ProductState
            compact
            eyebrow="Checklist"
            title="No public cards available"
            description="This Binder does not currently expose any checklist slots."
          />
        )}
        {binder.checklistNextCursor && checklistPageHref ? (
          <Link href={checklistPageHref} className="gv-secondary-button">
            More checklist cards
          </Link>
        ) : null}
      </PageSection>

      {showTrustSafety && (binder.canReport || binder.canBlockOwner) ? (
        <PageSection surface="subtle">
          <h2 className="text-base font-semibold text-slate-950">Community safety</h2>
          <p className="text-sm text-slate-600">
            {binder.canReport && binder.canBlockOwner
              ? "Report unsafe content or block the Binder owner without exposing private member details."
              : binder.canReport
                ? "Report unsafe content without exposing private member details."
                : "Block the Binder owner without exposing private member details."}
          </p>
          <BinderTrustSafetyControls
            publicId={binder.publicId}
            allowReport={binder.canReport}
            allowBlock={binder.canBlockOwner}
          />
        </PageSection>
      ) : null}
    </div>
  );
}

export function BinderTemplateGrid({ templates }: { templates: BinderTemplateSummary[] }) {
  if (templates.length === 0) {
    return (
      <ProductState
        compact
        eyebrow="Templates"
        title="No templates available"
        description="Approved Binder templates will appear here when they are ready to use."
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Link
          key={template.templatePublicId}
          href={`/binder-templates/${encodeURIComponent(template.templatePublicId)}`}
          className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-sky-300"
        >
          <div className="mb-4 aspect-[5/7] overflow-hidden rounded-md bg-slate-50">
            <PublicCardImage
              src={template.coverImageUrl ?? undefined}
              alt={`${template.title} Template artwork`}
              imageClassName="h-full w-full object-contain"
              fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
            />
          </div>
          <p className="gv-eyebrow">Template · Version {template.version}</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{template.title}</h2>
          {template.description ? (
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{template.description}</p>
          ) : null}
          <p className="mt-4 text-xs text-slate-500">
            {template.checklistSlotCount} checklist slots
            {template.adoptionCount === null
              ? ""
              : ` · ${template.adoptionCount} collectors building this`}
          </p>
        </Link>
      ))}
    </div>
  );
}
