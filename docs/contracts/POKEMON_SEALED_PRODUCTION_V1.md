# Pokemon Sealed Production V1

Date: 2026-09-07
Authority: The founder requested the complete Pokemon sealed implementation,
start to finish, using the proven MTG sealed process. This authorizes the
bounded implementation, verified sealed data and image applies, deployment,
signed-in activation, and readback described here without intermediate prompts.

## Scope

Inventory all active Pokemon source categories and manufacturer sealed products.
Preserve exact source product, package, quantity, edition, and supported language.
Unknown identity dimensions remain unknown. Ambiguous, accessory-only, repacked,
and individual-card products cannot be promoted as manufacturer sealed products.
An English default is allowed only for the established English source lane;
other languages require explicit category, product, or structured evidence.

Reuse the separate sealed domain, immutable releases, exact source mappings,
TCGPlayer market-price qualifications, self-hosted images, service-side signing,
and signed-in client boundaries. No sealed data goes into card_prints or Vault.
No change may overwrite MTG or One Piece releases, images, controls, or pricing.

## Execution

1. Persist a read-only source inventory and classification dispositions.
2. Freeze deterministic payloads and hashes; test category, identity, package,
   language, pricing lineage, image, and cross-game boundaries.
3. Prove rollback before durable apply. Immediately before commit, revalidate
   source hashes, target collisions, expected counts, and protected game state.
4. Read back every applied manifest and prove idempotency without duplicate rows.
5. Download exact source images with bounded retries; upload with upsert disabled
   and verify bytes. Resume only from verified journal entries.
6. Freeze image evidence and activate game-scoped pointers with compare-and-swap.
7. Expose paginated signed-in search/browse through governed APIs and self-hosted
   images, with package/language filters and exact product identity.
8. Configure bounded refresh/monitoring using the existing source warehouse.
9. Verify production APIs, web, and Android; preserve a completion checkpoint.

## Bounded Ongoing Refresh

The same start-to-finish authority covers daily paired price/image release
refreshes for the 1,721 already image-verified variants in frozen baseline
`0bf7970b-842e-556c-9c6f-d541d1456212`. This is not authority to expand identities.
Only unchanged exact source mappings and positive USD Normal market observations
at most seven days old qualify. A completed warehouse sync must be at most two
days old. Duplicate inputs, price movements outside
one-third to three times the previous quote, or loss of more than five percent
of the fixed baseline stop the whole refresh without writes.

September 9 release-containment amendment: the founder directed completion of
launch repairs without calendar holds. Under `POKEMON_SEALED_SOURCE_CONTAINMENT_V1`,
a missing, inactive, changed-hash or changed-category source row is excluded from
both new releases with expected/observed source evidence. It is never remapped,
reapproved or published by this repair. Source exclusions and price exclusions
share the unchanged five-percent loss limit. Invalid baseline image evidence
still stops the entire refresh, even for an excluded source. The prior whole-run
source-drift failure remains preserved as historical evidence, not relabeled.

Each execution freezes its plan and commit, proves a full rollback, then inserts
immutable qualifications and bound price/image releases in one transaction.
Both game-scoped pointers move together with compare-and-swap. Existing verified
Storage objects and original retrieval timestamps are reused, never re-uploaded
or re-dated. Independent readback and exact published-set reconciliation are
required after commit. Repeated identical runs are zero-write no-ops. No identity,
Storage, visibility, Vault, or other-game writes are authorized by this refresh.
New products remain staged for separate identity/image evidence completion.

## Completion

Every inspected source product has a disposition. Published products have exact
source identity, fresh qualified market evidence, and verified self-hosted image
evidence or an explicit nonpublication reason. Candidate counts are not claims
of full global catalog coverage. All applies reconcile with zero mismatches.
Existing games remain unchanged. Report any unavailable sources or exclusions.
