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

## Completion

Every inspected source product has a disposition. Published products have exact
source identity, fresh qualified market evidence, and verified self-hosted image
evidence or an explicit nonpublication reason. Candidate counts are not claims
of full global catalog coverage. All applies reconcile with zero mismatches.
Existing games remain unchanged. Report any unavailable sources or exclusions.
