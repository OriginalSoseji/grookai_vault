# Magic date-only release — 2026-11-11

Forty-eight English paper Magic prints had source-backed individual release
dates but their unrelated metadata remained held for identity review. A
bounded date-only package adds those dates without changing identity or
physical printing facts. Six affected prints belong to sets without a stored
release date.

The catalog apply updated exactly 48 previously null metadata values after a
matching protected-fact rollback proof. Source members and the plan were
preserved in private raw receipts. An independent read-only check verified
all 48 dates, unchanged protected relationships and the successful execution
ledger; a guarded replay made zero additional writes. The code returns the
date only after request-scoped visibility and private source/identity checks.
Private source records and receipts are not included in public results.

Plan fingerprint:
`3b0dccb6c1ffd7fd0b27e1b0829a45af333b632fdc19d5583cce68f2f0d84543`.
The two original Scryfall default-card captures were
`default-cards-20261110100759.jsonl.gz` (compressed SHA-256
`42a921fd8e75c0d573cbc12280afa6416b4955678d1d097ffb3ee6504bbc516f`) and
`default-cards-20260813090526.jsonl.gz` (compressed SHA-256
`4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c`),
both under `https://data.scryfall.io/default-cards/`. Exact original members
and the pinned plan are in private `raw_imports` source receipt `174559`;
apply receipt `174560` binds that source to the package. The execution ledger
run is `78d5bb9f-e399-4000-b58c-4a2cad86a942`. Do not expose receipt bodies
through public APIs or treat source metadata as physical-finish authority.
The 48 date-only admissions do not fill the 436 full-metadata holds; 388
other cases remain in source/identity review.
The reader extends shared Magic detail, related, comparison and search
consumers. Year candidate discovery includes both qualified date namespaces;
unknown dates do not fall back to a collection launch date. It does not
resolve the separate metadata, identity or physical-finish holds.

The resolver also handles punctuation-stripped multiword names by retrying a
bounded name fragment when the original name lookup finds no matching names.
The complete candidate pages are still filtered against every original word;
unrelated names are not admitted as matches. Larger keyset pages preserve
complete results when the server's page cap is lower than the request.
