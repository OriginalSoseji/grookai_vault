# TCGplayer Cosmos finish pricing

Explicit Pokémon product titles ending in `(Cosmos Holo)` and the provider's
`Holofoil` price subtype describe Cosmos, not an ordinary holo printing. A Normal,
Reverse Holofoil, or other subtype paired with that title remains unresolved.
The source subtype is preserved in provenance; its normalized finish is `cosmos`.
Decisions and snapshots retain `TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3` for
existing rollout validation. The exact finish exception is recorded separately
as `evidence.finish_policy_version=TCGPLAYER_COSMOS_FINISH_V1`.

Publication requires an existing, non-provisional Cosmos child and all of:

- an active exact `external_printing_mappings` row for source `tcgplayer` and the
  decimal product ID;
- mapping metadata `finish_authority_version=TCGPLAYER_COSMOS_FINISH_V1`,
  `source_subtype=Holofoil`, `finish_key=cosmos`, and a
  `source_product_payload_hash` matching the current warehouse product;
- an active verified, visible truth review naming Cosmos and a proof report,
  with no conflicting active review or competing product-to-child mapping;
- an immutable `MEE_MARKET_CLOSE_COSMOS_ASSIGNMENT_V1` assignment to that child;
- the existing language, current-source, positive-price, freshness, identity,
  and one-to-one mapping qualification checks.

The exception applies only to the `special_holo_treatment` scope rule. It does
not admit Prize Pack groups, World Championship decks, stamped cards, Pokémon
Center variants, or other excluded lanes. Existing Trainer Kit and MTG rules
remain in force. Parent-only mapping metadata never grants child price authority.

The migration creates no printing, review, mapping, or price rows. Exact-printing
admission is a separate evidence-backed operation under the printing truth
contract, including per-set invariants and rollback proof. Old generic holo
assignments and historical price records remain intact; they cannot provide
Cosmos provenance. A new full source run produces new immutable assignments.

Release order: apply the schema migration, release the policy code, run the
governed pricing pipeline, and verify authenticated parent and child reads.
Deploying either schema or code alone cannot admit an unreviewed Cosmos price.
No support claim implies complete Cosmos catalog coverage.
