Scope

- Focus on read paths used by Flutter and edge functions; confirm row-level security (RLS), view exposure, and RPC grants.

Findings (from migrations scan; local DB down)

- Views referenced by app:
  - `public.wall_feed_view` (Flutter + edge code). Status: not reachable on hosted; local unverified.
  - `public.v_card_search` (detail lookups). Present in code, unverified in DB.
- Materialized views:
  - `public.wall_thumbs_3x4`. Status: unverified; refresh function `public.refresh_wall_thumbs_3x4()` referenced in docs.
- RPCs:
  - `public.search_cards(text,int,int)` expected. Status: unverified; edge function of same name exists (different path).

Required Grants (apply after objects exist)

```sql
-- Views / MVs
GRANT SELECT ON public.wall_feed_view TO anon, authenticated;
GRANT SELECT ON public.wall_thumbs_3x4 TO anon, authenticated;
GRANT SELECT ON public.v_card_search TO anon, authenticated;

-- RPCs
GRANT EXECUTE ON FUNCTION public.search_cards(text,int,int) TO anon, authenticated;
```

RLS Audit Targets and Policy Diffs

- Table: `public.listings`
  - Expectation: public read of active/visible listings; writes only to owners.
  - Policies to add:
```sql
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY listings_read_active ON public.listings
  FOR SELECT USING (status = 'active' AND visibility = 'public');
CREATE POLICY listings_owner_write ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id)
  TO authenticated;
CREATE POLICY listings_owner_update ON public.listings
  FOR UPDATE USING (auth.uid() = seller_id)
  TO authenticated;
```

- Table: `public.vault_items`
  - Expectation: reads restricted to owner; writes owner-only.
```sql
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY vault_items_owner_read ON public.vault_items
  FOR SELECT USING (auth.uid() = owner_id)
  TO authenticated;
CREATE POLICY vault_items_owner_write ON public.vault_items
  FOR INSERT WITH CHECK (auth.uid() = owner_id)
  TO authenticated;
CREATE POLICY vault_items_owner_update ON public.vault_items
  FOR UPDATE USING (auth.uid() = owner_id)
  TO authenticated;
```

Operational Checks

- After applying, verify via PostgREST:
  - `/rest/v1/listings?select=id,title,visibility,status&limit=1` (anon).
  - `/rest/v1/wall_feed_view?select=listing_id,title,created_at&limit=1` (anon).
  - `/rest/v1/rpc/search_cards` with `{q:"",limit:1,offset:0}` (anon).

