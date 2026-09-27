export const TEAM_PERMISSIONS = ["inventory", "pricing", "listings", "branding", "intake", "sections", "custom"] as const;
export const TEAM_WORKFLOW_PERMISSIONS = ["intake", "sections", "custom"] as const;
export type TeamPermission = typeof TEAM_PERMISSIONS[number];
export const TEAM_PERMISSION_LABELS: Record<TeamPermission, string> = {
  inventory: "Edit card condition",
  pricing: "Change asking prices",
  listings: "List and unlist store cards and products",
  branding: "Edit store name, description and images",
  intake: "Add catalog cards to store inventory",
  sections: "Create, rename and assign store sections",
  custom: "Create and edit custom products and photos",
};
export type StoreTeam = {
  store_id: string; enabled: boolean; workflows_enabled?: boolean;
  members: { user_id: string; email: string; permissions: TeamPermission[]; revoked_at: string | null }[];
  invites: { id: string; email: string; permissions: TeamPermission[]; expires_at: string; revoked_at: string | null; accepted_at: string | null }[];
};
export type ManagedStore = { id: string; slug: string; display_name: string; permissions: TeamPermission[] };
export type ManagedCopy = {
  id: string; gv_vi_id: string; name: string; gv_id: string; printing_gv_id: string | null;
  condition_label: string; finish_label: string | null; is_graded: boolean;
  asking_price_amount: number | null; asking_price_currency: string | null;
  selected: boolean; updated_at: string; ineligible_reason: string | null; display_image_url: string | null;
  section_ids?: string[];
};
export type TeamWorkspace = {
  store: { id: string; slug: string; display_name: string; description: string; updated_at: string; has_logo: boolean; has_banner: boolean };
  permissions: TeamPermission[]; items: ManagedCopy[]; total: number; offset: number;
};
export type TeamWorkflows = { enabled: boolean; currency?: string; sections: { id: string; name: string; updated_at: string; position: number }[] };
export type TeamCatalog = { more: boolean; cards: { id: string; gv_id: string; name: string; number: string; set_code: string; image: string | null; printings: { id: string; printing_gv_id: string; finish_label: string }[] }[] };
