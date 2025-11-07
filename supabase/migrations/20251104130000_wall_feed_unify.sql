-- Grookai Vault - Wall feed unification and shims
-- Goals:
--  - Ensure canonical view: public.wall_feed_view
--  - Include card_id (card_print_id) for app navigation
--  - Provide compatibility shims: public.wall_feed_v and public.v_wall_feed

DO $$
BEGIN
  -- Only proceed if base tables exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='listings'
  ) THEN
    -- Drop dependent view if present so we can recreate the matview cleanly
    IF EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema='public' AND table_name='wall_feed_view'
    ) THEN
      EXECUTE 'drop view if exists public.wall_feed_view cascade';
    END IF;

    -- Recreate materialized view with card_id included (drop if exists first)
    IF EXISTS (
      SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='wall_thumbs_3x4'
    ) THEN
      EXECUTE 'drop materialized view if exists public.wall_thumbs_3x4';
    END IF;

    -- MATERIALIZED VIEW: wall_thumbs_3x4
    EXECUTE $q$
      create materialized view public.wall_thumbs_3x4 as
      with primary_img as (
        select
          li.id as listing_id,
          coalesce(li.primary_image_url, max(case when li2.sort_order = 0 then li2.thumb_3x4_url end)) as thumb_url
        from public.listings li
        left join public.listing_images li2 on li2.listing_id = li.id
        group by li.id, li.primary_image_url
      )
      select
        l.id,
        l.owner_id,
        l.card_print_id as card_id,
        l.title,
        l.price_cents,
        l.currency,
        l.condition,
        l.status,
        l.created_at,
        pi.thumb_url
      from public.listings l
      left join primary_img pi on pi.listing_id = l.id
      where l.visibility = 'public' and l.status = 'active'
    $q$;

    -- Helpful index on MV
    EXECUTE 'create index if not exists idx_wall_thumbs_created_at on public.wall_thumbs_3x4(created_at)';

    -- Canonical view
    EXECUTE $q$
      create view public.wall_feed_view as
      select
        w.id as listing_id,
        w.owner_id,
        w.card_id,
        w.title,
        w.price_cents,
        w.currency,
        w.condition,
        w.status,
        w.created_at,
        w.thumb_url
      from public.wall_thumbs_3x4 w
      order by w.created_at desc
    $q$;
  END IF;
END $$;

-- Compatibility shims
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema='public' AND table_name='wall_feed_view'
  ) THEN
    EXECUTE $q$
      create or replace view public.wall_feed_v as
        select * from public.wall_feed_view
    $q$;
    EXECUTE $q$
      create or replace view public.v_wall_feed as
        select
          listing_id as id,
          card_id,
          title,
          price_cents as price,
          thumb_url,
          thumb_url as image_url,
          created_at
        from public.wall_feed_view
        order by created_at desc
    $q$;
  END IF;
END $$;

-- Grants
DO $$
BEGIN
  BEGIN EXECUTE 'grant select on table public.wall_feed_view to anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'grant select on table public.wall_feed_view to authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'grant select on table public.wall_feed_v to anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'grant select on table public.wall_feed_v to authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'grant select on table public.v_wall_feed to anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'grant select on table public.v_wall_feed to authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

