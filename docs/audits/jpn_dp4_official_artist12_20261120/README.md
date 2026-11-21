# DP4 official artist credits — twelve applied

This candidate covers twelve Japanese DP4 cards with blank artist fields, exact official images, matching official illustrator credits, and agreement between the official printed Pokédex number, current primary species, and English identity. It is separate from the previously repaired 84-card subset; the remaining 22 official-credit matches have unresolved subject conflicts.

The guarded writer only fills `card_prints.artist`. It requires frozen parent, identity, link and species preimages; live official-page and stored-image checks; unique image and coordinate ownership; restricted raw source snapshots; same-writer rollback proof; and protected-state readbacks. `inspect` and `verify` are read-only. An unknown commit outcome requires independent readback before any retry. The applied receipt and independent readback are recorded below.

## Application and readback

The initial read-only inspection detected changed official page bytes for two cards. Fresh pages were captured after verifying unchanged card title, illustrator, image URL and Pokédex number; the earlier pages are retained in `prior-captures/`, and `official-page-refresh-20261120.json` records both hashes. The updated plan is `artist12-plan-v2-20261120.json`.

The same-writer rollback proof passed (`710664e1-b449-4a8d-ba29-b8e2fbb034e1`), followed by the guarded apply (`aa8e96a6-8bfb-4c03-b04e-15b117bf4ee3`, durable receipt `177095`) and separate actor verification (`484e4542-c548-4f69-a020-0085abe6a2bd`). `independent-artist12-readback-20261120.json` independently checks all twelve parent postimages, identity, link and species preimages, and retained source package. The original 30,924-ID baseline then had 24,072 nonblank and 6,852 blank artist fields; this is presence only.
