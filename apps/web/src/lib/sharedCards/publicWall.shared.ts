import type { WallCategory } from "@/lib/sharedCards/wallCategories";

export type PublicWallCard = {
  gv_id: string;
  name: string;
  set_code?: string;
  set_name?: string;
  number: string;
  rarity?: string;
  image_url?: string;
  back_image_url?: string;
  public_note?: string;
  wall_category?: WallCategory;
  owned_count?: number;
  raw_count?: number;
  slab_count?: number;
  is_slab?: boolean;
  grader?: string;
  grade?: string;
  cert_number?: string;
};
