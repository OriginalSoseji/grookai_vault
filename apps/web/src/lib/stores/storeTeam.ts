export const TEAM_PERMISSIONS = ["inventory", "pricing", "listings", "branding"] as const;
export type TeamPermission = typeof TEAM_PERMISSIONS[number];
export const TEAM_PERMISSION_LABELS: Record<TeamPermission, string> = {
  inventory: "Edit card condition",
  pricing: "Change asking prices",
  listings: "List and unlist store cards",
  branding: "Edit store name, description and images",
};
export type StoreTeam = {
  store_id: string; enabled: boolean;
  members: { user_id: string; email: string; permissions: TeamPermission[]; revoked_at: string | null }[];
  invites: { id: string; email: string; permissions: TeamPermission[]; expires_at: string; revoked_at: string | null; accepted_at: string | null }[];
};
export type ManagedStore = { id: string; slug: string; display_name: string; permissions: TeamPermission[] };
export type ManagedCopy = {
  id: string; gv_vi_id: string; name: string; gv_id: string; printing_gv_id: string | null;
  condition_label: string; finish_label: string | null; is_graded: boolean;
  asking_price_amount: number | null; asking_price_currency: string | null;
  selected: boolean; updated_at: string; ineligible_reason: string | null; display_image_url: string | null;
};
export type TeamWorkspace = {
  store: { id: string; slug: string; display_name: string; description: string; updated_at: string; has_logo: boolean; has_banner: boolean };
  permissions: TeamPermission[]; items: ManagedCopy[]; total: number; offset: number;
};
