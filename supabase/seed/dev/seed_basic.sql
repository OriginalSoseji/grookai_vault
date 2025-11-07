-- FK-safe seed: requires an existing auth.users row. Inserts one listing and optional image, then refreshes MV.
do $$
declare
  v_owner uuid;
  v_listing uuid;
  has_listing_images boolean;
  has_listed_at boolean;
begin
  select id into v_owner from auth.users order by created_at desc limit 1;
  if v_owner is not null then
    select exists (
      select 1 from information_schema.tables
      where table_schema='public' and table_name='listing_images'
    ) into has_listing_images;

    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='listings' and column_name='listed_at'
    ) into has_listed_at;

    if has_listed_at then
      insert into public.listings (owner_id, title, visibility, status, listed_at)
      values (v_owner, 'Seed Listing (dev)', 'public', 'active', now())
      returning id into v_listing;
    else
      insert into public.listings (owner_id, title, visibility, status)
      values (v_owner, 'Seed Listing (dev)', 'public', 'active')
      returning id into v_listing;
    end if;

    if has_listing_images then
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='listing_images' and column_name='thumb_3x4_url'
      ) then
        insert into public.listing_images (listing_id, image_url, thumb_3x4_url)
        values (v_listing, 'https://picsum.photos/720/960', null);
      elsif exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='listing_images' and column_name='thumb_url'
      ) then
        insert into public.listing_images (listing_id, image_url, thumb_url)
        values (v_listing, 'https://picsum.photos/720/960', null);
      else
        insert into public.listing_images (listing_id, image_url)
        values (v_listing, 'https://picsum.photos/720/960');
      end if;
    end if;

    if exists (select 1 from pg_matviews where schemaname='public' and matviewname='wall_thumbs_3x4') then
      execute 'refresh materialized view public.wall_thumbs_3x4';
    end if;
  end if;
end$$;
