alter table public.vault_item_instances
  add column if not exists image_display_mode text not null default 'canonical';

alter table public.vault_item_instances
  drop constraint if exists vault_item_instances_image_display_mode_check;

alter table public.vault_item_instances
  add constraint vault_item_instances_image_display_mode_check
  check (image_display_mode in ('canonical', 'uploaded'));
