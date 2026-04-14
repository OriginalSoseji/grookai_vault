# SLAB UPGRADE ROUTE DEPLOY V1

## Purpose
Deploy the slab upgrade API route and complete the native mobile slab upgrade flow.

## Local Route Audit
- route path:
  - `apps/web/src/app/api/slabs/upgrade/route.ts`
- file exists:
  - yes
- expected endpoint:
  - `POST /api/slabs/upgrade`
- auth requirements:
  - bearer token required
  - route validates signed-in user through Supabase auth
- backend action reused:
  - `apps/web/src/lib/slabs/createSlabInstance.ts`
  - archives the source raw exact copy through `vault_archive_exact_instance_v1`

## Local Build Audit
- local typecheck/build tooling:
  - `node`, `npm`, `pnpm`, `yarn`, `bun`, and `vercel` are not installed in this shell
- repo-standard web build commands:
  - `npm run typecheck`
  - `npm run build`
- exact blocker:
  - local web typecheck/build cannot be run from this machine because the required JS toolchain is missing

## Deployment Audit
- platform:
  - Vercel
- project:
  - `grookai-vault`
- team:
  - `sosejis-projects`
- production source:
  - git-based deploy from GitHub `main`
- current production deployment:
  - `dpl_4bvQAMStJKvuHEdgSrgzYMMJnudi`
- manual deploy risk:
  - local workspace is very dirty, so deploying the whole current checkout would risk shipping unrelated changes
- safe deploy path:
  - isolate the route in a clean git worktree, push only that change to `main`, then let Vercel build production from git

## Deployment Result
- isolated deploy commit:
  - `c2e084e` (`web: add slab upgrade api route`)
- production deployment:
  - `dpl_3X9vdzDtrtoz5Lc4jUZSqoSu1r9g`
- production build proof:
  - Vercel build logs include `ƒ /api/slabs/upgrade`
- pre-deploy route status:
  - `POST https://grookaivault.com/api/slabs/upgrade` returned `404`
- post-deploy route status:
  - unauthenticated `POST https://grookaivault.com/api/slabs/upgrade` returned `401 {"error":"missing_bearer_token"}`
- authenticated validation probe:
  - signed-in simulator auth reached business validation and returned `404 {"error":"source_not_found","message":"This raw exact copy could not be found."}` for an intentionally fake source id

## Mobile Verification
- verified eligible raw source:
  - `GVVI-065CAB28-000384`
  - `Ash's Pikachu`
  - `SM Black Star Promos #SM111`
- verified PSA cert used:
  - `41059180`
  - route verification returned `verified=true`
  - title matched `ASH'S PIKACHU`
- submit result:
  - source raw GVVI `GVVI-065CAB28-000384` archived
  - new slab exact copy created as `GVVI-065CAB28-000390`
  - new slab instance stored with `grade_company=PSA`, `grade_value=GEM MT 10`, `grade_label=PSA GEM MT 10`
- screenshot set:
  - `temp/slab_upgrade_route_deploy_v1/01_raw_exact_copy.png`
  - `temp/slab_upgrade_route_deploy_v1/02_native_slab_form.png`
  - `temp/slab_upgrade_route_deploy_v1/03_post_upgrade_slabbed_gvvi.png`
  - `temp/slab_upgrade_route_deploy_v1/04_action_hidden_after_upgrade.png`
