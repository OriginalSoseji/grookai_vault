import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import { BinderConnectivityBoundary } from "@/components/binders/BinderOfflineBanner";
import { BinderServerActionButton } from "@/components/binders/BinderForms";
import PageSection from "@/components/layout/PageSection";
import { cloneBinderTemplateAction } from "@/lib/binders/actions";
import { getOptionalServerUser } from "@/lib/auth/requireServerUser";
import { getBinderFeatureFlags } from "@/lib/binders/featureFlags";
import { BinderRpcError, getBinderTemplateDetail } from "@/lib/binders/rpc";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const getTemplate = cache((publicId: string, cursor: string | null = null) =>
  getBinderTemplateDetail(createServerComponentClient(), publicId, cursor),
);

export async function generateMetadata({
  params,
}: {
  params: { templateId: string };
}): Promise<Metadata> {
  const flags = getBinderFeatureFlags();
  if (!flags.schemaRpc || !flags.templates || !PUBLIC_ID_PATTERN.test(params.templateId)) {
    return { title: "Binder Template | Grookai Vault", robots: { index: false, follow: false } };
  }
  try {
    const template = await getTemplate(params.templateId);
    return {
      title: `${template.title} Binder Template | Grookai Vault`,
      description: template.description ?? `Create a Binder from ${template.title}.`,
    };
  } catch {
    return { title: "Binder Template | Grookai Vault", robots: { index: false, follow: false } };
  }
}

export default async function BinderTemplatePage({
  params,
  searchParams,
}: {
  params: { templateId: string };
  searchParams: { result?: string; cursor?: string };
}) {
  const flags = getBinderFeatureFlags();
  if (!flags.schemaRpc || !flags.templates || !PUBLIC_ID_PATTERN.test(params.templateId)) {
    notFound();
  }
  const { user } = await getOptionalServerUser();
  try {
    const template = await getTemplate(
      params.templateId,
      searchParams.cursor ?? null,
    );
    const cloneAction = cloneBinderTemplateAction.bind(
      null,
      template.templatePublicId,
      template.version,
    );
    return (
      <div className="space-y-8 py-6">
        <BinderConnectivityBoundary loadedAt={new Date().toISOString()}>
        <PageSection surface="card" spacing="loose">
          <div className="h-64 overflow-hidden rounded-2xl bg-slate-50">
            <PublicCardImage
              src={template.coverImageUrl ?? undefined}
              alt={`${template.title} Template artwork`}
              imageClassName="h-full w-full object-contain"
              fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
              priority
            />
          </div>
          <p className="gv-eyebrow">Binder template · Version {template.version}</p>
          <h1 className="gv-display-title">{template.title}</h1>
          <p className="text-sm font-medium text-emerald-800">{template.targetLabel}</p>
          {template.description ? <p className="gv-body-copy whitespace-pre-wrap">{template.description}</p> : null}
          <p className="text-sm text-slate-600">
            {template.checklistSlotCount} checklist slots.
            {template.adoptionCount === null
              ? " Adoption totals appear after five unique collectors."
              : ` ${template.adoptionCount} collectors are building this.`}
            {" "}Member identities are never included in adoption counts.
          </p>
        </PageSection>
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <PageSection spacing="loose">
            <h2 className="gv-section-title">Template checklist</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {template.checklist.map((slot) => (
                <li key={slot.slotPublicId || slot.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 h-40 overflow-hidden rounded-xl bg-slate-50">
                    <PublicCardImage
                      src={slot.imageUrl ?? undefined}
                      alt={`${slot.title} card artwork`}
                      imageClassName="h-full w-full object-contain"
                      fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
                    />
                  </div>
                  <p className="font-semibold text-slate-950">{slot.title}</p>
                  {slot.subtitle ? <p className="mt-1 text-sm text-slate-600">{slot.subtitle}</p> : null}
                </li>
              ))}
            </ul>
            {template.checklistNextCursor ? (
              <Link
                href={`/binder-templates/${encodeURIComponent(template.templatePublicId)}?cursor=${encodeURIComponent(template.checklistNextCursor)}`}
                className="gv-secondary-button"
              >
                More Template cards
              </Link>
            ) : null}
          </PageSection>
          <PageSection surface="card">
            <h2 className="text-lg font-semibold text-slate-950">Use this template</h2>
            <p className="text-sm text-slate-600">
              Cloning creates your own Binder from this immutable version. It does not join or modify another Binder.
            </p>
            {searchParams.result ? (
              <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">
                The Binder could not be created. Nothing was changed.
              </p>
            ) : null}
            {user ? (
              <form action={cloneAction} className="space-y-4">
                <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                <label className="block text-sm font-medium text-slate-700">
                  New Binder name
                  <input
                    name="title"
                    required
                    maxLength={80}
                    defaultValue={template.title}
                    className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </label>
                <BinderServerActionButton>
                  Create Binder from template
                </BinderServerActionButton>
              </form>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/binder-templates/${template.templatePublicId}`)}`}
                className="gv-primary-button"
              >
                Sign in to use template
              </Link>
            )}
          </PageSection>
        </div>
        </BinderConnectivityBoundary>
      </div>
    );
  } catch (error) {
    if (!(error instanceof BinderRpcError)) {
      throw error;
    }
    notFound();
  }
}
