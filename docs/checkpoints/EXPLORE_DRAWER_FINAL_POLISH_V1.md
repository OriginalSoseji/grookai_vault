# EXPLORE DRAWER FINAL POLISH V1

## Purpose
Apply the final small polish fixes to the Explore drawer so information hierarchy and secondary action balance feel complete.

## Scope Lock
- price/GVID hierarchy only
- secondary action parity only
- set link behavior only

## Current Problems
- GVID currently draws too much attention relative to price
- price should appear before GVID and feel more important
- `Share` is not visually matching the other secondary actions
- set name text (example: `Base Set`) is not opening the set page

## Audit Notes
- current price placement: below GVID in the Explore drawer
- current GVID placement: above price in a prominent utility chip row
- current secondary action sizing: content-width buttons in a `Wrap`, so `Share` reads narrower than the other secondaries
- current set-route wiring: no Explore drawer set link yet, but mobile already opens sets through `PublicSetDetailScreen(setCode: ...)`
- expected set destination path: `PublicSetDetailScreen(setCode: card.setCode)`
