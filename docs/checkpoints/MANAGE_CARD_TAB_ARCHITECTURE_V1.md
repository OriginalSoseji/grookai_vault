# MANAGE CARD TAB ARCHITECTURE V1

## Purpose
Segment `Manage Card` into focused tabs so rich card information is organized cleanly without removing power.

## Scope Lock
- mobile `Manage Card` only
- reuse current product semantics
- no backend changes
- tabs are structural, not decorative

## Current Surface Audit
- current top hero content: artwork, card identity, visibility pill, rarity, and owned-copy count chips
- current intent surface: grouped wall intent chips, wall/presentation summary, and relationship copy now sit near the top, but still read like one section in a longer stacked page
- current wall/public section: wall category, wall note, and price display controls still live in a full lower form block
- current copies section: exact-copy list and GVVI entry points still sit at the bottom of the same long page
- current pain points: the page still asks the user to parse one long vertical control stack; intent, public presentation, and exact-copy ownership all compete in one scroll
- why the current page feels overloaded: rich information is present, but it is not segmented by collector mode, so the surface still behaves like a long settings record instead of a card control center

## Tab Strategy
- default tab: `Overview` for collector intent, wall/presentation summary, and quick actions
- second tab: `Wall` for public-facing configuration like category, note, and price display
- third tab: `Copies` for exact owned copies and GVVI entry points
- any future reserved tab if needed: none in this pass
