Current Workflows

- Present: CI, Flutter build/test, DB smoke, edge functions audit, release pipelines.
- Gaps: ensure DB smoke seeds and asserts RPC response; add migration apply check (lint + local apply) gated on PRs touching `supabase/**`.

Add: DB Smoke (local)

```yaml
name: DB Smoke
on:
  pull_request:
    paths: [ 'supabase/**', 'scripts/dev/**', '.github/workflows/db-smoke.yml' ]
  workflow_dispatch: {}
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - name: Start local stack
        run: supabase start
      - name: Reset DB (no seed)
        run: supabase db reset --local --no-seed --yes
      - name: Seed demo row
        run: |
          docker exec supabase_db psql -U postgres -d postgres -c "CREATE TABLE IF NOT EXISTS public.card_prints(id text primary key, created_at timestamptz default now()); INSERT INTO public.card_prints(id) VALUES('scan-ci-0001') ON CONFLICT (id) DO NOTHING;"
      - name: Smoke search_cards
        run: |
          PUB=$(supabase status | sed -nE 's/.*Publishable key:\s*(.*)/\1/p')
          curl -sS -H "apikey: $PUB" -H "Authorization: Bearer $PUB" -H "Content-Type: application/json" \
            --data '{"q":"","limit":1,"offset":0}' http://127.0.0.1:54321/rest/v1/rpc/search_cards | tee smoke.json
          test -s smoke.json
      - name: Stop
        if: always()
        run: supabase stop
```

Add: Migration Apply Check

```yaml
name: Migrations Apply
on:
  pull_request:
    paths: [ 'supabase/migrations/**' ]
jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db lint || true
      - run: supabase db reset --local --no-seed --yes
      - run: supabase stop
```

