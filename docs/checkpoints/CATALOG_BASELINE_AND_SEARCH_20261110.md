# Catalog baseline and advertised search qualification - November 10, 2026

Owner authorized full database cleanup/enrichment and completion without routine
approval stops. Preserve all unresolved source/identity cases; null is not proof
of inapplicability. Do not rerun historical packages against later legitimate changes.

## Verified data changes

- Japanese original artist campaign: 23976 fills; 6773 active unresolved and 175
  retired/suppressed exclusions remain. No guessed credits.
- Japanese structured stats: 14459; private gameplay profiles 6809; regulation
  marks 5095; native source-owner bridges 6809; root printed-total repairs 98.
- English private gameplay profiles 13493, including the exact published Leafeon
  source alias. Added 5889 missing source owners. Old mappings/alias history retained.
- All 20302 private profiles passed the current identity/source-owner reader.
- Magic structured metadata 105560/105996; 436 source/identity holds remain.
  Added exact images for 1221 parents/1222 faces; independently re-downloaded
  every hosted body. 525 image holds remain.
- One Piece structured metadata 6898/6900; two edition-name conflicts held.
- Japanese release dates: original 122 sets/4248 parents, plus 83 additional fixed
  sets/6697 parents supported by three captured source lists, followed by four
  manufacturer-adjudicated set records/336 parents. The latest packages
  passed actual rollback, durable apply, zero-write replay and independent global
  preservation checks. Four provider-date conflicts were resolved with original
  manufacturer announcements and two independent setlists; the rejected dates
  remain in provenance. Three product-scope cases remain held.
- Gengar cameo evidence: four exact image confirmations, including a separately
  labeled character representation. Two ambiguous silhouettes remain unconfirmed.
  All 1417 unconfirmed associations, including those two cases, remain outside
  confirmed public search.

All 132,760 structured records pass their current domain identity/source-owner
readers (Pokemon 20,302 / Magic 105,560 / One Piece 6,898), with zero rejections. Magic
uses its frozen ordered candidate JSON identity hash, One Piece its frozen
stableJson hash and Pokemon its SQL identity serialization. A generic hash
recipe must not be used to rewrite another domain's identities.

Of 12995 Magic parents linked to undated sets, 12973 already have verified
per-print source_released_at observations; those are consumer projection work,
not missing release facts. Twenty-two lack an admitted detailed-date record.
Do not put an individual issue date on a rolling collection set.

No physical printing or finish was inferred. UUIDs, GV IDs, ownership, pricing,
other source owners and original provenance were preserved by bounded proofs.

## Private structured data and ingestion boundary

The two migration files in this release preserve already-applied source history
(482 and 483); this release does not reapply them. Full local replay and the
1395-object schema/security readback passed before these data campaigns.
The private Pokemon table retains forced RLS and no anonymous policies. The shared
pure reader rejects stale identity hashes, missing/ambiguous source owners and
wrong raw lineage. Unknown arrays remain null; explicit empty arrays stay [].
The normalizer preserves original source facts and language. Further ingestion
must use raw-first frozen packages and current identity proof; a new source
snapshot is not authority to overwrite a reviewed identity, printing or profile.

## Search candidate

The live homepage examples exposed full-catalog stamp scans timing out and a
literal Gengar cameo query returning no match. Narrow stamp candidates by governed
canonical keys, retain complete pagination and final filter checks, and resolve
cameos only through the existing confirmed public projection. No private profile
or unreviewed imported association is exposed.
Anonymous candidate database qualification: WB Kids 11, Build-A-Bear 11, Gengar 4;
all database reads completed under 1.3 seconds. Focused contract tests passed,
including complete paging, combined filters, private profile boundaries, pricing
redaction and typography. Production build passed. The initial release revision
passed both managed full
shipchecks and all twenty hosted checks. An explicit artist outside the bundled
inventory is retained as a cameo constraint; forty-two focused regressions pass,
including known, unknown and explicit illustrator cases. The release branch
includes main's 06d4f137 OAuth handoff fix. Every source update still requires the
normal full gates and live readback before publication.

## Evidence locations

Canonical operator artifacts are in C:/grookai_vault/docs/audits, specifically:
`catalog_jpn_native_dates_v1_20261110`, `catalog_pokemon_gameplay_reads_v1_20261110`,
`catalog_gengar_confirmations_v1_20261110`,
`catalog_homepage_examples_readback_v1_20261110`,
`catalog_all_details_current_reads_v1_20261110`,
`catalog_jpn_primary_dates_v1_20261110`, and the source-specific campaign
directories referenced by `catalog_full_completion_v1_20261109/COMPLETION_LEDGER.md`.
These evidence packages retain actual original bytes, hashes, raw IDs, rollback,
independent readback and zero-write replay. They are not credentials or fixtures
for a production runtime. The small committed normalizer fixture is a single
published card with its original immutable source/member hashes.

## Completion boundary

The entire catalog is not fully enriched: unresolved artists, identities, species,
rarities, sealed contents, physical printings, images and historical release
scopes still require appropriate evidence. Preserve row-level queues. Counts of
missing fields overlap and must not be summed as distinct cards. Search release
success does not turn these held cases into completed data cleanup.

The actual production artifact also passed API/browser qualification: WB Kids 11,
Build-A-Bear 11, confirmed Gengar 4 and 2022-2024 reverse-holo Pikachu 14. Pikachu
identity/printing/finish/date order matches the original production response.
Complete paging and combined artist/year constraints pass, and phone 390x844 has
no horizontal overflow. Anonymous public image routing verified fourteen faces
across all twelve newly enriched Magic sets by original source body SHA.
