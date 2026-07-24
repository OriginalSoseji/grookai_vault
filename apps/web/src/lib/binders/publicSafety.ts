import type { BinderPublicContributionAction } from "./types";

type JsonRecord = Record<string, unknown>;

const OPAQUE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANON_CARD_IMAGE_PATH_PATTERN =
  /^\/api\/canon\/cards\/(GV-[A-Z0-9-]{1,93})\/image$/;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function opaqueUuid(value: unknown) {
  return typeof value === "string" && OPAQUE_UUID_PATTERN.test(value)
    ? value
    : null;
}

/**
 * External Binder projections may render only Grookai's canonical image
 * proxy. This deliberately rejects provider URLs, Supabase object URLs,
 * localhost, alternate ports, credentials, subdomains, queries, fragments,
 * and encoded path tricks even if a future RPC accidentally emits them.
 */
export function safeCanonicalBinderImageUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim();
  if (!candidate || candidate.includes("\\")) {
    return null;
  }

  const isRelative = candidate.startsWith("/") && !candidate.startsWith("//");
  let url: URL;
  try {
    url = new URL(candidate, "https://grookaivault.com");
  } catch {
    return null;
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.protocol !== "https:" ||
    url.hostname !== "grookaivault.com" ||
    url.port
  ) {
    return null;
  }

  const match = url.pathname.match(CANON_CARD_IMAGE_PATH_PATTERN);
  if (!match) {
    return null;
  }

  const canonicalPath = `/api/canon/cards/${match[1]}/image`;
  if (candidate !== canonicalPath && candidate !== `https://grookaivault.com${canonicalPath}`) {
    return null;
  }
  return isRelative ? canonicalPath : `https://grookaivault.com${canonicalPath}`;
}

/**
 * This is the web's second public allow-list for Binder-domain safety refs.
 * Missing, stale, malformed, or permissionless rows produce no controls.
 */
export function parsePublicContributionActions(
  value: unknown,
): BinderPublicContributionAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 20)
    .map((value) => {
      const action = record(value);
      const permissions = record(action.permissions);
      const canReport = permissions.can_report === true;
      const canBlock = permissions.can_block === true;
      const identityVisible = action.identity_visible === true;
      return {
        contributionActionRef: canReport
          ? opaqueUuid(action.contribution_action_ref)
          : null,
        memberActionRef:
          canReport || canBlock ? opaqueUuid(action.member_action_ref) : null,
        alias:
          identityVisible &&
          typeof action.alias === "string" &&
          action.alias.trim()
            ? action.alias.trim().slice(0, 40)
            : null,
        identityVisible,
        canReport,
        canBlock,
      };
    })
    .filter(
      (action) =>
        (action.canReport &&
          Boolean(action.contributionActionRef || action.memberActionRef)) ||
        (action.canBlock && Boolean(action.memberActionRef)),
    );
}
