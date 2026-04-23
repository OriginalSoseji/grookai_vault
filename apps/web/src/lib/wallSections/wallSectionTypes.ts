export const WALL_SECTION_STORED_LIMIT = 20;

export const WALL_SECTION_PLAN_LIMITS = {
  free: 3,
  pro: 10,
  vendor: 20,
} as const;

export type WallSectionPlan = keyof typeof WALL_SECTION_PLAN_LIMITS;

export type OwnerWallSection = Readonly<{
  id: string;
  name: string;
  position: number;
  is_active: boolean;
  is_public: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}>;

export type OwnerWallSectionLimitState = Readonly<{
  plan: WallSectionPlan;
  activeLimit: number;
  storedLimit: number;
  source: "fallback_free";
}>;

export type WallSectionFieldErrors = {
  name?: string;
  form?: string;
};

export type WallSectionActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: WallSectionFieldErrors;
  sections?: OwnerWallSection[];
  limitState?: OwnerWallSectionLimitState;
};

export type WallSectionsSettingsModel = Readonly<{
  sections: OwnerWallSection[];
  limitState: OwnerWallSectionLimitState;
  loadError: string | null;
}>;

export type OwnerPublicWallRailModel = Readonly<{
  isOwner: boolean;
  sections: OwnerWallSection[];
  limitState: OwnerWallSectionLimitState | null;
  loadError: string | null;
}>;

export type OwnerWallSectionMembership = Readonly<{
  id: string;
  name: string;
  position: number;
  is_active: boolean;
  is_public: boolean;
  is_member: boolean;
}>;

export type OwnerWallSectionMembershipModel = Readonly<{
  instanceId: string;
  sections: OwnerWallSectionMembership[];
  loadError: string | null;
}>;

export type WallSectionMembershipActionResult = {
  ok: boolean;
  message: string;
  sections?: OwnerWallSectionMembership[];
};

export const PUBLIC_WALL_SECTION_ID = "wall";

export type PublicCollectorSectionView = Readonly<{
  id: string;
  kind: "wall" | "custom";
  name: string;
  position: number;
  item_count: number;
  cards: import("@/lib/sharedCards/publicWall.shared").PublicWallCard[];
}>;

// LOCK: Public section share language must remain short, calm, and collector-friendly.
export const PUBLIC_SECTION_SHARE_COPY = Object.freeze({
  section: "Section",
  backToWall: "Back to wall",
  viewWall: "View wall",
  copyLink: "Copy link",
  copied: "Copied",
  empty: "Nothing to show right now.",
});

export const WALL_SECTION_LIMIT_MESSAGE = "You've reached the section limit for your plan.";
export const WALL_SECTION_STORED_LIMIT_MESSAGE = "You can store up to 20 sections.";

// LOCK: Wall section product language must remain short, calm, and collector-friendly.
export const WALL_SECTION_HELPER_COPY = "Create custom sections like FS/FT, Pikachu, or Grails.";

export function normalizeWallSectionName(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function validateWallSectionName(value: unknown): string | null {
  const name = normalizeWallSectionName(value);

  if (!name) {
    return "Section name is required.";
  }

  if (name.length > 80) {
    return "Section names must be 80 characters or fewer.";
  }

  if (name.toLowerCase() === "wall") {
    return "Wall is managed automatically.";
  }

  return null;
}

export function normalizeWallSectionNameKey(value: string): string {
  return normalizeWallSectionName(value).toLowerCase();
}

export function getDefaultWallSectionLimitState(): OwnerWallSectionLimitState {
  return {
    plan: "free",
    activeLimit: WALL_SECTION_PLAN_LIMITS.free,
    storedLimit: WALL_SECTION_STORED_LIMIT,
    source: "fallback_free",
  };
}

export function countActiveWallSections(sections: Array<Pick<OwnerWallSection, "is_active">>): number {
  return sections.filter((section) => section.is_active).length;
}

export function hasDuplicateWallSectionName(
  sections: Array<Pick<OwnerWallSection, "id" | "name">>,
  name: string,
  exceptSectionId?: string,
): boolean {
  const key = normalizeWallSectionNameKey(name);
  return sections.some((section) => section.id !== exceptSectionId && normalizeWallSectionNameKey(section.name) === key);
}

export function canActivateWallSection(input: {
  activeCount: number;
  activeLimit: number;
  currentlyActive: boolean;
  nextActive: boolean;
}): boolean {
  if (!input.nextActive) {
    return true;
  }

  if (input.currentlyActive) {
    return true;
  }

  return input.activeCount < input.activeLimit;
}

export function normalizeWallSectionId(value: unknown): string {
  return String(value ?? "").trim();
}

export function getPublicWallHref(slug: string): string {
  return `/u/${encodeURIComponent(slug.trim().toLowerCase())}`;
}

export function getPublicSectionShareHref(slug: string, sectionId: string): string {
  return `${getPublicWallHref(slug)}/section/${encodeURIComponent(normalizeWallSectionId(sectionId))}`;
}

export function normalizeVaultItemInstanceId(value: unknown): string {
  return String(value ?? "").trim();
}

export function isWallSectionSystemId(value: string): boolean {
  return normalizeWallSectionId(value).toLowerCase() === "wall";
}
