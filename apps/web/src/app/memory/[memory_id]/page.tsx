import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageSection from "@/components/layout/PageSection";
import PublicCardImage from "@/components/PublicCardImage";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Collector Memory | Grookai Vault",
  description: "Open a shared collector Memory on Grookai Vault.",
  robots: { index: false, follow: false },
};

type MemoryRouteRow = {
  id: string;
  gv_vi_id: string | null;
  card_name: string | null;
  set_name: string | null;
  card_image_url: string | null;
  gv_id: string | null;
  owner_slug: string | null;
  owner_display_name: string | null;
  viewer_is_owner: boolean;
  memory_type: string;
  note: string | null;
  photo_path: string | null;
  place_label: string | null;
  occasion_label: string | null;
  memory_date: string | null;
  is_public: boolean;
  published_at: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function firstRow(value: unknown): MemoryRouteRow | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const row = value[0];
  return row && typeof row === "object" ? (row as MemoryRouteRow) : null;
}

function formatMemoryType(value: string) {
  switch (value.trim().toLowerCase()) {
    case "added_place":
      return "Added here";
    case "occasion":
      return "Occasion";
    case "first":
      return "First memory";
    default:
      return "Collector note";
  }
}

function formatDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function CollectorMemoryRoutePage(props: {
  params: Promise<{ memory_id: string }>;
}) {
  const params = await props.params;
  const memoryId = params.memory_id.trim();
  if (!isUuid(memoryId)) notFound();

  const currentPath = `/memory/${encodeURIComponent(memoryId)}`;
  const { supabase } = await requireServerUser(currentPath);
  const { data, error } = await supabase.rpc(
    "collector_memory_accessible_by_id_v1",
    { p_memory_id: memoryId },
  );
  if (error) {
    console.error("collector_memory_route_read_failed", {
      code: error.code,
      memoryId,
    });
    notFound();
  }

  const memory = firstRow(data);
  if (!memory) notFound();

  let signedPhotoUrl: string | null = null;
  if (memory.photo_path) {
    const { data: signedPhoto } = await supabase.storage
      .from("collector-memory-images")
      .createSignedUrl(memory.photo_path, 300);
    signedPhotoUrl = signedPhoto?.signedUrl ?? null;
  }

  const cardName = memory.card_name?.trim() || "Card memory";
  const ownerName = memory.owner_display_name?.trim() || "Collector";
  const memoryDate = formatDate(memory.memory_date);
  const imageUrl =
    signedPhotoUrl ||
    (memory.gv_id
      ? `/api/canon/cards/${encodeURIComponent(memory.gv_id)}/image`
      : memory.card_image_url);
  const details = [
    memoryDate ? { label: "Date", value: memoryDate } : null,
    memory.place_label?.trim()
      ? { label: "Place", value: memory.place_label.trim() }
      : null,
    memory.occasion_label?.trim()
      ? { label: "Occasion", value: memory.occasion_label.trim() }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className="space-y-7 py-6 md:space-y-9 md:py-8">
      <header className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold uppercase text-emerald-700">
          {formatMemoryType(memory.memory_type)}
        </p>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
          {cardName}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {memory.viewer_is_owner ? "Your collector Memory" : `Shared by ${ownerName}`}
          {memory.set_name?.trim() ? ` · ${memory.set_name.trim()}` : ""}
        </p>
      </header>

      <div className="grid gap-7 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <div className="mx-auto w-full max-w-xl lg:mx-0">
          <PublicCardImage
            src={imageUrl ?? undefined}
            alt={`Memory for ${cardName}`}
            imageClassName="max-h-[70vh] w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm dark:border-slate-700 dark:bg-slate-950"
            fallbackClassName="flex aspect-[5/7] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            fallbackLabel={`Image unavailable for ${cardName}`}
          />
        </div>

        <div className="space-y-6">
          <PageSection surface="card" spacing="loose">
            <SectionHeader
              title="Memory"
              description={memory.viewer_is_owner && !memory.is_public ? "Private" : "Shared with collectors"}
            />
            {memory.note?.trim() ? (
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-800 dark:text-slate-100">
                {memory.note.trim()}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This Memory does not include a written note.
              </p>
            )}

            {details.length > 0 ? (
              <dl className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-700">
                {details.map((detail) => (
                  <div key={detail.label}>
                    <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      {detail.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </PageSection>

          <div className="flex flex-wrap gap-3">
            {memory.gv_id ? (
              <Link href={`/card/${encodeURIComponent(memory.gv_id)}`} className="gv-primary-button">
                View card
              </Link>
            ) : null}
            {!memory.viewer_is_owner && memory.owner_slug ? (
              <Link href={`/u/${encodeURIComponent(memory.owner_slug)}`} className="gv-secondary-button">
                View collector
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
