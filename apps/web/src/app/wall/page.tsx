import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

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
};

type WallIdentityRow = {
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
      "gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model)",
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
): Promise<WallCard[]> {
  const resolvedRows = await Promise.all((rows ?? [])
    .filter((row): row is WallFeedRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map(async (row) => {
      const identityRow = identityByGvId.get(row.gv_id);
      const imageFields = await resolveCardImageFieldsV1(identityRow);
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
          imageFields.display_image_url ??
          getBestPublicCardImageUrl(row.image_url, row.image_best ?? row.image_alt_url),
      };
    }));

  return resolvedRows;
}

export default async function WallPage() {
  const { supabase, user } = await requireServerUser("/wall");

  const { data, error } = await supabase
    .from("v_recently_added")
    .select("id,gv_id,name,set_code,set_name,number,created_at,image_url,image_best,image_alt_url")
    .eq("user_id", user.id)
    .limit(50)
    .order("created_at", { ascending: false });

  const identityByGvId = await getWallIdentityByGvId(
    supabase,
    ((data ?? []) as WallFeedRow[])
      .map((row) => row.gv_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const feed = await normalizeFeed((data ?? null) as WallFeedRow[] | null, identityByGvId);

  return (
    <div className="space-y-8 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Your Wall</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your recent vault activity.</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              See the latest cards you have added and jump back into your collection.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Feed Window</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{feed.length}</p>
            <p className="mt-1 text-sm text-slate-600">{feed.length === 1 ? "recent item" : "recent items"}</p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          Wall feed could not be loaded right now: {error.message}
        </section>
      ) : feed.length === 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-sm">
          No recent vault activity yet.
        </section>
      ) : (
        <section className="space-y-4">
          {feed.map((item) => (
            <Link
              key={item.id}
              href={`/card/${item.gv_id}`}
              className="block rounded-[2rem] border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <PublicCardImage
                  src={item.image_url}
                  alt={item.display_name}
                  imageClassName="h-40 w-28 rounded-[1.25rem] border border-slate-200 bg-slate-50 object-contain p-2"
                  fallbackClassName="flex h-40 w-28 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-slate-100 px-3 text-center text-xs text-slate-500"
                  fallbackLabel={item.display_name}
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-medium tracking-tight text-slate-950">{item.display_name}</h2>
                    <p className="text-sm text-slate-600">
                      {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Added to vault
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                    <p>{formatTimeAgo(item.created_at)}</p>
                    <p>{item.gv_id}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
