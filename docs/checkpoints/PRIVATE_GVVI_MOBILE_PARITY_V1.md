# PRIVATE_GVVI_MOBILE_PARITY_V1

## Objective
Make private GVVI intuitive and action-first on mobile.

## Current Surface Audit
- current file(s): `lib/screens/vault/vault_gvvi_screen.dart`, backed by `lib/services/vault/vault_gvvi_service.dart`
- top layout: app bar, centered card image, card title, loose state chips, generic path buttons, then a long stack of separate boxed sections for pricing, identity, wall visibility, notes, photos, history, and remove
- current hero: card art only; exact-copy identity and current state live below it instead of being part of a single owned-copy hero
- current visible actions: `Manage card`, `View card`, `Open public page` when eligible, wall toggle, save notes, upload/remove front photo, upload/remove back photo, remove copy
- current missing parity: no mobile messages summary or jump path on the private GVVI surface, no native exact-copy controls for intent/condition/image display mode, no share/copy public-link affordance, and weaker copy-state presentation than web
- clunky points: hero and actions are separated, primary next steps read like generic route buttons, copy state feels like metadata chips instead of copy truth, and the screen becomes a form-stack after the first few rows
- where user has to hunt today: wall/public state is separated from hero, notes/media live far below the main actions, history is visually buried, and the screen does not immediately answer what to do next with this exact copy

## GVVI Mobile Contract

### A. HERO INVARIANT
- the exact card copy is the hero
- card image/copy identity must be visible first
- user must immediately know “this is my exact copy”

### B. NEXT ACTION INVARIANT
- the primary next actions must be visible near the hero
- no hunting through secondary panels for the most important actions
- the screen should answer “what can I do with this copy right now?”

### C. STATE INVARIANT
- intent, condition, and public/private status must be legible
- these should feel like copy state, not admin metadata

### D. FLOW INVARIANT
- actions should be grouped by how collectors think:
  - show / sell / trade / talk / manage
- avoid scattered controls across disconnected boxes

### E. INFORMATION INVARIANT
- supporting information exists, but is visually secondary
- the user should not hit a wall of settings/forms first

## Implementation Notes
- This pass will only surface existing mobile capabilities more clearly.
- Messages summary/jump and exact-copy setting saves for intent, condition, and image display mode remain real parity gaps because the current mobile GVVI architecture does not expose those flows yet.

## GVVI Overhaul Audit
- current hero block: the card art reads first, but the exact-copy story is still split between the hero, later chips, and later sections
- current action block: `Manage card`, `View card`, `Open public page`, and `Copy public link` exist, but they still sit in a generic action stack instead of reading like the obvious next moves for this copy
- current pricing placement: pricing still lands below the hero inside the broader copy-truth section, which makes market truth feel too low in the page
- current duplicate actions: GVVI itself does not surface `Versions` or `Open set`, but those discovery actions still sit too high in the adjacent card-detail flow and remain secondary to this exact-copy page
- current family/versions placement: there is still no inline family gallery on GVVI, so `Card Family` discovery lives too high outside this screen instead of being a lower related-cards module here
- current public/share state: public open and copy-link behavior already exist when `canOpenPublicPage` is true, but there is no native mobile share-sheet path in the current architecture
- what feels clunky: pricing is too low, copy truth still reads as stacked sections, family discovery is disconnected from the screen, and the page still feels closer to a boxed admin flow than a premium exact-copy surface

## GVVI Overhaul Contract

### A. HERO CONTRACT
- the exact card copy is the dominant visual surface
- card image first
- exact-copy state directly adjacent or immediately below

### B. PRICING CONTRACT
- pricing belongs directly under the card hero
- pricing should read as immediate market truth for this copy, not a lower administrative section

### C. ACTION CONTRACT
- primary actions must be obvious and non-duplicative
- remove duplicate/secondary actions from the primary action row
- the action row should answer: what can I do with this exact card right now?

### D. SHARE CONTRACT
- if a public GVVI/public-page route already exists or is derivable from current architecture, a share/public-view affordance must be visible
- this is an exact-copy share, not a generic card share

### E. FAMILY CONTRACT
- card family/versions are secondary discovery, not primary copy truth
- family should become a lower “more like this / versions” gallery, not a metadata box near the hero

### F. CLARITY CONTRACT
- reduce stacked-box/admin feel
- fewer heavy sections
- more visual flow from hero → pricing → actions → copy truth → related cards

## Apple Pass Audit
- too many stacked section containers
- too much explanatory copy
- chips and labels compete with hero
- actions are clear but still too boxed
- supporting details are too visually loud
- more versions is in the right place but still too module-like

## Apple Pass Contract

### A. HIERARCHY
- hero is strongest
- pricing is immediate and quiet
- actions are obvious
- everything else is secondary

### B. CONTAINER REDUCTION
- reduce repeated rounded-card sections
- merge/flatten where safe
- avoid every subsection feeling like its own panel

### C. COPY REDUCTION
- remove or shorten explanatory sentences
- headings should do the work
- interface should feel self-evident

### D. CHIP DISCIPLINE
- state chips should remain useful but be quieter
- reduce visual competition with the card

### E. SECONDARY INFORMATION
- supporting details should feel available, not demanding
- destructive action should be visually clear but not dominate
