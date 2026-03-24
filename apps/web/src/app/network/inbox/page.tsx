import Link from "next/link";
import { redirect } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { getUserCardInteractionGroups, type UserCardInteractionGroup } from "@/lib/network/getUserCardInteractions";
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

function InteractionGroupCard({
  group,
  counterpartLabel,
}: {
  group: UserCardInteractionGroup;
  counterpartLabel: "From" | "To";
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href={`/card/${group.card.gvId}`} className="w-[96px] shrink-0">
          <PublicCardImage
            src={group.card.imageUrl ?? undefined}
            alt={group.card.name}
            imageClassName="aspect-[3/4] w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 object-contain p-1.5"
            fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[0.9rem] border border-slate-200 bg-slate-100 px-2 text-center text-[10px] text-slate-500"
            fallbackLabel={group.card.name}
          />
        </Link>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {counterpartLabel} {group.counterpartDisplayName}
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

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
              {group.status}
            </span>
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

          <div className="space-y-2">
            {group.messages.map((message) => (
              <div key={message.id} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span>{message.direction === "sent" ? "Sent" : "Received"}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{formatTimestamp(message.createdAt)}</span>
                </div>
                <p className="text-sm leading-6 text-slate-700">{message.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function InteractionGroupSection({
  title,
  description,
  emptyTitle,
  emptyBody,
  groups,
  counterpartLabel,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  groups: UserCardInteractionGroup[];
  counterpartLabel: "From" | "To";
}) {
  return (
    <PageSection spacing="compact">
      <SectionHeader title={title} description={description} />
      {groups.length === 0 ? (
        <PublicCollectionEmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <InteractionGroupCard key={group.groupKey} group={group} counterpartLabel={counterpartLabel} />
          ))}
        </div>
      )}
    </PageSection>
  );
}

export default async function NetworkInboxPage() {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login?next=/network/inbox");
  }

  const groups = await getUserCardInteractionGroups(user.id);
  const received = groups.filter((group) => group.direction === "received");
  const sent = groups.filter((group) => group.direction === "sent");

  return (
    <div className="space-y-8 py-8">
      <PageSection surface="card" spacing="compact" className="px-5 py-5 sm:px-6">
        <PageIntro
          eyebrow="Interactions"
          title="Card interaction inbox"
          description="Phase 1 inbox for card-anchored contact. Replies and thread continuity land in the next phase."
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

      {groups.length === 0 ? (
        <PublicCollectionEmptyState
          title="No interactions yet"
          body="Messages you send or receive about specific cards will appear here."
        />
      ) : (
        <>
          <InteractionGroupSection
            title="Received"
            description="Card-anchored conversations where the latest interaction came from another collector."
            emptyTitle="Nothing received yet"
            emptyBody="Incoming interactions will appear here."
            groups={received}
            counterpartLabel="From"
          />

          <InteractionGroupSection
            title="Sent"
            description="Card-anchored conversations where your latest interaction was sent to another collector."
            emptyTitle="Nothing sent yet"
            emptyBody="Messages you start will appear here."
            groups={sent}
            counterpartLabel="To"
          />
        </>
      )}
    </div>
  );
}
