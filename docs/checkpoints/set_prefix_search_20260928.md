# Opening-word set search

The founder requested `Pika 30th`, `pika ascended`, and Pokemon names combined
with the opening word of a multiword set name. The shared resolver now adds
catalog-backed opening-word shortcuts after checking full names and identifiers.
Word order, case and comma separators retain their existing behavior.

- Card-name fragments remain literal substring constraints, so Pika matches
  Pikachu and its named forms without a spelling guess.
- Full names/codes remain more specific. A shared opening word includes all
  matching sets; a complete set name narrows that scope.
- `30th` uses the same real catalog family as `30th anniversary`, including
  localized releases. It does not include 25th/20th releases.
- The shortcut appears in the existing removable set filter and is applied
  before pagination. Artist/finish constraints and unknown words are retained.
- Full card names still take precedence. When competing shortcuts include a
  recognized card name, the other shortcut wins: `Charizard Evolving` searches
  Evolving Skies rather than interpreting Charizard as Charizard Half Deck.
- Quoted text remains literal. Shortcuts use complete opening words of at least
  two characters containing a letter. Numeric years and generic leading
  the/and/Pokemon words are not shortcuts. Other games are unchanged.

Private read-only catalog comparison found36 matching Pika/Pikachu parents in
the30th family and4 in Ascended Heroes, with identical sets in either order.
These are candidate parser/catalog results, not deployed endpoint evidence.
Route tests cover complete pagination, removable filters, full-name precedence,
product-name collisions, exact card names, artist/finish combinations and errors.

Source is isolated on `fix/search-set-prefix-20260928`, based on current main
`ebfaf4e66` in `C:/gv_search_name_set_20260928`. Previous native branch and PR530
remain preserved. There are no schema, catalog, permission or native UI changes.
Full verification/source status is in
`C:/grookai_vault_operator_artifacts/search_set_prefix_20260928/CHECKPOINT.md`.
Website deployment and live native/web verification are separate remaining work.
