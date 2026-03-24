import Link from "next/link";
import { redirect } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { getUserCardInteractions } from "@/lib/network/getUserCardInteractions";
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

export default async function NetworkInboxPage() {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login?next=/network/inbox");
  }

  const interactions = await getUserCardInteractions(user.id);
  const received = interactions.filter((row) => row.direction === "received");
  const sent = interactions.filter((row) => row.direction === "sent");

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

      {interactions.length === 0 ? (
        <PublicCollectionEmptyState
          title="No interactions yet"
          body="Messages you send or receive about specific cards will appear here."
        />
      ) : (
        <>
          <PageSection spacing="compact">
            <SectionHeader
              title="Received"
              description="Collectors contacting you about cards you exposed in the network."
            />
            {received.length === 0 ? (
              <PublicCollectionEmptyState title="Nothing received yet" body="Incoming interactions will appear here." />
            ) : (
              <div className="space-y-4">
                {received.map((row) => (
                  <article key={row.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <Link href={`/card/${row.card.gvId}`} className="w-[96px] shrink-0">
                        <PublicCardImage
                          src={row.card.imageUrl ?? undefined}
                          alt={row.card.name}
                          imageClassName="aspect-[3/4] w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 object-contain p-1.5"
                          fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[0.9rem] border border-slate-200 bg-slate-100 px-2 text-center text-[10px] text-slate-500"
                          fallbackLabel={row.card.name}
                        />
                      </Link>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            From {row.counterpartDisplayName}
                          </p>
                          <Link href={`/card/${row.card.gvId}`} className="block">
                            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{row.card.name}</h2>
                          </Link>
                          <p className="text-sm text-slate-600">
                            {[row.card.setName || row.card.setCode, row.card.number !== "—" ? `#${row.card.number}` : undefined]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                        <p className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                          {row.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                            {row.status}
                          </span>
                          <span>{formatTimestamp(row.createdAt)}</span>
                          {row.counterpartSlug ? (
                            <Link href={`/u/${row.counterpartSlug}`} className="font-medium text-slate-700 underline-offset-4 hover:underline">
                              View collector
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </PageSection>

          <PageSection spacing="compact">
            <SectionHeader
              title="Sent"
              description="Interactions you started from the network or card detail surfaces."
            />
            {sent.length === 0 ? (
              <PublicCollectionEmptyState title="Nothing sent yet" body="Messages you start will appear here." />
            ) : (
              <div className="space-y-4">
                {sent.map((row) => (
                  <article key={row.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <Link href={`/card/${row.card.gvId}`} className="w-[96px] shrink-0">
                        <PublicCardImage
                          src={row.card.imageUrl ?? undefined}
                          alt={row.card.name}
                          imageClassName="aspect-[3/4] w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 object-contain p-1.5"
                          fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[0.9rem] border border-slate-200 bg-slate-100 px-2 text-center text-[10px] text-slate-500"
                          fallbackLabel={row.card.name}
                        />
                      </Link>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            To {row.counterpartDisplayName}
                          </p>
                          <Link href={`/card/${row.card.gvId}`} className="block">
                            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{row.card.name}</h2>
                          </Link>
                          <p className="text-sm text-slate-600">
                            {[row.card.setName || row.card.setCode, row.card.number !== "—" ? `#${row.card.number}` : undefined]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                        <p className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                          {row.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                            {row.status}
                          </span>
                          <span>{formatTimestamp(row.createdAt)}</span>
                          {row.counterpartSlug ? (
                            <Link href={`/u/${row.counterpartSlug}`} className="font-medium text-slate-700 underline-offset-4 hover:underline">
                              View collector
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </PageSection>
        </>
      )}
    </div>
  );
}
