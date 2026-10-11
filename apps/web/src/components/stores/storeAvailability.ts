import type { OwnerModel } from "./storeManagerClient";

// Display the effective audience, not just a retained publication preference.
// The backend still authorizes each public request independently.
export function storeAvailability(owner: OwnerModel) {
  const profileReady = Boolean(owner.profile?.public_profile_enabled
    && owner.profile.vault_sharing_enabled && owner.profile.slug && owner.profile.display_name);
  const appReady = Boolean(owner.store && profileReady && owner.capabilities.store_app && owner.rollout.app_enabled);
  return {
    app: appReady && Boolean(owner.store?.app_published),
    web: appReady && Boolean(owner.store?.web_published && owner.capabilities.store_web && owner.rollout.web_enabled),
  };
}
