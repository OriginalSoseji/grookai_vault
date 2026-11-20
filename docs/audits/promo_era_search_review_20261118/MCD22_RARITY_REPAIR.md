# McDonald's 2022 rarity repair package

The 15 existing McDonald's 2022 parents have empty rarity. Their active TCGplayer product records explicitly say `Promo`. The parent stores the numerator only; the provider stores a numerator and total, and both the set record and each active identity retain the total 15. The source-admission policy requires exact set, parent, identity, trait, mapping, product and group evidence. It does not infer finish, create cards or overwrite existing rarity.

The frozen execution plan contains 15 UUID-bound null-to-`Promo` changes. The worker uses the shared canon executor, verifies source hashes and exact frozen preimages, stages the retained provider product/group JSONB records before updating, and proves protected identity, traits, printings, mappings, images, ownership and market dependencies have not changed. The provider objects are database JSONB snapshots, not original HTTP bytes.

The rollback-proof mode exercises the transaction and verifies parent, source, receipt and protected-dependency restoration after rollback. Apply is gated by a rollback proof bound to the exact worker fingerprint. Inspect is read-only; verify requires a matching durable receipt and all 16 staged source snapshots. Operational run status is written to the run ledger for mutation-capable modes.

The underlying proposal and preflight are retained in this directory. The package is independent of the four staff-stamp source discrepancies and other populated rarity conflicts; those remain held. Source classification does not change the catalog's physical finish or printed identity.
