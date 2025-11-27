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


