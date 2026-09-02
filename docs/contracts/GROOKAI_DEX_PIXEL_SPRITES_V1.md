# Grookai Dex Pixel Sprites V1

## Purpose

Grookai Dex displays a pixel sprite for every seeded National Dex species. Web and mobile use the same first-party asset path:

```text
https://grookaivault.com/dex/sprites/v1/{national_dex_number}.png
```

## Invariants

- Grookai hosts the runtime assets. Clients do not depend on GitHub or PokeAPI availability.
- The sprite corpus must cover every National Dex number in `pokemon_species_seed_v1.json`.
- Flutter renders sprites with `FilterQuality.none` and web uses pixelated image rendering.
- Missing or invalid sprites fail the corpus contract test instead of silently shipping.
- The source repository commit and every file hash are recorded in `manifest.json`.
- The sync tool is rerun whenever the canonical species seed expands.
- The `v1` asset URLs are immutable. The sync tool refuses to replace them from a different source commit.
- A source-artwork change requires a new versioned directory, matching client URL updates, and a new manifest.

## Source Provenance

The current corpus mirrors the PokeAPI sprites repository at the immutable commit recorded in the manifest. Grookai makes no ownership claim over Pokémon character artwork. The mirror replaces an unreliable runtime dependency already used by the Dex; it does not change the underlying artwork source.
