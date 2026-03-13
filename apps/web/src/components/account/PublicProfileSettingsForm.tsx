"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { savePublicProfileSettings } from "@/app/account/actions";
import {
  normalizePublicProfileDisplayName,
  normalizePublicProfileSettings,
  normalizePublicProfileSlug,
  type PublicProfileSettingsErrors,
  type PublicProfileSettingsValues,
  validatePublicProfileSettings,
} from "@/lib/publicProfileSettings";

type PublicProfileSettingsFormProps = {
  initialValues: PublicProfileSettingsValues;
  hasExistingProfile: boolean;
  loadError?: string | null;
};

function ToggleField({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-4 py-4 ${
        disabled ? "opacity-70" : ""
      }`}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-slate-950">{label}</p>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
      />
    </label>
  );
}

export function PublicProfileSettingsForm({
  initialValues,
  hasExistingProfile,
  loadError,
}: PublicProfileSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<PublicProfileSettingsErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(loadError ? "error" : null);

  const liveFieldErrors = useMemo(() => validatePublicProfileSettings(values), [values]);
  const slugPreview = values.slug ? normalizePublicProfileSlug(values.slug) : "your-slug";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedValues = normalizePublicProfileSettings(values);
    const nextErrors = validatePublicProfileSettings(normalizedValues);

    if (Object.keys(nextErrors).length > 0) {
      setValues(normalizedValues);
      setFieldErrors(nextErrors);
      setStatusTone("error");
      setStatusMessage("Fix the highlighted fields before saving.");
      return;
    }

    startTransition(async () => {
      const result = await savePublicProfileSettings(normalizedValues);
      setValues(result.values);
      setFieldErrors(result.fieldErrors);
      setStatusTone(result.ok ? "success" : "error");
      setStatusMessage(result.message ?? null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Public Profile</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Control your public collector identity</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Control how your collector profile and shared collection appear publicly.
          </p>
        </div>
        <p className="text-sm text-slate-600">
          {hasExistingProfile
            ? "Your existing public profile settings are loaded below."
            : "No public profile record exists yet. Your first save will create one."}
        </p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        {loadError ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Public profile settings could not be loaded cleanly: {loadError}
          </div>
        ) : null}

        {statusMessage ? (
          <div
            className={`rounded-[1.5rem] px-4 py-3 text-sm ${
              statusTone === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-950">Profile URL</span>
              <input
                type="text"
                value={values.slug}
                onChange={(event) => {
                  const nextSlug = normalizePublicProfileSlug(event.target.value);
                  setValues((current) => ({ ...current, slug: nextSlug }));
                  setFieldErrors((current) => ({ ...current, slug: undefined, form: undefined }));
                  setStatusMessage(null);
                  setStatusTone(null);
                }}
                placeholder="your-name"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <p className="text-xs tracking-[0.08em] text-slate-500">Preview: /u/{slugPreview}</p>
              {fieldErrors.slug ?? liveFieldErrors.slug ? (
                <p className="text-sm text-rose-700">{fieldErrors.slug ?? liveFieldErrors.slug}</p>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-950">Display name</span>
              <input
                type="text"
                value={values.displayName}
                onChange={(event) => {
                  setValues((current) => ({ ...current, displayName: event.target.value }));
                  setFieldErrors((current) => ({ ...current, displayName: undefined, form: undefined }));
                  setStatusMessage(null);
                  setStatusTone(null);
                }}
                placeholder="Your collector name"
                className="w-full rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              {fieldErrors.displayName ?? liveFieldErrors.displayName ? (
                <p className="text-sm text-rose-700">{fieldErrors.displayName ?? liveFieldErrors.displayName}</p>
              ) : null}
            </label>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <dt>Profile record</dt>
                <dd className="font-medium text-slate-900">{hasExistingProfile ? "Created" : "Not yet created"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Public profile</dt>
                <dd className="font-medium text-slate-900">{values.publicProfileEnabled ? "Enabled" : "Disabled"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Vault sharing</dt>
                <dd className="font-medium text-slate-900">{values.vaultSharingEnabled ? "Enabled" : "Disabled"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleField
            label="Enable public profile"
            description="Make your collector identity eligible for future public profile pages."
            checked={values.publicProfileEnabled}
            onChange={(checked) => {
              setValues((current) => ({
                ...current,
                publicProfileEnabled: checked,
                vaultSharingEnabled: checked ? current.vaultSharingEnabled : false,
              }));
              setFieldErrors((current) => ({ ...current, form: undefined }));
              setStatusMessage(null);
              setStatusTone(null);
            }}
          />

          <ToggleField
            label="Enable vault sharing"
            description="Allow future public collection pages to use your shared collector profile."
            checked={values.vaultSharingEnabled}
            disabled={!values.publicProfileEnabled}
            onChange={(checked) => {
              setValues((current) => ({
                ...current,
                vaultSharingEnabled: current.publicProfileEnabled ? checked : false,
              }));
              setFieldErrors((current) => ({ ...current, form: undefined }));
              setStatusMessage(null);
              setStatusTone(null);
            }}
          />

          {!values.publicProfileEnabled ? (
            <p className="text-sm text-slate-500">Enable your public profile first to turn on vault sharing.</p>
          ) : null}

          {fieldErrors.form ?? liveFieldErrors.form ? (
            <p className="text-sm text-rose-700">{fieldErrors.form ?? liveFieldErrors.form}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Saving..." : "Save settings"}
          </button>
          <p className="text-sm text-slate-500">
            Stored values are saved in lowercase slug format and trimmed display-name format.
          </p>
        </div>
      </form>
    </section>
  );
}
