import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import PageSection from "@/components/layout/PageSection";
import type { BinderFeatureFlags } from "@/lib/binders/featureFlags";
import type { BinderDetail } from "@/lib/binders/types";
import { BinderChecklist } from "./BinderChecklist";
import { BinderLiveRefresh } from "./BinderLiveRefresh";
import {
  BinderMetadataForm,
  BinderConsentWithdrawalForm,
  BinderContributionReportForm,
  BinderMemberSafetyControls,
  BinderPolicyForm,
  BinderPreferencesForm,
  BinderTrustSafetyControls,
  CustomRevisionForm,
  DeleteBinderForm,
  InvitePeopleForm,
  MemberManagementForm,
  OwnershipTransferForm,
  PulseMilestoneShareForm,
  SimpleBinderAction,
  TemplateSubmitForm,
  ViewLinkForm,
} from "./BinderForms";
import { BinderProgress } from "./BinderViews";

export type BinderTab = "checklist" | "activity" | "members" | "settings";

const TABS: Array<{ value: BinderTab; label: string }> = [
  { value: "checklist", label: "Checklist" },
  { value: "activity", label: "Activity" },
  { value: "members", label: "Members" },
  { value: "settings", label: "Settings" },
];

function ChecklistTab({
  binder,
  showEligibleCopies,
  sharedEnabled,
  currentFilter,
  showBulkPreview,
}: {
  binder: BinderDetail;
  showEligibleCopies: boolean;
  sharedEnabled: boolean;
  currentFilter: string;
  showBulkPreview: boolean;
}) {
  return (
    <PageSection spacing="loose">
      <div>
        <h2 className="gv-section-title">Checklist</h2>
        <p className="mt-1 text-sm text-slate-600">
          Progress counts completed checklist slots, not duplicate contribution rows.
        </p>
      </div>
      {binder.pendingContributions.length > 0 &&
      binder.canApprove &&
      sharedEnabled ? (
        <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-950">Contribution approval queue</h3>
          <ul className="space-y-3">
            {binder.pendingContributions.map((contribution) => (
              <li
                key={contribution.contributionPublicId}
                className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-950">{contribution.title}</p>
                  <p className="text-sm text-slate-600">Added by {contribution.memberLabel}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contribution.canDecide ? <SimpleBinderAction
                    publicId={binder.publicId}
                    actionName="contribution_decide"
                    label="Approve"
                    tone="primary"
                    fields={{
                      contributionId: contribution.contributionPublicId,
                      decision: "approve",
                    }}
                  /> : null}
                  {contribution.canDecide ? <SimpleBinderAction
                    publicId={binder.publicId}
                    actionName="contribution_decide"
                    label="Reject"
                    fields={{
                      contributionId: contribution.contributionPublicId,
                      decision: "reject",
                    }}
                  /> : null}
                  {contribution.canRemove ? (
                    <SimpleBinderAction
                      publicId={binder.publicId}
                      actionName="contribution_remove"
                      label="Remove"
                      tone="danger"
                      fields={{
                        contributionId: contribution.contributionPublicId,
                        reason: "Removed by Binder management.",
                      }}
                    />
                  ) : null}
                  <BinderContributionReportForm
                    contributionPublicId={contribution.contributionPublicId}
                  />
                </div>
              </li>
            ))}
          </ul>
          {binder.pendingContributionsNextCursor ? (
            <Link
              href={`/binders/${encodeURIComponent(binder.publicId)}?tab=checklist&filter=${encodeURIComponent(currentFilter)}&queueCursor=${encodeURIComponent(binder.pendingContributionsNextCursor)}`}
              className="gv-secondary-button"
            >
              More pending contributions
            </Link>
          ) : null}
        </div>
      ) : null}
      <BinderChecklist
        publicId={binder.publicId}
        slots={binder.checklist}
        eligibleCopies={binder.eligibleCopies}
        canContribute={
          binder.canContribute &&
          !binder.stalePermission &&
          (binder.role === "owner" || sharedEnabled)
        }
        showEligibleCopies={showEligibleCopies}
        currentFilter={currentFilter}
        bulkPreview={binder.bulkPreview}
        showBulkPreview={showBulkPreview}
      />
      {binder.checklistNextCursor ? (
        <Link
          href={`/binders/${encodeURIComponent(binder.publicId)}?tab=checklist&filter=${encodeURIComponent(currentFilter)}&cursor=${encodeURIComponent(binder.checklistNextCursor)}`}
          className="gv-secondary-button"
        >
          More checklist slots
        </Link>
      ) : null}
    </PageSection>
  );
}

function ActivityTab({ binder }: { binder: BinderDetail }) {
  return (
    <PageSection spacing="loose">
      <div>
        <h2 className="gv-section-title">Activity</h2>
        <p className="mt-1 text-sm text-slate-600">
          Binder history is scoped to members and sanitizes identity based on consent.
        </p>
      </div>
      {binder.activity.length > 0 ? (
        <ol className="space-y-3">
          {binder.activity.map((item) => (
            <li
              key={item.eventPublicId || `${item.kind}-${item.createdAt ?? ""}`}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <p className="font-medium text-slate-950">{item.summary}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.actorLabel ? `${item.actorLabel} · ` : ""}
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently"}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No one has added a card yet.
        </p>
      )}
      {binder.activityNextCursor ? (
        <Link
          href={`/binders/${encodeURIComponent(binder.publicId)}?tab=activity&cursor=${encodeURIComponent(binder.activityNextCursor)}`}
          className="gv-secondary-button"
        >
          Earlier activity
        </Link>
      ) : null}
    </PageSection>
  );
}

function MembersTab({
  binder,
  flags,
}: {
  binder: BinderDetail;
  flags: BinderFeatureFlags;
}) {
  return (
    <div className="space-y-8">
      {binder.pendingJoinRequests.length > 0 &&
      binder.canApprove &&
      flags.community ? (
        <PageSection surface="subtle" spacing="loose">
          <h2 className="text-lg font-semibold text-slate-950">Join requests</h2>
          <ul className="space-y-3">
            {binder.pendingJoinRequests.map((request) => (
              <li
                key={request.requestPublicId}
                className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-950">{request.memberLabel}</p>
                  <p className="text-xs capitalize text-slate-500">
                    Requested up to {request.requestedRole}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.canDecide ? (
                    <>
                      <SimpleBinderAction
                        publicId={binder.publicId}
                        actionName="join_decide"
                        label={`Approve as ${
                          request.requestedRole === "manager" &&
                          binder.role !== "owner"
                            ? "Contributor"
                            : request.requestedRole
                        }`}
                        tone="primary"
                        fields={{
                          requestId: request.requestPublicId,
                          decision: "approve",
                          role:
                            request.requestedRole === "manager" &&
                            binder.role !== "owner"
                              ? "contributor"
                              : request.requestedRole,
                        }}
                      />
                      <SimpleBinderAction
                        publicId={binder.publicId}
                        actionName="join_decide"
                        label="Reject"
                        fields={{
                          requestId: request.requestPublicId,
                          decision: "reject",
                        }}
                      />
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {binder.pendingJoinRequestsNextCursor ? (
            <Link
              href={`/binders/${encodeURIComponent(binder.publicId)}?tab=members&queueCursor=${encodeURIComponent(binder.pendingJoinRequestsNextCursor)}`}
              className="gv-secondary-button"
            >
              More join requests
            </Link>
          ) : null}
        </PageSection>
      ) : null}
      <PageSection spacing="loose">
        <div>
          <h2 className="gv-section-title">Members</h2>
          <p className="mt-1 text-sm text-slate-600">
            Membership grants access to this Binder—not to anyone&apos;s unrelated Vault cards.
          </p>
        </div>
        <ul className="space-y-3">
          {binder.members.map((member) => (
            <li key={member.membershipPublicId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{member.displayName}</p>
                  <p className="mt-1 text-sm capitalize text-slate-600">
                    {member.role} · {member.status}
                  </p>
                  {member.alias ? <p className="mt-1 text-xs text-slate-500">Alias: {member.alias}</p> : null}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Content: {member.externalContentConsent}</p>
                  <p>Identity: {member.identityAttributionConsent}</p>
                </div>
              </div>
              {member.canManage && flags.shared ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <MemberManagementForm
                    publicId={binder.publicId}
                    memberId={member.membershipPublicId}
                    currentRole={member.role}
                    suspended={member.status === "suspended"}
                    canAssignManager={binder.role === "owner"}
                  />
                </div>
              ) : null}
              {member.membershipPublicId !== binder.viewerMembershipPublicId ? (
                <BinderMemberSafetyControls
                  publicId={binder.publicId}
                  memberId={member.membershipPublicId}
                  memberLabel={member.displayName}
                />
              ) : null}
            </li>
          ))}
        </ul>
        {binder.membersNextCursor ? (
          <Link
            href={`/binders/${encodeURIComponent(binder.publicId)}?tab=members&cursor=${encodeURIComponent(binder.membersNextCursor)}`}
            className="gv-secondary-button"
          >
            More members
          </Link>
        ) : null}
      </PageSection>
      {binder.ownerTransferOffer ? (
        <PageSection surface="subtle">
          <h2 className="text-lg font-semibold text-slate-950">
            Pending ownership transfer
          </h2>
          <p className="text-sm text-slate-600">
            The transfer remains pending until the selected member accepts.
            Former Owner role: {binder.ownerTransferOffer.formerOwnerRole}.
          </p>
          <div className="flex flex-wrap gap-2">
            {binder.ownerTransferOffer.isTargetViewer &&
            binder.moderationState !== "frozen" &&
            binder.moderationState !== "removed" ? (
              <>
                <SimpleBinderAction
                  publicId={binder.publicId}
                  actionName="owner_transfer_accept"
                  label="Accept ownership"
                  tone="primary"
                  fields={{ offerId: binder.ownerTransferOffer.offerPublicId }}
                />
                <SimpleBinderAction
                  publicId={binder.publicId}
                  actionName="owner_transfer_revoke"
                  label="Decline transfer"
                  tone="danger"
                  fields={{ offerId: binder.ownerTransferOffer.offerPublicId }}
                />
              </>
            ) : null}
            {binder.role === "owner" &&
            binder.moderationState !== "frozen" &&
            binder.moderationState !== "removed" ? (
              <SimpleBinderAction
                publicId={binder.publicId}
                actionName="owner_transfer_revoke"
                label="Revoke offer"
                tone="danger"
                fields={{ offerId: binder.ownerTransferOffer.offerPublicId }}
              />
            ) : null}
            {binder.moderationState === "frozen" ? (
              <p className="text-sm text-amber-800">
                Ownership actions are unavailable while this Binder is under review.
              </p>
            ) : null}
          </div>
        </PageSection>
      ) : null}
      {binder.canTransfer && flags.shared && !binder.ownerTransferOffer ? (
        <PageSection surface="subtle">
          <h2 className="text-lg font-semibold text-slate-950">Ownership</h2>
          <OwnershipTransferForm
            publicId={binder.publicId}
            members={binder.members
              .filter((member) => member.role !== "owner" && member.status === "active")
              .map((member) => ({
                id: member.membershipPublicId,
                label: member.displayName,
                role: member.role,
              }))}
          />
        </PageSection>
      ) : null}
    </div>
  );
}

function SettingsTab({
  binder,
  flags,
  showCustomEditor,
}: {
  binder: BinderDetail;
  flags: BinderFeatureFlags;
  showCustomEditor: boolean;
}) {
  const requiresHostedCover =
    binder.binderType === "custom" ||
    (binder.readAccess === "public" &&
      binder.discoverability === "listed");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {binder.canEdit ? (
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">Binder details</h2>
          <BinderMetadataForm
            publicId={binder.publicId}
            title={binder.title}
            description={binder.description}
            coverCardPrintId={binder.coverCardPrintId}
            coverOptions={binder.checklist
              .filter(
                (slot) =>
                  slot.cardPrintId &&
                  (!requiresHostedCover || slot.hostedImage === true),
              )
              .map((slot) => ({
                cardPrintId: slot.cardPrintId as string,
                label: slot.title,
              }))}
          />
        </PageSection>
      ) : null}
      <PageSection surface="card">
        <h2 className="text-lg font-semibold text-slate-950">My sharing consent</h2>
        {binder.lifecycle === "archived" ||
        binder.moderationState === "frozen" ? (
          <BinderConsentWithdrawalForm
            publicId={binder.publicId}
            alias={binder.viewerAlias}
            contentScope={binder.viewerContentScope}
            identityScope={binder.viewerIdentityScope}
            notificationPreference={binder.viewerNotificationPreference}
          />
        ) : (
          <BinderPreferencesForm
            publicId={binder.publicId}
            viewLinksEnabled={flags.viewLinks}
            publicEnabled={flags.publicBinders}
            notificationsEnabled={flags.notifications}
            alias={binder.viewerAlias}
            contentScope={binder.viewerContentScope}
            identityScope={binder.viewerIdentityScope}
            notificationPreference={binder.viewerNotificationPreference}
          />
        )}
      </PageSection>
      {binder.canManagePolicy ? (
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">Access and collaboration</h2>
          <BinderPolicyForm
            publicId={binder.publicId}
            readAccess={binder.readAccess}
            discoverability={binder.discoverability}
            joinPolicy={binder.joinPolicy}
            contributionPolicy={binder.contributionPolicy}
            sharedEnabled={flags.shared}
            viewLinksEnabled={flags.viewLinks}
            publicEnabled={flags.publicBinders}
            communityEnabled={flags.community}
          />
        </PageSection>
      ) : null}
      {binder.canInvite && flags.shared ? (
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">Invite people</h2>
          <InvitePeopleForm publicId={binder.publicId} />
          {binder.invitations.length > 0 ? (
            <ul className="space-y-2 border-t border-slate-100 pt-4">
              {binder.invitations.map((invitation) => (
                <li
                  key={invitation.invitationPublicId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
                >
                  <p className="text-sm text-slate-700">
                    Pending {invitation.role} invitation
                    {invitation.expiresAt
                      ? ` · expires ${new Date(invitation.expiresAt).toLocaleString()}`
                      : ""}
                  </p>
                  <SimpleBinderAction
                    publicId={binder.publicId}
                    actionName="invite_revoke"
                    label="Revoke"
                    tone="danger"
                    fields={{ invitationId: invitation.invitationPublicId }}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </PageSection>
      ) : null}
      {binder.canShare && flags.viewLinks ? (
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">View-only sharing</h2>
          <ViewLinkForm publicId={binder.publicId} />
          {binder.viewLinks.length > 0 ? (
            <ul className="space-y-2 border-t border-slate-100 pt-4">
              {binder.viewLinks.map((link) => (
                <li
                  key={link.viewLinkPublicId}
                  className="rounded-2xl bg-slate-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                  {link.expiresAt ? (
                    <p className="text-xs text-slate-500">
                      Expires {new Date(link.expiresAt).toLocaleString()}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SimpleBinderAction
                      publicId={binder.publicId}
                      actionName="view_link_rotate"
                      label="Rotate link"
                      fields={{ viewLinkId: link.viewLinkPublicId }}
                    />
                    <SimpleBinderAction
                      publicId={binder.publicId}
                      actionName="view_link_revoke"
                      label="Revoke link"
                      tone="danger"
                      fields={{ viewLinkId: link.viewLinkPublicId }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </PageSection>
      ) : null}
      {binder.binderType === "custom" &&
      binder.role === "owner" &&
      flags.customBinders ? (
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">
            Custom checklist revision
          </h2>
          {showCustomEditor ? (
            <CustomRevisionForm
              publicId={binder.publicId}
              initialSlots={binder.customEditorSlots}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Editing publishes a complete new checklist revision. Open the
                editor to load the current ordered checklist.
              </p>
              <Link
                href={`/binders/${encodeURIComponent(binder.publicId)}?tab=settings&edit=checklist`}
                className="gv-secondary-button"
              >
                Edit custom checklist
              </Link>
            </div>
          )}
        </PageSection>
      ) : null}
      {binder.role === "owner" && flags.templates ? (
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">
            Community Template
          </h2>
          <TemplateSubmitForm
            publicId={binder.publicId}
            defaultName={binder.title}
            defaultDescription={binder.description}
          />
        </PageSection>
      ) : null}
      {binder.role === "owner" &&
      flags.pulseSharing &&
      binder.readAccess === "public" &&
      binder.discoverability === "listed" ? (
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">
            Share a public milestone
          </h2>
          <PulseMilestoneShareForm
            publicId={binder.publicId}
            title={binder.title}
            completed={binder.externalCompletedSlots}
            total={binder.externalTotalSlots}
            unit={binder.externalProgressUnit}
          />
        </PageSection>
      ) : null}
      {binder.role !== "owner" ? (
        <PageSection surface="subtle">
          <h2 className="text-lg font-semibold text-slate-950">Safety and access</h2>
          <BinderTrustSafetyControls
            publicId={binder.publicId}
            allowBlock
          />
          {binder.canLeave ? (
            <div className="border-t border-slate-200 pt-4">
              <SimpleBinderAction
                publicId={binder.publicId}
                actionName="leave"
                label="Leave Binder"
                tone="danger"
              />
              <p className="mt-2 text-xs text-slate-500">
                Leaving removes your Binder contributions but never your Vault cards.
              </p>
            </div>
          ) : null}
        </PageSection>
      ) : null}
      {binder.canArchive ? (
        <PageSection surface="subtle">
          <h2 className="text-lg font-semibold text-slate-950">Binder lifecycle</h2>
          <div className="flex flex-wrap gap-3">
            <SimpleBinderAction
              publicId={binder.publicId}
              actionName={binder.lifecycle === "archived" ? "restore" : "archive"}
              label={binder.lifecycle === "archived" ? "Restore Binder" : "Archive Binder"}
            />
          </div>
          <div className="border-t border-red-200 pt-5">
            <h3 className="font-semibold text-red-900">Delete Binder</h3>
            <DeleteBinderForm publicId={binder.publicId} title={binder.title} />
          </div>
        </PageSection>
      ) : null}
    </div>
  );
}

export function BinderWorkspace({
  binder,
  tab,
  flags,
  showEligibleCopies,
  currentFilter,
  showBulkPreview,
  showCustomEditor,
}: {
  binder: BinderDetail;
  tab: BinderTab;
  flags: BinderFeatureFlags;
  showEligibleCopies: boolean;
  currentFilter: string;
  showBulkPreview: boolean;
  showCustomEditor: boolean;
}) {
  return (
    <div className="space-y-8">
      <BinderLiveRefresh
        publicId={binder.publicId}
        enabled={!binder.stalePermission}
      />
      {binder.stalePermission ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Your Binder access changed while this page was open. Refresh before making changes.
        </div>
      ) : null}
      <PageSection surface="card" spacing="loose">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="h-56 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-50 sm:w-40">
            <PublicCardImage
              src={binder.coverImageUrl ?? undefined}
              alt={`${binder.title} cover artwork`}
              imageClassName="h-full w-full object-contain"
              fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
              priority
              sizes="(max-width: 640px) 90vw, 160px"
            />
          </div>
          <div className="min-w-0">
            <p className="gv-eyebrow capitalize">{binder.role} · {binder.targetLabel}</p>
            <h1 className="gv-display-title mt-2 break-words">{binder.title}</h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {binder.readAccess} · {binder.discoverability}
            </p>
            {binder.description ? (
              <p className="gv-body-copy mt-3 max-w-2xl whitespace-pre-wrap break-words">
                {binder.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {binder.canShare || binder.canInvite ? (
              <Link
                href={`/binders/${encodeURIComponent(binder.publicId)}?tab=settings`}
                className="gv-primary-button"
              >
                Share / Invite
              </Link>
            ) : null}
            <Link href="/binders" className="gv-secondary-button">
              All Binders
            </Link>
          </div>
        </div>
        <BinderProgress
          completed={binder.completedSlots}
          total={binder.totalSlots}
          unit={binder.progressUnit}
        />
        <p className="text-sm text-slate-600">
          {binder.memberCount} {binder.memberCount === 1 ? "member" : "members"} · {binder.checklistMode.replaceAll("_", " ")}
        </p>
      </PageSection>

      <nav aria-label="Binder sections" className="overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          {TABS.map((item) => (
            <Link
              key={item.value}
              href={`/binders/${encodeURIComponent(binder.publicId)}?tab=${item.value}`}
              aria-current={tab === item.value ? "page" : undefined}
              className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === item.value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
              {item.value === "members" && binder.pendingJoinRequestCount > 0
                ? ` (${binder.pendingJoinRequestCount})`
                : item.value === "checklist" && binder.pendingContributionCount > 0
                  ? ` (${binder.pendingContributionCount})`
                  : ""}
            </Link>
          ))}
        </div>
      </nav>

      {tab === "checklist" ? (
        <ChecklistTab
          binder={binder}
          showEligibleCopies={showEligibleCopies}
          sharedEnabled={flags.shared}
          currentFilter={currentFilter}
          showBulkPreview={showBulkPreview}
        />
      ) : null}
      {tab === "activity" ? <ActivityTab binder={binder} /> : null}
      {tab === "members" ? <MembersTab binder={binder} flags={flags} /> : null}
      {tab === "settings" ? (
        <SettingsTab
          binder={binder}
          flags={flags}
          showCustomEditor={showCustomEditor}
        />
      ) : null}
    </div>
  );
}
