import Link from "next/link";
import { redirect } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import InteractionGroupControls from "@/components/network/InteractionGroupControls";
import InteractionGroupExecutionPanel from "@/components/network/InteractionGroupExecutionPanel";
import InteractionGroupReadMarker from "@/components/network/InteractionGroupReadMarker";
import InteractionGroupReplyForm from "@/components/network/InteractionGroupReplyForm";
import SectionHeader from "@/components/layout/SectionHeader";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import {
  getUserCardInteractionGroups,
  type UserCardInteractionGroup,
  type UserCardInteractionInboxView,
} from "@/lib/network/getUserCardInteractions";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeInboxView(value: string | string[] | undefined): UserCardInteractionInboxView {
  const candidate = Array.isArray(value) ? value[0] : value;

  switch (candidate) {
    case "unread":
    case "sent":
    case "closed":
      return candidate;
    default:
      return "inbox";
  }
}

function normalizeCardFilter(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") {
    return null;
  }

  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildInboxHref(view: UserCardInteractionInboxView, cardPrintId: string | null = null) {
  const params = new URLSearchParams();
  if (view !== "inbox") {
    params.set("view", view);
  }
  if (cardPrintId) {
    params.set("card", cardPrintId);
  }

  const query = params.toString();
  return query ? `/network/inbox?${query}` : "/network/inbox";
}

function getConversationPill(group: UserCardInteractionGroup) {
  if (group.conversationState === "archived") {
    return "Archived";
  }

  if (group.conversationState === "closed") {
    return "Closed";
  }

  if (group.hasUnread) {
    return "New";
  }

  return "Active";
}

function getLatestMessage(group: UserCardInteractionGroup) {
  return group.messages[group.messages.length - 1] ?? null;
}

function getMessagePreview(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : "No message yet.";
}

function getVisibleGroups(groups: UserCardInteractionGroup[], view: UserCardInteractionInboxView) {
  switch (view) {
    case "unread":
      return groups.filter((group) => group.conversationState === "inbox" && group.hasUnread);
    case "sent":
      return groups.filter((group) => group.conversationState === "inbox" && group.startedByCurrentUser);
    case "closed":
      return groups.filter((group) => group.conversationState !== "inbox");
    case "inbox":
    default:
      return groups.filter((group) => group.conversationState === "inbox");
  }
}

function filterGroupsByCardPrintId(groups: UserCardInteractionGroup[], cardPrintId: string | null) {
  if (!cardPrintId) {
    return groups;
  }

  return groups.filter((group) => group.card.cardPrintId === cardPrintId);
}

function getViewCopy(view: UserCardInteractionInboxView) {
  switch (view) {
    case "unread":
      return {
        title: "Unread",
        description: "Card messages with new collector activity you have not cleared yet.",
        emptyTitle: "Nothing unread",
        emptyBody: "New card messages from collectors will appear here.",
      };
    case "sent":
      return {
        title: "Sent",
        description: "Active card messages you started with another collector.",
        emptyTitle: "Nothing in Sent",
        emptyBody: "Messages you initiate will appear here while they stay active.",
      };
    case "closed":
      return {
        title: "Closed / Archived",
        description: "Card messages you removed from the active workflow.",
        emptyTitle: "Nothing closed or archived",
        emptyBody: "Closed or archived card messages will appear here.",
      };
    case "inbox":
    default:
      return {
        title: "Inbox",
        description: "Active grouped card messages with collectors, ordered by the latest reply.",
        emptyTitle: "No active messages",
        emptyBody: "Messages you send or receive about specific cards will appear here.",
      };
  }
}

function InboxViewTabs({
  currentView,
  cardPrintId,
  unreadCount,
  inboxCount,
  sentCount,
  closedCount,
}: {
  currentView: UserCardInteractionInboxView;
  cardPrintId: string | null;
  unreadCount: number;
  inboxCount: number;
  sentCount: number;
  closedCount: number;
}) {
  const items: Array<{
    view: UserCardInteractionInboxView;
    label: string;
    count: number;
  }> = [
    { view: "unread", label: "Unread", count: unreadCount },
    { view: "inbox", label: "Inbox", count: inboxCount },
    { view: "sent", label: "Sent", count: sentCount },
    { view: "closed", label: "Closed / Archived", count: closedCount },
  ];

  return (
    <PageSection surface="subtle" spacing="compact" className="p-2.5">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = item.view === currentView;
          return (
            <Link
              key={item.view}
              href={buildInboxHref(item.view, cardPrintId)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border border-slate-300 bg-white text-slate-950 shadow-sm"
                  : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
              }`}
            >
              <span>{item.label}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {item.count}
              </span>
            </Link>
          );
        })}
      </div>
    </PageSection>
  );
}

function InteractionGroupCard({
  group,
  currentPath,
}: {
  group: UserCardInteractionGroup;
  currentPath: string;
}) {
  const pillLabel = getConversationPill(group);
  const latestMessage = getLatestMessage(group);
  const hasExecutionActions = group.ownedSourceInstances.length > 0 || Boolean(group.latestOutcome);
  const hasSecondaryActions = hasExecutionActions || group.conversationState === "inbox";
  const secondarySummaryLabel = group.latestOutcome ? "Card actions • outcome recorded" : "Card actions";
  const pillClassName =
    group.conversationState === "archived"
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : group.conversationState === "closed"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : group.hasUnread
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-700";

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href={`/card/${group.card.gvId}`} className="mx-auto w-[96px] shrink-0 sm:mx-0">
          <PublicCardImage
            src={group.card.imageUrl ?? undefined}
            alt={group.card.name}
            imageClassName="aspect-[3/4] w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 object-contain p-1.5"
            fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[0.9rem] border border-slate-200 bg-slate-100 px-2 text-center text-[10px] text-slate-500"
            fallbackLabel={group.card.name}
          />
        </Link>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className={`rounded-full border px-2.5 py-1 font-medium ${pillClassName}`}>{pillLabel}</span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                {group.messageCount} {group.messageCount === 1 ? "message" : "messages"}
              </span>
              <span>{formatTimestamp(group.latestCreatedAt)}</span>
              {group.counterpartSlug ? (
                <Link href={`/u/${group.counterpartSlug}`} className="font-medium text-slate-700 underline-offset-4 hover:underline">
                  View collector
                </Link>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                With {group.counterpartDisplayName}
              </p>
              <Link href={`/card/${group.card.gvId}`} className="block">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{group.card.name}</h2>
              </Link>
              <p className="text-sm text-slate-600">
                {[group.card.setName || group.card.setCode, group.card.number !== "—" ? `#${group.card.number}` : undefined]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>

            {latestMessage ? (
              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span>Latest</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{latestMessage.direction === "sent" ? "You" : group.counterpartDisplayName}</span>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-slate-700">
                  {getMessagePreview(latestMessage.message)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-[1rem] border border-slate-200 bg-white/70 px-3 py-3">
            {group.messages.map((message, index) => (
              <div
                key={message.id}
                className={`${index > 0 ? "border-t border-slate-100 pt-2.5" : ""}`}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span>{message.direction === "sent" ? "You" : group.counterpartDisplayName}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{formatTimestamp(message.createdAt)}</span>
                </div>
                <p className="text-sm leading-6 text-slate-700">{message.message}</p>
              </div>
            ))}
          </div>

          {group.conversationState === "inbox" && group.vaultItemId ? (
            <InteractionGroupReplyForm
              vaultItemId={group.vaultItemId}
              cardPrintId={group.card.cardPrintId}
              counterpartUserId={group.counterpartUserId}
              counterpartDisplayName={group.counterpartDisplayName}
              currentPath={currentPath}
            />
          ) : null}

          {hasSecondaryActions ? (
            <details className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                {secondarySummaryLabel}
              </summary>
              <div className="mt-3 space-y-3">
                <InteractionGroupExecutionPanel
                  latestInteractionId={group.latestInteractionId}
                  counterpartDisplayName={group.counterpartDisplayName}
                  cardName={group.card.name}
                  currentPath={currentPath}
                  ownedSourceInstances={group.ownedSourceInstances}
                  latestOutcome={group.latestOutcome}
                  pendingTradeExecutionEventId={group.pendingTradeExecutionEventId}
                  hasAmbiguousPendingTradeEvent={group.hasAmbiguousPendingTradeEvent}
                />

                <InteractionGroupControls
                  cardPrintId={group.card.cardPrintId}
                  counterpartUserId={group.counterpartUserId}
                  currentPath={currentPath}
                  hasUnread={group.hasUnread}
                  conversationState={group.conversationState}
                />
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default async function NetworkInboxPage({
  searchParams,
}: {
  searchParams?: { view?: string | string[]; card?: string | string[] };
}) {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login?next=/network/inbox");
  }

  const currentView = normalizeInboxView(searchParams?.view);
  const currentCardFilter = normalizeCardFilter(searchParams?.card);
  const currentPath = buildInboxHref(currentView, currentCardFilter);
  const groups = await getUserCardInteractionGroups(user.id);
  const unreadCount = groups.filter((group) => group.conversationState === "inbox" && group.hasUnread).length;
  const inboxCount = groups.filter((group) => group.conversationState === "inbox").length;
  const sentCount = groups.filter((group) => group.conversationState === "inbox" && group.startedByCurrentUser).length;
  const closedCount = groups.filter((group) => group.conversationState !== "inbox").length;
  const visibleGroups = filterGroupsByCardPrintId(getVisibleGroups(groups, currentView), currentCardFilter);
  const viewCopy = getViewCopy(currentView);
  const filteredCard = currentCardFilter
    ? groups.find((group) => group.card.cardPrintId === currentCardFilter)?.card ?? null
    : null;
  const autoReadTargets =
    currentView === "inbox"
      ? visibleGroups
          .filter((group) => group.hasUnread)
          .map((group) => ({
            cardPrintId: group.card.cardPrintId,
            counterpartUserId: group.counterpartUserId,
          }))
      : [];

  return (
    <div className="space-y-8 py-8">
      <PageSection surface="card" spacing="compact" className="px-5 py-5 sm:px-6">
        <PageIntro
          eyebrow="Messages"
          title="Messages about cards"
          description="Reply to collectors about specific cards without losing the card context."
          actions={
            <Link
              href="/network"
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Browse network
            </Link>
          }
        />
      </PageSection>

      <InboxViewTabs
        currentView={currentView}
        cardPrintId={currentCardFilter}
        unreadCount={unreadCount}
        inboxCount={inboxCount}
        sentCount={sentCount}
        closedCount={closedCount}
      />

      <PageSection spacing="compact">
        <SectionHeader
          title={
            filteredCard
              ? `${viewCopy.title} for ${filteredCard.name}`
              : viewCopy.title
          }
          description={
            filteredCard
              ? `Messages tied to ${filteredCard.name}.`
              : viewCopy.description
          }
          actions={
            currentCardFilter ? (
              <Link
                href={buildInboxHref(currentView)}
                className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
              >
                All messages
              </Link>
            ) : null
          }
        />

        {autoReadTargets.length > 0 ? (
          <InteractionGroupReadMarker currentPath={currentPath} targets={autoReadTargets} />
        ) : null}

        {visibleGroups.length === 0 ? (
          <PublicCollectionEmptyState title={viewCopy.emptyTitle} body={viewCopy.emptyBody} />
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <InteractionGroupCard key={group.groupKey} group={group} currentPath={currentPath} />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
