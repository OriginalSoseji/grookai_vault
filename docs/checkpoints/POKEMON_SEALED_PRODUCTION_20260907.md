# Pokemon Sealed Production Progress

Date: 2026-09-07. Status: supported source-derived release complete. Data, Storage,
signed-in activation, production web, Samsung, and first real daily workflow
verified. Source-maintenance warning remains open; see coverage boundaries.
Authority: `docs/contracts/POKEMON_SEALED_PRODUCTION_V1.md`.

## Durable Evidence

- Inventory: 63,127 active source products across Pokemon and Pokemon Japan.
- Exact sealed foundation: 290 families, 2,525 variants/candidates/reviews/mappings,
  10,023 identity evidence rows, 2,294 qualifications, one frozen price release,
  and 1,756 price-release members. Total inserted: 24,464 rows.
- Variant language distribution: 2,263 English and 262 Japanese.
- Pricing exclusions: 422 missing market prices, 116 stale observations, and
  231 qualification holds. Ambiguous source products remain in the inventory
  dispositions, not promoted by guessed package/identity information.
- Catalog price release: `6b50c0f5-79d2-581f-b471-890b0f196b58`.
- Catalog execution: `e6dfa8973db3af8fc2e69c095f7673c3af39fd06`;
  plan `feff127bd01aa549a7072883dccdedc2ed1e2bf3530001160b5a2dbfe5d1b662`.
- Full rollback canary, exact durable readback, and zero-row idempotency passed.
- Storage: 1,720 unique Pokemon-only objects uploaded with upsert disabled;
  all exact bytes read back, covering 1,721 variants. No deletes or overwrites.
- Storage execution: `865ff940608cc4c20a7c3af84cdd12049bccf4e5`;
  fingerprint `73f123ea2e3bb7b0a00ca8eece1be5ada784ba722a48973b789331546808bf42`.
- Image release: `0bf7970b-842e-556c-9c6f-d541d1456212`;
  manifest `37932130e4c0e9614a52797e6facf460e5d5de7d19472c08fbed8cb10e8c016d`.
- Image release inserts: 1,756 evidence, 1,720 objects, 1,721 assertions,
  one frozen release, and 1,721 members. Total inserted: 6,919.
- Image execution: `d181d809a960c770be46db34dd00402e1a0b6847`;
  plan `948e61fc646f62491d40f078c1a4f0a2f34038b032fe99e90b9492c1211c4205`.
- Image rollback, independent durable readback, and zero-row idempotency passed.
- 35 retrieval failures are explicit image exclusions, never replacement images.
- MTG/One Piece sealed records/pointers remain protected and unchanged.
- No card_prints, sets, Vault, or existing-game writes occurred.

## Schema And Verification

The foundation migration `20260907060000` is applied and independently verified.
Its SHA-256 is `6d3b86cb3448ce2eafa2e6bbc90e0b39d6a7c6219afd4a8037485b60c75741ff`.
The exact scoped executor preserved existing sealed data/routines and left the
unrelated pending `20260905120000` migration unapplied. The broad legacy strict
schema diff has pre-existing non-Pokemon differences; never apply that generated
diff or a broad `db push` to erase those differences.

The local database was backed up before reset. Full local migration replay passed,
including the additional Pokemon catalog filter endpoint `20260907070000`.
The filter migration was applied with rollback and independent readback at
06:45 UTC. Its SHA-256 is
`58fb1c239bed791565ce7528a86a6c227c6c1051b795d63856b135d295861ef3`.
The Pokemon signer is deployed as `pokemon-sealed-sign-image-v1`, version 1.
Atomic activation at 06:47 UTC moved the Pokemon price/image pointers and
signed-in control together. All 1,721 eligible variants reconciled; anonymous
access remained denied. MTG and One Piece pointers remained unchanged.

The local pre-commit shipcheck could not run from this isolated worktree because
its runtime preflight lacked SUPABASE_DB_URL. Commits used a per-command hook
override after independent secret, syntax, targeted contract, replay and diff
checks. This is not evidence that the entire repository shipcheck passed.

## Clients And Release

- PR #425 merged into main as `be43b364493445f2513ded706047e8d679948b44`.
  All PR checks passed, including CodeQL, runtime protection, Flutter tests,
  web parity/accessibility, drift, and secret scanning.
- Targeted sealed contracts: 43/43 passed. Web runtime tests: 9/9. Flutter
  sealed-client tests: 7/7. Web production build and scoped Flutter analysis passed.
- The Samsung SM-S908U test device was rebuilt and installed without clearing data.
  APK SHA-256:
  `38578089da15926e46cac0fa1db365eed10b5c42da1517955a75a3a6d7782227f`.
  This is a local profile build, version 1.0.0+312, not a new store release.
- Device checks passed: Pokemon browse, next page, Pikachu search, Japanese
  language, combined Japanese/booster-box filters, self-hosted rendered images,
  market prices, and MTG sealed regression.
- Production URL: `https://grookaivault.com/sealed/pokemon`, signed-in only.
  Deployment `6304207987` completed at 07:43:23 UTC from merged main above.
  Actual authenticated production HTML passed page 1, page 2, Japanese booster
  boxes, and Pikachu checks: 24 rows each, all expected names and self-hosted
  image links. Anonymous visitors redirect to login. The bounded store-review
  authentication session was revoked afterward. Checks took 4.6-7.0 seconds
  each including the independent RPC comparison; this is not a launch latency SLA.
- No iOS/TestFlight upload or public anonymous pricing activation was performed.

## Automatic Refresh And Discovery

- Workflow: `.github/workflows/pokemon-sealed-health-v1.yml`, daily 11:35 UTC.
- Repository variable `POKEMON_SEALED_REFRESH_ACTIVE=true` was enabled only
  after the rollback, durable apply, and zero-write repeat passed locally.
- First refresh producer: `fbf8220f4758da9970515eff105ebafcd5b7fc8a`.
  Plan: `bdf4ab35d5bbdf6b9708075a098fd81ff522b13e31398fafdd13fe7581582621`.
- Durable refresh inserted 8,607 immutable qualification/release/evidence rows
  and moved exactly two Pokemon pointers in one transaction. All 1,721 products
  reconciled. The repeated apply inserted zero rows and moved zero pointers.
- First refresh price release: `3df659a9-6b28-5934-aa05-86f750945072`.
  Image release: `36c01728-0c72-5001-9cbd-8e5eb4b7f721`.
  These are execution provenance, not permanent active-pointer expectations;
  successful scheduled refreshes create subsequent immutable releases.
- Refresh reuses the fixed 1,721-image baseline and verified Storage objects.
  Identity drift, stale source sync, >5% coverage loss, or a price ratio outside
  one-third to three times the previous quote stops without publication.
- New identities are discovered/staged, not silently applied by the refresher.
  No refresh performs Storage, canonical card/set, Vault, or other-game writes.
- Live authenticated signer/byte readback passed on three products, including
  wrong-game denial. The probe uses an existing store-review identity, creates
  no accounts, sends no email, and revokes only its new auth session.
- Some source quotes are seven days old. Source-maintenance warnings are kept
  separate from execution failures. Stale prices are withheld, never re-dated.
- First real workflow run: `34096657106` from merged main **passed**. All steps
  completed: tests, rollback/durable refresh, inventory, price proposal, live
  health/image readback, artifact upload, and operator-alert reconciliation.
  Evidence: `https://github.com/OriginalSoseji/grookai_vault/actions/runs/34096657106`.
- Runner refresh plan:
  `ad1abec99304aebb7052313b2102c003d5a3cedd2ff36eb25219c84b0264eabb`.
  It reused existing exact qualifications and inserted 6,886 immutable release,
  membership, evidence and assertion rows; two Pokemon pointers moved together.
  Published/read back: 1,721; exclusions: zero; Storage/identity writes: zero.
- Active pointers at final readback:
  price `a7689ab3-6149-5d9b-adc1-1457b6995b54`,
  image `e62d061f-1c8c-5421-8026-ebcecaae9cb2`.
- Health at 07:46:14 UTC: source age one day, new products zero, changed source
  mappings zero, all 1,721 published, authenticated signer/byte checks passed.
  Only finding: aging exact source quotes. Issue #426 was automatically opened:
  `https://github.com/OriginalSoseji/grookai_vault/issues/426`.
  Do not close it by changing observation dates or loosening the freshness rule.

## Coverage Boundaries

This completes the supported source-derived implementation, not a claim that
every sealed Pokemon product worldwide has been proven. Missing prices, the
35 image retrieval failures, ambiguous package evidence, and unavailable
language/source lanes retain explicit nonpublication dispositions. Existing
verified products refresh automatically; new catalog identity/image expansion
still requires its own bounded evidence-complete payload.

## Recovery And Next Maintenance

No rollback is currently required. To stop future automatic price publication,
set repository variable `POKEMON_SEALED_REFRESH_ACTIVE=false`; daily read-only
discovery and health continue. This does not hide the catalog or modify prices.
For a genuine publication fault, preserve the run plan/readback, inspect the
previous paired release IDs in its `expected_pointers`, and restore both pointers
only with a new explicit compare-and-swap plan after verifying image/price binding.
Never delete retained immutable releases or reuse an old activation authorization.

Ordinary follow-up work is source-gap maintenance: the 35 missing images,
unpriced/stale/ambiguous products, and additional language/source coverage. New
identities/images must pass the same source, collision, rollback, exact readback,
and publication gates. iOS/store distribution and Vault support are separate
features, not silently included in this signed-in web/Android release.

## Resume Locations

Worktree: `C:/grookai_vault_pokemon_sealed`. Implementation authority remains on
`agent/pokemon-sealed-production-v1`; completion notes use
`docs/pokemon-sealed-completion-20260907` from merged main.
Frozen image executor: `C:/grookai_vault_pokemon_sealed_execution` at `d181d809a`.
Artifacts: `C:/grookai_vault_operator_artifacts/pokemon_sealed/`.
Production project: `ycdxbpibncqcchqiihfz`.
Local replay DB port is **54330**, not 54322; pass `--local` explicitly to the
schema operator. App flags default off in code; Vercel config and verified mobile
build settings explicitly enable the signed-in Pokemon client. GitHub artifacts
were downloaded to `20260907_github_daily/` under the artifact root. Production
HTML evidence is in `20260907_web_production_smoke/summary.json`; device images
are `samsung-pokemon-sealed*.png` and `samsung-mtg-sealed-regression.png`.
