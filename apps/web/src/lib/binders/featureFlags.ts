/**
 * Collaborative Binders are deliberately dark-launched. A gate is enabled only
 * when its value is the literal string "true"; missing or malformed values are
 * always fail-closed.
 */
function isExplicitlyEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export type BinderFeatureFlags = {
  schemaRpc: boolean;
  personal: boolean;
  shared: boolean;
  viewLinks: boolean;
  publicBinders: boolean;
  community: boolean;
  templates: boolean;
  notifications: boolean;
  pulseSharing: boolean;
  setBinders: boolean;
  customBinders: boolean;
};

export function getBinderFeatureFlags(): BinderFeatureFlags {
  const schemaRpc = isExplicitlyEnabled(
    process.env.GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED,
  );
  const personal =
    schemaRpc &&
    isExplicitlyEnabled(process.env.GROOKAI_BINDERS_PERSONAL_V1_ENABLED);
  const shared =
    personal &&
    isExplicitlyEnabled(process.env.GROOKAI_BINDERS_SHARED_V1_ENABLED);
  const viewLinks =
    shared &&
    isExplicitlyEnabled(process.env.GROOKAI_BINDERS_VIEW_LINKS_V1_ENABLED);
  const publicBinders =
    personal &&
    isExplicitlyEnabled(process.env.GROOKAI_BINDERS_PUBLIC_V1_ENABLED);

  return {
    schemaRpc,
    personal,
    shared,
    viewLinks,
    publicBinders,
    community:
      publicBinders &&
      shared &&
      isExplicitlyEnabled(process.env.GROOKAI_BINDERS_COMMUNITY_V1_ENABLED),
    templates:
      personal &&
      isExplicitlyEnabled(process.env.GROOKAI_BINDERS_TEMPLATES_V1_ENABLED),
    notifications:
      shared &&
      isExplicitlyEnabled(process.env.GROOKAI_BINDERS_NOTIFICATIONS_V1_ENABLED),
    pulseSharing:
      publicBinders &&
      isExplicitlyEnabled(process.env.GROOKAI_BINDERS_PULSE_SHARING_V1_ENABLED),
    setBinders:
      personal &&
      isExplicitlyEnabled(process.env.GROOKAI_BINDERS_SET_V1_ENABLED),
    customBinders:
      personal &&
      isExplicitlyEnabled(process.env.GROOKAI_BINDERS_CUSTOM_V1_ENABLED),
  };
}

export function isBinderLibraryEnabled() {
  const flags = getBinderFeatureFlags();
  return flags.schemaRpc && flags.personal;
}
