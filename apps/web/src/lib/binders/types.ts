export type BinderRole = "owner" | "manager" | "contributor" | "viewer";
export type BinderLifecycle = "active" | "archived";
export type BinderReadAccess = "private" | "link" | "public";
export type BinderDiscoverability = "unlisted" | "listed";
export type BinderJoinPolicy = "closed" | "invite_only" | "request_to_join";
export type BinderContributionPolicy =
  | "owner_only"
  | "members_direct"
  | "approval_required";
export type BinderConsent = "none" | "link" | "public";
export type BinderNotificationPreference = "immediate" | "digest" | "muted";
export type BinderProgressUnit = "card_prints" | "finish_options" | "custom_slots";
export type BinderModerationState =
  | "clear"
  | "forced_unlisted"
  | "frozen"
  | "removed";

export type BinderSummary = {
  publicId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  binderType: "species" | "set" | "custom";
  role: BinderRole;
  lifecycle: BinderLifecycle;
  completedSlots: number;
  totalSlots: number;
  progressUnit: BinderProgressUnit;
  memberCount: number;
  updatedAt: string | null;
};

export type BinderInvitationSummary = {
  invitationPublicId: string;
  binderPublicId: string;
  binderTitle: string;
  role: Exclude<BinderRole, "owner">;
  expiresAt: string | null;
};

export type BinderSuspendedSummary = {
  publicId: string;
  canLeave: boolean;
  canReport: boolean;
};

export type BinderDashboard = {
  continueBuilding: BinderSummary[];
  sharedWithMe: BinderSummary[];
  invitations: BinderInvitationSummary[];
  completed: BinderSummary[];
  archived: BinderSummary[];
  suspended: BinderSuspendedSummary[];
  nextCursor: string | null;
  invitationsNextCursor: string | null;
  suspendedNextCursor: string | null;
  loadedAt: string | null;
  legacyCandidates: BinderLegacyCandidate[];
};

export type BinderChecklistContribution = {
  contributionPublicId: string | null;
  state: "pending" | "active";
  memberLabel: string;
  isOwn: boolean;
  canRemove: boolean;
  canDecide: boolean;
};

export type BinderPublicContributionAction = {
  contributionActionRef: string | null;
  memberActionRef: string | null;
  alias: string | null;
  identityVisible: boolean;
  canReport: boolean;
  canBlock: boolean;
};

export type BinderChecklistSlot = {
  slotPublicId: string;
  cardPrintId: string | null;
  cardPrintingId: string | null;
  title: string;
  subtitle: string | null;
  finishLabel: string | null;
  imageUrl: string | null;
  hostedImage: boolean;
  status: "in_binder" | "missing";
  inYourVault: boolean;
  contributedByYou: boolean;
  needsFinishReview: boolean;
  satisfiedQuantity: number;
  requiredQuantity: number;
  contributors: Array<{ alias: string | null; identityVisible: boolean }>;
  contributions: BinderChecklistContribution[];
  publicContributionActions: BinderPublicContributionAction[];
  publicContributionActionsHasMore: boolean;
  contributionPublicId: string | null;
  contributionState: "none" | "pending" | "active";
};

export type BinderActivityItem = {
  eventPublicId: string;
  kind: string;
  summary: string;
  actorLabel: string | null;
  createdAt: string | null;
};

export type BinderMember = {
  membershipPublicId: string;
  displayName: string;
  role: BinderRole;
  status: "active" | "suspended";
  alias: string | null;
  externalContentConsent: BinderConsent;
  identityAttributionConsent: BinderConsent;
  canManage: boolean;
};

export type BinderEligibleCopy = {
  copyReference: string;
  cardPrintId: string;
  cardPrintingId: string | null;
  title: string;
  finishLabel: string | null;
  imageUrl: string | null;
  eligible: boolean;
  reason: string | null;
};

export type BinderDetail = BinderSummary & {
  coverCardPrintId: string | null;
  moderationState: BinderModerationState;
  targetLabel: string;
  checklistMode: "card_prints" | "master_variants" | "master_set" | "custom";
  readAccess: BinderReadAccess;
  discoverability: BinderDiscoverability;
  joinPolicy: BinderJoinPolicy;
  contributionPolicy: BinderContributionPolicy;
  canEdit: boolean;
  canManageMembers: boolean;
  canContribute: boolean;
  canManagePolicy: boolean;
  canTransfer: boolean;
  canArchive: boolean;
  canInvite: boolean;
  canApprove: boolean;
  canShare: boolean;
  canLeave: boolean;
  viewerMembershipPublicId: string;
  viewerAlias: string | null;
  viewerContentScope: BinderConsent;
  viewerIdentityScope: BinderConsent;
  viewerNotificationPreference: BinderNotificationPreference;
  externalCompletedSlots: number;
  externalTotalSlots: number;
  externalProgressUnit: BinderProgressUnit;
  checklist: BinderChecklistSlot[];
  activity: BinderActivityItem[];
  members: BinderMember[];
  eligibleCopies: BinderEligibleCopy[];
  bulkPreview: BinderBulkPreview | null;
  customEditorSlots: BinderChecklistSlot[];
  pendingContributionCount: number;
  pendingJoinRequestCount: number;
  pendingContributions: Array<{
    contributionPublicId: string;
    title: string;
    memberLabel: string;
    canDecide: boolean;
    canRemove: boolean;
  }>;
  pendingJoinRequests: Array<{
    requestPublicId: string;
    memberLabel: string;
    requestedRole: Exclude<BinderRole, "owner">;
    canDecide: boolean;
  }>;
  invitations: Array<{
    invitationPublicId: string;
    role: Exclude<BinderRole, "owner">;
    accountTargeted: boolean;
    expiresAt: string | null;
  }>;
  viewLinks: Array<{
    viewLinkPublicId: string;
    label: string;
    expiresAt: string | null;
  }>;
  ownerTransferOffer: {
    offerPublicId: string;
    targetMemberPublicId: string;
    formerOwnerRole: Exclude<BinderRole, "owner"> | "leave";
    isTargetViewer: boolean;
    expiresAt: string | null;
  } | null;
  checklistNextCursor: string | null;
  pendingContributionsNextCursor: string | null;
  activityNextCursor: string | null;
  membersNextCursor: string | null;
  pendingJoinRequestsNextCursor: string | null;
  eligibleCopiesNextCursor: string | null;
  stalePermission: boolean;
  loadedAt: string;
};

export type BinderPublicProjection = {
  publicId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  targetLabel: string;
  completedSlots: number;
  totalSlots: number;
  progressUnit: BinderProgressUnit;
  memberCount: number;
  listed: boolean;
  moderated: boolean;
  canRequestToJoin: boolean;
  canReport: boolean;
  canBlockOwner: boolean;
  joinRequestPublicId: string | null;
  joinRequestStatus: "none" | "pending" | "approved" | "rejected";
  checklist: BinderChecklistSlot[];
  checklistNextCursor: string | null;
};

export type BinderInvitationPreview = {
  state: "active" | "expired" | "revoked" | "accepted" | "declined" | "ineligible";
  binderTitle: string | null;
  inviterLabel: string | null;
  role: Exclude<BinderRole, "owner"> | null;
  expiresAt: string | null;
  privacyCopy: string;
};

export type BinderTemplateSummary = {
  templatePublicId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  checklistSlotCount: number;
  adoptionCount: number | null;
  version: number;
};

export type BinderTemplateDetail = BinderTemplateSummary & {
  targetLabel: string;
  checklist: BinderChecklistSlot[];
  checklistNextCursor: string | null;
};

export type BinderExploreResult = {
  items: BinderPublicProjection[];
  nextCursor: string | null;
};

export type BinderActionState = {
  ok: boolean;
  message: string;
  code?: string;
  secretUrl?: string;
};

export type BinderLegacyCandidate = {
  watchPublicId: string;
  targetKind: "species" | "set";
  targetId: string;
  title: string;
  routeKey: string | null;
  imageUrl: string | null;
};

export type BinderBulkPreview = {
  eligibleCount: number;
  duplicateCount: number;
  unresolvedCount: number;
  ineligibleCount: number;
  eligibleCopies: BinderEligibleCopy[];
  nextCursor: string | null;
};
