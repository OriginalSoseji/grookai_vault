# DP4 official artist credits — applied

This candidate covers 84 Japanese DP4 cards whose subject identities were corrected and independently read back. Each has a blank artist, a byte-identical stored official image, and an official card page whose illustrator credit matches the separately retained checklist. The plan freezes current parent, identity and all species-link preimages. It does not include the other 34 matching candidates from the 118-card evidence review.

The guarded writer only fills `card_prints.artist`; it requires exact current preimages, live official-page and stored-image checks, unique image and coordinate ownership, restricted raw source snapshots, same-writer per-batch rollback proof, and protected-state readbacks. `inspect` and `verify` are read-only. An unknown commit outcome requires independent readback before any retry. All seven batches were applied and independently read back; an `inspect` result alone does not establish a write.

The pinned plan is `artist84-plan-v2-20261120.json`. The earlier plan is retained only as an initial candidate; it lacks the complete inactive-link preimages needed for the four subject repairs and is not executable.

## Application and readback

All 84 null artist fields were filled from exact official card pages after per-batch same-writer rollback proofs. A separate read-only snapshot verified the complete parent postimages, identities, species links, and all seven durable source packages and receipts. The initial read-only attempt stopped on an unreviewed trigger; its definition was inspected and the exact non-artist trigger was pinned. The first rollback proof stopped before writing due to missing scope checkpoints; the registration was corrected, preimages were rechecked, and all seven proofs then passed.

| Chunk | Rollback proof run | Applied run / durable receipt | Read-only verify run |
| --- | --- | --- | --- |
| 0 | c35fe7f3-6b74-4449-b5a0-5be20de6cabf | 7a242657-01eb-40e9-8292-ce14d06b4d35 / 177067 | 9ba6a0ca-a99e-4f14-9695-e4d27aae5064 |
| 1 | ea394020-efc4-4fb6-bdcc-82eb9f3638fa | 3e64ad99-8308-4a62-b153-608819ddf9ef / 177071 | 39bd6fe0-5e1b-4d5f-bbdc-bf1da301fceb |
| 2 | 23f4aacb-d9be-4327-8fd9-25c7181bf300 | 54d1e84f-3e02-4db1-ba9d-17073c38c193 / 177075 | a7d5f9fe-e631-4226-9318-f5e1c8509a19 |
| 3 | a3a1d74d-c081-4a20-9300-82e83b3f22fe | e24a1367-20f5-4688-8b69-fb4e2eab6c39 / 177079 | e7d71b0d-c384-4e80-b876-3950f7b97d7e |
| 4 | ffd9c94f-4137-4385-8e0e-9406f5a815e6 | 23a5a6b7-7323-4a92-9bcc-66f1c8d2bec7 / 177083 | 8f173425-1e9e-4a93-80eb-914ece14ecd8 |
| 5 | e9d00db3-4188-45d9-97f9-88da82092c58 | 8ce140d3-9e5a-4eb5-8c04-3c117c05d769 / 177087 | d99cab3f-3ffa-442e-b7c2-8eb0b3e731b7 |
| 6 | f6f31d25-4836-4546-b27c-89331f9a1e4b | 68b670d3-f8d8-4898-8857-91ff92e9bc31 / 177091 | d2892b2b-a8a8-4eb3-967a-78c9aca7cb98 |

The original 30,924-ID baseline subsequently had 24,060 nonblank and 6,864 blank artist fields. This is a presence count, not a correctness audit or launch-readiness claim. The other 34 official-credit matches remain under identity review.
