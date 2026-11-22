# Pokémon playable Full Art metadata

Full-art-only discovery previously returned zero because the 269 current playable cards had no explicit artwork marker in the searched catalog fields. Ordinary searches already included those versions.

The backend artwork producer now verifies explicit factual source fields and builds a separate exact-card read model. Search checks this model alongside existing explicit catalog markers. It preserves all rarity, name, set and playable constraints. It neither infers artwork from Ultra Rare/SIR nor shares artwork labels across gameplay-equivalent versions.

The inspected cohort contains 56 Ultra Rare candidates selected only for discovery. Explicit reference metadata classifies 23 cards; 33 remain held. The accepted cohort includes TWM202 Bloodmoon Ursaluna ex, TWM200 Dragapult ex and LOT209 Judge. Source facts are the provider's own `table#attribute` Details.Notes or an exact retained TCGCSV product `(Full Art)` label, with exact source number/set/name and unique active TCGplayer ownership. Auction titles, prices, general rarity and surrounding page text cannot classify a card.

Canonical environment sanity passed on `ycdxbpibncqcchqiihfz`: 173,837 card prints, 3,420 sets, 47,409 traits and 326 vault items. Existing identities and hashes are verified using the shared backend client and canonical serializer. Originals use the existing private raw-import/artifact store with 30-day retention; only sanitized facts and public source references enter the checked-in model. This adds no canonical, mapping, printing, pricing, inventory, schema or playable-publication writes.

All 63 focused tests pass, covering source integrity, explicit field isolation, coordinate checks, reciprocal ownership, suppressed/drifted identities, exact-card metadata binding, sibling isolation, run success/failure persistence, uncertain terminal writes, and existing SIR/IR/quoted/name behavior. Web typechecking and focused lint pass. Independent backend readback verified all 23 raw-import receipt hashes and their inclusion in the unchanged 269-card publication at `2026-11-20T14:46:20.608Z`. Full managed/hosted checks and deployed readback remain required for release acceptance.

Production raw-ingress qualification independently verified success run `4e0fcaf1-0923-4eab-a74e-59471895fa93` and expected integrity-failure run `a5035225-1b4a-4a1c-a2f3-790dc03f071f`. Each has one terminal DB receipt with stage/version; the failure emits no model. Two offline replays produced identical bytes (SHA256 `48e37310efb1f7d1150dc924a7251079f95ca9e58350b8542b8688a5462719c6`). The model's compact semantic hash is `f2f44ab74f78ebdf76804bfb3c82df5134adb59ad21740effda2521174e279d5`.

Read-only operational verification:

```sql
select payload->>'run_id' as run_id, payload->>'status' as status,
       payload->>'stage' as stage, payload->>'error_code' as error_code,
       payload->'summary' as summary
from public.raw_imports
where source = 'grookai_pokemon_playables_engine_v1'
  and status = 'playables_run_v1'
  and payload->>'purpose' = 'catalog_artwork_metadata_build';
```
