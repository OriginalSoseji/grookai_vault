# Abyss Eye Image Correction: 2026-07-14

- Scope: `jpn-m5` Abyss Eye card image correction after `GV-PK-JPN-M5-118` was found serving an English Pitch Black image.
- Production route checked: `https://grookaivault.com/api/canon/cards/GV-PK-JPN-M5-118/image`
- Status: complete

## Corrected Data

- Updated 16 Abyss Eye `card_prints` rows that had `PitchBlack` source URLs.
- Repointed corrected rows to new self-hosted immutable paths under:

```text
warehouse-derived/self-hosted-images-v1/pokemon-jpn/jpn-m5/<gv-id>/<sha-prefix>.<ext>
```

- `GV-PK-JPN-M5-118` now points to the JP Pokellector image:

```text
https://den-cards.pokellector.com/433/Mega-Darkrai-ex.M5.118.61579.png
```

## Storage Cleanup

- Verified the old bad JPG paths were unreferenced by `card_prints` and `card_printings`.
- Removed 16 stale objects from:

```text
warehouse-derived/self-hosted-images-v1/jpn-m5/*.jpg
```

- Left the valid main-set PNG objects in the same folder intact.

## Runtime Verification

- Old raw proxy path for `warehouse-derived/self-hosted-images-v1/jpn-m5/118.jpg`: `404`
- Canonical card route for `GV-PK-JPN-M5-118`: `200 image/png`
- Canonical card route cache policy: `no-store, max-age=0`
- Remaining `jpn-m5` DB rows with `PitchBlack` image URLs: `0`
- Remaining JPG objects in `warehouse-derived/self-hosted-images-v1/jpn-m5`: `0`

## Ingestion Hardening

- Added manifest-level image identity guards for Abyss Eye.
- Added JP Pokellector fallback image acquisition for secret rares.
- Added reviewed TCGCollector image overrides for cards `113` and `117`, where Pokellector still served placeholders on 2026-07-14.
- Added a storage-phase image identity guard so rejected image URLs cannot be self-hosted.
- Added a contract test that the final Abyss Eye acquisition artifact contains no selected `PitchBlack` or placeholder image fields.
