import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import {
  CollectorCardFacts,
  CollectorEvidenceDisclosure,
} from "@/components/collector/CollectorCardPresentation";
import ProductState from "@/components/layout/ProductState";
import PublicCardImage from "@/components/PublicCardImage";
import { OwnerWallSectionRail } from "@/components/wall/OwnerWallSectionRail";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import {
  applyChildDisplayImageFallback,
  getChildDisplayImageFallbacks,
} from "@/lib/cards/childDisplayImageFallbacks";
import { resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
import { getOwnerWallSections } from "@/lib/wallSections/getOwnerWallSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WallFeedRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  created_at: string | null;
  image_url: string | null;
  image_best: string | null;
  image_alt_url: string | null;
};

type WallCard = {
  id: string;
  gv_id: string;
  name: string;
  display_name: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  set_identity_model?: string;
  set_code: string;
  set_name: string;
  number: string;
  created_at: string | null;
  image_url?: string;
  image_status?: string | null;
  image_note?: string | null;
  display_image_kind?: "exact" | "representative" | "missing_variant_visual" | "missing" | "blocked";
};

type WallIdentityRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  sets?:
    | {
        name: string | null;
        identity_model: string | null;
      }
    | {
        name: string | null;
        identity_model: string | null;
      }[]
    | null;
};

type WallPublicProfileRow = {
  slug: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
};

function formatTimeAgo(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function getWallIdentityByGvId(
  supabase: SupabaseClient,
  gvIds: string[],
) {
  const normalizedIds = Array.from(new Set(gvIds.map((value) => value.trim()).filter(Boolean)));
  if (normalizedIds.length === 0) {
    return new Map<string, WallIdentityRow>();
  }

  const { data, error } = await supabase
    .from("card_prints")
    .select(
      "id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)",
    )
    .in("gv_id", normalizedIds);

  if (error || !data) {
    return new Map<string, WallIdentityRow>();
  }

  return new Map(
    (data as WallIdentityRow[])
      .filter((row): row is WallIdentityRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
      .map((row) => [row.gv_id, row]),
  );
}

async function normalizeFeed(
  rows: WallFeedRow[] | null | undefined,
  identityByGvId: Map<string, WallIdentityRow>,
  supabase: SupabaseClient,
): Promise<WallCard[]> {
  const childDisplayImageFallbacks = await getChildDisplayImageFallbacks(
    supabase,
    Array.from(identityByGvId.values()),
  );
  const resolvedRows = await Promise.all((rows ?? [])
    .filter((row): row is WallFeedRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map(async (row) => {
      const identityRow = identityByGvId.get(row.gv_id);
      const rawImageFields = await resolveCardImageFieldsV1(identityRow);
      const imageFields = applyChildDisplayImageFallback(
        rawImageFields,
        identityRow?.id ? childDisplayImageFallbacks.get(identityRow.id) : null,
      );
      const setRecord = Array.isArray(identityRow?.sets) ? identityRow?.sets[0] : identityRow?.sets;
      const name = identityRow?.name?.trim() || row.name?.trim() || "Unknown card";
      const setCode = identityRow?.set_code?.trim() || row.set_code?.trim() || "Unknown set";
      const number = identityRow?.number?.trim() || row.number?.trim() || "—";
      const displayIdentity = resolveDisplayIdentity({
        name,
        variant_key: identityRow?.variant_key ?? null,
        printed_identity_modifier: identityRow?.printed_identity_modifier ?? null,
        set_identity_model: setRecord?.identity_model ?? null,
        set_code: setCode,
        number,
      });

      return {
        id: row.id,
        gv_id: row.gv_id,
        name,
        display_name: displayIdentity.display_name,
        variant_key: identityRow?.variant_key?.trim() || undefined,
        printed_identity_modifier: identityRow?.printed_identity_modifier?.trim() || undefined,
        set_identity_model: setRecord?.identity_model?.trim() || undefined,
        set_code: setCode,
        set_name: setRecord?.name?.trim() || row.set_name?.trim() || row.set_code?.trim() || "Unknown set",
        number,
        created_at: row.created_at,
        image_url:
          resolveDisplayImageUrl({
            display_image_url: imageFields.display_image_url,
            image_url: row.image_url,
            image_alt_url: row.image_best ?? row.image_alt_url,
            representative_image_url: imageFields.representative_image_url,
          }) ?? undefined,
        image_status: imageFields.image_status,
        image_note: imageFields.image_note,
        display_image_kind: imageFields.display_image_kind,
      };
    }));

  return resolvedRows;
}

export default async function WallPage() {
  const { supabase, user } = await requireServerUser("/wall");

  const [{ data, error }, { data: profile }, wallSectionsModel] = await Promise.all([
    supabase
      .from("v_recently_added")
      .select("id,gv_id,name,set_code,set_name,number,created_at,image_url,image_best,image_alt_url")
      .eq("user_id", user.id)
      .limit(50)
      .order("created_at", { ascending: false }),
    supabase
      .from("public_profiles")
      .select("slug,public_profile_enabled,vault_sharing_enabled")
      .eq("user_id", user.id)
      .maybeSingle(),
    getOwnerWallSections(user.id),
  ]);

  const profileRow = (profile ?? null) as WallPublicProfileRow | null;
  const publicProfileSlug =
    profileRow?.public_profile_enabled && profileRow.vault_sharing_enabled && profileRow.slug ? profileRow.slug : null;

  const identityByGvId = await getWallIdentityByGvId(
    supabase,
    ((data ?? []) as WallFeedRow[])
      .map((row) => row.gv_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const feed = await normalizeFeed((data ?? null) as WallFeedRow[] | null, identityByGvId, supabase);

  return (
    <div className="space-y-8 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Wall</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Manage your Wall.</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Create and manage sections here, then organize exact copies from their copy pages.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Activity Window</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{feed.length}</p>
            <p className="mt-1 text-sm text-slate-600">{feed.length === 1 ? "recent item" : "recent items"}</p>
          </div>
        </div>
      </section>

      <OwnerWallSectionRail initialModel={wallSectionsModel} publicProfileSlug={publicProfileSlug} />

      {error ? (
        <ProductState
          compact
          tone="error"
          eyebrow="Wall activity unavailable"
          title="Your Wall settings are still available"
          description="Recent collection activity could not be refreshed. No cards or sections were changed."
        />
      ) : feed.length === 0 ? (
        <ProductState
          compact
          eyebrow="No recent activity"
          title="Your Wall is ready"
          description="Cards appear here after you add exact copies to your Vault."
        />
      ) : (
        <section className="space-y-4">
          {feed.map((item) => (
            (() => {
              const imagePresentation = resolveCardImagePresentation(item);
              const displayIdentity = resolveDisplayIdentity(item);

              return (
                <article
                  key={item.id}
                  className="grid grid-cols-[104px_minmax(0,1fr)] gap-4 border-b border-slate-200/80 py-5 first:pt-0 last:border-b-0 sm:grid-cols-[128px_minmax(0,1fr)] dark:border-white/[0.08]"
                  data-wall-activity-row
                >
                    <Link href={`/card/${item.gv_id}`} className="relative self-start">
                      <PublicCardImage
                        src={item.image_url}
                        alt={item.display_name}
                        imageClassName="aspect-[5/7] w-full rounded-[18px] border border-slate-200 bg-slate-50 object-contain"
                        fallbackClassName="flex aspect-[5/7] w-full items-center justify-center rounded-[18px] border border-slate-200 bg-slate-100 px-3 text-center text-xs text-slate-500"
                        fallbackLabel={item.display_name}
                      />
                      {imagePresentation.compactBadgeLabel ? (
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex p-2">
                          <CardImageTruthBadge
                            label={imagePresentation.compactBadgeLabel}
                            emphasis={imagePresentation.isCollisionRepresentative ? "strong" : "default"}
                          />
                        </div>
                      ) : null}
                    </Link>
                    <div className="min-w-0 space-y-3">
                      <p className="gv-eyebrow">Added to Vault · {formatTimeAgo(item.created_at)}</p>
                      <CollectorCardFacts
                        title={<Link href={`/card/${item.gv_id}`} className="transition hover:text-slate-700">{displayIdentity.base_name}</Link>}
                        setName={item.set_name || item.set_code}
                        number={item.number}
                        versionLabel={displayIdentity.suffix}
                      />
                      <CollectorEvidenceDisclosure label="Activity evidence">
                        <p>Card ID: {item.gv_id}</p>
                        <p>Activity: Added to Vault</p>
                        <p>Recorded {formatTimeAgo(item.created_at)}</p>
                      </CollectorEvidenceDisclosure>
                    </div>
                </article>
              );
            })()
          ))}
        </section>
      )}
    </div>
  );
}
