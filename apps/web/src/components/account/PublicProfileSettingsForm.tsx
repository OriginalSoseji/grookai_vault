"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { savePublicProfileSettings } from "@/app/account/actions";
import {
  buildProfileMediaStoragePath,
  PROFILE_MEDIA_ACCEPTED_MIME_TYPES,
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_MAX_BYTES,
  resolveProfileMediaUrl,
  type ProfileMediaKind,
} from "@/lib/profileMedia";
import {
  normalizePublicProfileDisplayName,
  normalizePublicProfileSettings,
  normalizePublicProfileSlug,
  type PublicProfileSettingsErrors,
  type PublicProfileSettingsValues,
  validatePublicProfileSettings,
} from "@/lib/publicProfileSettings";
import { supabase } from "@/lib/supabaseClient";

type PublicProfileSettingsFormProps = {
  initialValues: PublicProfileSettingsValues;
  hasExistingProfile: boolean;
  userId: string;
  loadError?: string | null;
};

function MediaFieldCard({
  kind,
  label,
  description,
  previewUrl,
  displayName,
  isBusy,
  hasValue,
  error,
  onPick,
  onRemove,
}: {
  kind: ProfileMediaKind;
  label: string;
  description: string;
  previewUrl: string | null;
  displayName: string;
  isBusy: boolean;
  hasValue: boolean;
  error?: string;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-950">{label}</p>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {kind === "banner" ? (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200 bg-gradient-to-br from-slate-200 via-slate-100 to-white">
          <div className="relative aspect-[16/6] w-full">
            {previewUrl ? (
              <Image src={previewUrl} alt={`${displayName} banner`} fill unoptimized className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-500">
                No banner image yet
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 text-2xl font-semibold tracking-[0.08em] text-white">
            {previewUrl ? (
              <Image src={previewUrl} alt={`${displayName} profile photo`} fill unoptimized className="object-cover" />
            ) : (
              (normalizePublicProfileDisplayName(displayName).trim().slice(0, 2).toUpperCase() || "GV")
            )}
          </div>
          <p className="text-sm leading-6 text-slate-600">
            JPG, PNG, or WebP. Max {Math.floor(PROFILE_MEDIA_MAX_BYTES / (1024 * 1024))} MB.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isBusy}
          onClick={onPick}
          className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Uploading..." : hasValue ? "Replace" : "Upload"}
        </button>
        {hasValue ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={onRemove}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

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
  userId,
  loadError,
}: PublicProfileSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<PublicProfileSettingsErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(loadError ? "error" : null);
  const [busyMediaKind, setBusyMediaKind] = useState<ProfileMediaKind | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const liveFieldErrors = useMemo(() => validatePublicProfileSettings(values), [values]);
  const slugPreview = values.slug ? normalizePublicProfileSlug(values.slug) : "your-slug";
  const avatarPreviewUrl = useMemo(() => resolveProfileMediaUrl(values.avatarPath), [values.avatarPath]);
  const bannerPreviewUrl = useMemo(() => resolveProfileMediaUrl(values.bannerPath), [values.bannerPath]);

  async function persistProfileValues(nextValues: PublicProfileSettingsValues, successMessage: string) {
    const result = await savePublicProfileSettings(nextValues);
    setValues(result.values);
    setFieldErrors(result.fieldErrors);
    setStatusTone(result.ok ? "success" : "error");
    setStatusMessage(result.message ?? (result.ok ? successMessage : null));

    if (result.ok) {
      router.refresh();
    }

    return result;
  }

  async function handleMediaUpload(kind: ProfileMediaKind, file: File | null) {
    if (!file || busyMediaKind || isPending) {
      return;
    }

    if (!PROFILE_MEDIA_ACCEPTED_MIME_TYPES.includes(file.type as (typeof PROFILE_MEDIA_ACCEPTED_MIME_TYPES)[number])) {
      setStatusTone("error");
      setStatusMessage("Upload a JPG, PNG, or WebP image.");
      setFieldErrors((current) => ({
        ...current,
        [`${kind}Path`]: "Unsupported file type.",
      }));
      return;
    }

    if (file.size > PROFILE_MEDIA_MAX_BYTES) {
      setStatusTone("error");
      setStatusMessage(`Images must be ${Math.floor(PROFILE_MEDIA_MAX_BYTES / (1024 * 1024))} MB or smaller.`);
      setFieldErrors((current) => ({
        ...current,
        [`${kind}Path`]: "File is too large.",
      }));
      return;
    }

    const normalizedValues = normalizePublicProfileSettings(values);
    const nextErrors = validatePublicProfileSettings(normalizedValues);
    if (nextErrors.slug || nextErrors.displayName || nextErrors.form) {
      setValues(normalizedValues);
      setFieldErrors(nextErrors);
      setStatusTone("error");
      setStatusMessage("Add a valid profile URL and display name before uploading profile media.");
      return;
    }

    setBusyMediaKind(kind);
    setFieldErrors((current) => ({
      ...current,
      avatarPath: kind === "avatar" ? undefined : current.avatarPath,
      bannerPath: kind === "banner" ? undefined : current.bannerPath,
      form: undefined,
    }));
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const storagePath = buildProfileMediaStoragePath(userId, kind);
      const { error: uploadError } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(storagePath, file, {
        upsert: true,
        contentType: file.type,
      });

      if (uploadError) {
        setStatusTone("error");
        setStatusMessage(uploadError.message || "Profile media upload failed.");
        setFieldErrors((current) => ({
          ...current,
          [`${kind}Path`]: uploadError.message || "Upload failed.",
        }));
        return;
      }

      const nextValues = {
        ...normalizedValues,
        avatarPath: kind === "avatar" ? storagePath : normalizedValues.avatarPath,
        bannerPath: kind === "banner" ? storagePath : normalizedValues.bannerPath,
      };

      await persistProfileValues(nextValues, kind === "avatar" ? "Profile photo updated." : "Banner image updated.");
    } finally {
      setBusyMediaKind(null);
      const inputRef = kind === "avatar" ? avatarInputRef.current : bannerInputRef.current;
      if (inputRef) {
        inputRef.value = "";
      }
    }
  }

  async function handleMediaRemove(kind: ProfileMediaKind) {
    if (busyMediaKind || isPending) {
      return;
    }

    const currentPath = kind === "avatar" ? values.avatarPath : values.bannerPath;
    if (!currentPath) {
      return;
    }

    setBusyMediaKind(kind);
    setFieldErrors((current) => ({
      ...current,
      avatarPath: kind === "avatar" ? undefined : current.avatarPath,
      bannerPath: kind === "banner" ? undefined : current.bannerPath,
      form: undefined,
    }));
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const { error: removeError } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([currentPath]);
      if (removeError) {
        console.warn(`[profile-media] remove failed for ${kind}`, removeError);
      }

      const normalizedValues = normalizePublicProfileSettings(values);
      const nextValues = {
        ...normalizedValues,
        avatarPath: kind === "avatar" ? null : normalizedValues.avatarPath,
        bannerPath: kind === "banner" ? null : normalizedValues.bannerPath,
      };

      await persistProfileValues(nextValues, kind === "avatar" ? "Profile photo removed." : "Banner image removed.");
    } finally {
      setBusyMediaKind(null);
    }
  }

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
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Profile media</h3>
            <p className="text-sm leading-6 text-slate-600">
              Add a profile photo and banner image to personalize your public collector identity.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept={PROFILE_MEDIA_ACCEPTED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                void handleMediaUpload("avatar", event.target.files?.[0] ?? null);
              }}
            />
            <input
              ref={bannerInputRef}
              type="file"
              accept={PROFILE_MEDIA_ACCEPTED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                void handleMediaUpload("banner", event.target.files?.[0] ?? null);
              }}
            />

            <MediaFieldCard
              kind="avatar"
              label="Profile Photo"
              description="Shown as your collector avatar on public profile surfaces."
              previewUrl={avatarPreviewUrl}
              displayName={values.displayName || "Grookai Vault"}
              isBusy={busyMediaKind === "avatar"}
              hasValue={Boolean(values.avatarPath)}
              error={fieldErrors.avatarPath}
              onPick={() => avatarInputRef.current?.click()}
              onRemove={() => {
                void handleMediaRemove("avatar");
              }}
            />
            <MediaFieldCard
              kind="banner"
              label="Banner Image"
              description="Shown across the top of your public profile hero."
              previewUrl={bannerPreviewUrl}
              displayName={values.displayName || "Grookai Vault"}
              isBusy={busyMediaKind === "banner"}
              hasValue={Boolean(values.bannerPath)}
              error={fieldErrors.bannerPath}
              onPick={() => bannerInputRef.current?.click()}
              onRemove={() => {
                void handleMediaRemove("banner");
              }}
            />
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
