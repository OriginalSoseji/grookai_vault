alter table "public"."listing_images" drop constraint "listing_images_listing_id_fkey";

alter table "public"."listings" drop constraint "listings_card_print_id_fkey";

alter table "public"."listings" drop constraint "listings_owner_id_users_fkey";

alter table "public"."listings" drop constraint "listings_vault_item_id_fkey";

alter table "public"."listing_images" add constraint "listing_images_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES public.listings(id) NOT VALID not valid;

alter table "public"."listing_images" validate constraint "listing_images_listing_id_fkey";

alter table "public"."listings" add constraint "listings_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) NOT VALID not valid;

alter table "public"."listings" validate constraint "listings_card_print_id_fkey";

alter table "public"."listings" add constraint "listings_owner_id_users_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) NOT VALID not valid;

alter table "public"."listings" validate constraint "listings_owner_id_users_fkey";

alter table "public"."listings" add constraint "listings_vault_item_id_fkey" FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) NOT VALID not valid;

alter table "public"."listings" validate constraint "listings_vault_item_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_cards(q text, "limit" integer DEFAULT 50, "offset" integer DEFAULT 0)
 RETURNS SETOF public.v_card_search
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT * FROM public.v_card_search
      WHERE (q IS NULL OR q = '' OR name ILIKE '%' || q || '%')
      ORDER BY name
      LIMIT  GREATEST(1, COALESCE("limit", 50))
      OFFSET GREATEST(0, COALESCE("offset", 0)); $function$
;


