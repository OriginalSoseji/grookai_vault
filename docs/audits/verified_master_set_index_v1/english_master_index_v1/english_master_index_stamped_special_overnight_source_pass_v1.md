# Stamped/Special Overnight Source Pass V1

Audit-only overnight-style pass for the remaining stamped/special queue.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Queue Result

| metric | value |
| --- | --- |
| starting_remaining_rows | 567 |
| current_remaining_rows | 280 |
| current_no_write_or_governance_rows | 100 |
| current_source_required_rows | 177 |
| current_manual_conflict_rows | 0 |
| write_ready_now | 0 |
| fingerprint_sha256 | `bab9df68e1be1b9e74915d9b95017b0ea84fbe8a379cb6d691f6d63955edb8f7` |

## Source Attempts

| lane | status | notable result | artifact |
| --- | --- | --- | --- |
| active_finish_bulk | completed | 0 useful unabsorbed matches; 4 accepted delta records | `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.json` |
| pricecharting_stamp_labels | review_only | 42 label candidates; readiness still blocked by active finish/base parent | `docs/audits/english_master_index_source_exhaustion_v1/pkg17i3_pricecharting_stamp_label_acquisition_v1/pkg17i3_pricecharting_stamp_label_acquisition_v1.json` |
| league_sources | completed | 18 PokemonFlashfire matches; readiness has 0 insert candidates | `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg17p_pokemonflashfire_league_reverse_source_v1.json` |
| halloween_sources | blocked_after_readiness | 4 candidates; 0 insert candidates after readiness | `docs/audits/english_master_index_source_exhaustion_v1/pkg18h_pricecharting_halloween_active_finish_acquisition_v1/pkg18h_pricecharting_halloween_active_finish_acquisition_v1.json` |
| prize_pack_sources | blocked | 0 second-source ready; 31 single-source review rows | `docs/audits/english_master_index_source_exhaustion_v1/pkg18k_pricecharting_prize_pack_finish_corroboration_v1/pkg18k_pricecharting_prize_pack_finish_corroboration_v1.json` |
| sv03_sources | review_only | 10 review-ready rows; 0 write-ready now | `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sv03_stamped_parent_active_finish_readiness_queue_v1.json` |
| source_closure | completed | 212 blocked rows; 0 write-ready rows | `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json` |

## Additional Online Source Discovery

| source | result | reason | url |
| --- | --- | --- | --- |
| Pokumon crosshatch category | review_only | Static category text exposes names/counts and category families, but not enough exact set + number + active finish detail for direct fixture promotion. | https://pokumon.com/holofoil/crosshatch/ |
| JudgeBall Play! Pokemon promo cards | identity_only | Page gives useful Professor Program identity context but does not prove exact child finish for active-finish rows. | https://www.judgeball.com/archives/professor-promo-cards/ |
| PikaStocks Professor Program Promos | identity_or_market_context_only | Accessible, but current pass did not find direct exact finish proof usable for child-printing promotion. | https://www.pikastocks.com/sets/115-professor-program-promos |
| Bulbapedia Prerelease cards | identity_context_only | Useful for prerelease card identity and history. Finish still requires exact row-level evidence before child printing promotion. | https://bulbapedia.bulbagarden.net/wiki/Prerelease_cards_(TCG) |
| Enhanced Cardmarket prerelease list | not_static_parseable_for_targets | The static HTML did not expose target rows in a way that safely maps to current queue rows. | https://enhanced-cardmarket.mave.me/prerelease |

## Conclusion

No DB write package is authorized by this report. Rows remain fail-closed unless exact source evidence proves set, number, name, stamp/variant, and finish where applicable.
