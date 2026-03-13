export type PublicProfileSettingsValues = {
  slug: string;
  displayName: string;
  publicProfileEnabled: boolean;
  vaultSharingEnabled: boolean;
};

export type PublicProfileSettingsErrors = Partial<{
  slug: string;
  displayName: string;
  form: string;
}>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePublicProfileSlug(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

export function normalizePublicProfileDisplayName(value: string) {
  return value.trim();
}

export function validatePublicProfileSettings(values: PublicProfileSettingsValues): PublicProfileSettingsErrors {
  const errors: PublicProfileSettingsErrors = {};
  const normalizedSlug = normalizePublicProfileSlug(values.slug);
  const trimmedDisplayName = normalizePublicProfileDisplayName(values.displayName);

  if (!normalizedSlug) {
    errors.slug = "Enter a profile URL slug.";
  } else if (/[^a-z0-9-]/.test(normalizedSlug) || !SLUG_PATTERN.test(normalizedSlug)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only.";
  }

  if (!trimmedDisplayName) {
    errors.displayName = "Enter a display name.";
  }

  if (values.publicProfileEnabled && !normalizedSlug) {
    errors.slug = "A profile URL is required to enable your public profile.";
  }

  if (values.publicProfileEnabled && !trimmedDisplayName) {
    errors.displayName = "A display name is required to enable your public profile.";
  }

  if (values.vaultSharingEnabled && !values.publicProfileEnabled) {
    errors.form = "Enable your public profile before enabling vault sharing.";
  }

  return errors;
}

export function normalizePublicProfileSettings(values: PublicProfileSettingsValues): PublicProfileSettingsValues {
  const publicProfileEnabled = Boolean(values.publicProfileEnabled);

  return {
    slug: normalizePublicProfileSlug(values.slug),
    displayName: normalizePublicProfileDisplayName(values.displayName),
    publicProfileEnabled,
    vaultSharingEnabled: publicProfileEnabled ? Boolean(values.vaultSharingEnabled) : false,
  };
}
