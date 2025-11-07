Scope (read-only inference)

- Staging endpoints unreachable due to placeholder `.env.staging`; infer from repo SQL and prior docs.

Objects and Expected Grants

- RPC: `public.search_cards(text,int,int)`
  - Security: `SECURITY DEFINER`, `SET search_path = public`
  - Grants: `GRANT EXECUTE ON FUNCTION public.search_cards(text,int,int) TO anon, authenticated;`

- Views/MV:
  - `public.wall_feed_view` → `GRANT SELECT TO anon, authenticated;`
  - `public.wall_thumbs_3x4` → `GRANT SELECT TO anon, authenticated;`
  - `public.v_card_search` → `GRANT SELECT TO anon, authenticated;`

RLS Policies (verify on staging later)

- listings (public reads of active/visible; writes by owner only):
```sql
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY listings_read_active ON public.listings
  FOR SELECT USING (status = 'active' AND visibility = 'public');
CREATE POLICY listings_owner_write ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id) TO authenticated;
CREATE POLICY listings_owner_update ON public.listings
  FOR UPDATE USING (auth.uid() = seller_id) TO authenticated;
```

- vault_items (owner-only read/write):
```sql
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY vault_items_owner_read ON public.vault_items
  FOR SELECT USING (auth.uid() = owner_id) TO authenticated;
CREATE POLICY vault_items_owner_write ON public.vault_items
  FOR INSERT WITH CHECK (auth.uid() = owner_id) TO authenticated;
CREATE POLICY vault_items_owner_update ON public.vault_items
  FOR UPDATE USING (auth.uid() = owner_id) TO authenticated;
```

Next (after .env.staging is valid)

- Probe statuses (read-only):
  - RPC: POST `/rest/v1/rpc/search_cards` → expect 200 JSON.
  - Views: GET `/rest/v1/wall_feed_view?select=...&limit=1` → expect 200 JSON.
  - 404 → missing object or missing grant; 401/403 → auth/grant mismatch.

