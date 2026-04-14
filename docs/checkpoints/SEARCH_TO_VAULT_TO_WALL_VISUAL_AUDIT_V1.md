# SEARCH TO VAULT TO WALL VISUAL AUDIT V1

## Purpose
This checkpoint captures a collector-first visual audit of the Grookai mobile flow from search discovery through vault ownership and wall/public sharing behavior.

This is an image-led audit.
The goal is to judge the flow as a collector would experience it, not as a developer reading code.

## Audit Rules
- screenshots are primary evidence
- code/repo inspection is secondary
- no assumptions about hidden architecture
- every friction claim must tie back to a captured screen or verified missing behavior
- collector mental model overrides implementation convenience

## Audit Questions
- Can a collector act on a card quickly from search?
- Can a collector add a card to the vault without unnecessary navigation?
- Does the flow feel premium or stacked/clunky?
- Are there too many screens for one collector intention?
- Is ownership truth clear once the card is added?
- Is wall/public/showcase behavior obvious?
- What actions are missing at the moment they are most needed?

## Capture Plan

Capture the following exact journey with images:

### Flow A — Search discovery
1. Search entry surface
2. Search results list/grid
3. Tapping a result
4. Any result-level available action(s)

### Flow B — Add to vault path
5. The first screen after selecting a card from search
6. The point where collector expects “Add to Vault”
7. The actual path required to add to vault
8. Every intermediate screen required before ownership is established
9. Confirmation / resulting ownership state

### Flow C — Manage card / exact-copy path
10. Post-add destination
11. Private GVVI / manage card screen
12. Actions available there
13. Any copy truth / notes / media / wall controls

### Flow D — Wall / public / share path
14. How a collector gets a card onto the wall
15. Any public/open/share surface
16. Any friction or ambiguity between vault ownership and public showcase

### Flow E — Return / continuity
17. Whether the collector can naturally get back to search or continue adding
18. Whether the flow feels broken into too many separate screens

If any step is impossible, missing, or awkward, capture the blocking screen and document the exact missing expectation.

## Visual Friction Map

### `01_search_entry.png`
- user intention: start a collector flow from discovery
- what the collector expects here: a clean way to search and then act on a card
- what the screen actually offers: search field, browse sets, curated cards, rarity chips
- friction observed: the surface is attractive, but it frames browsing more strongly than ownership
- premium feel score (1-10): 7
- trust/clarity score (1-10): 6
- does this move the collector forward cleanly? yes
- notes: good opening browse surface, but no ownership cue is visible before results

### `02_search_results.png`
- user intention: choose a card and add it
- what the collector expects here: a clear card result with an obvious ownership action
- what the screen actually offers: results grid, art-first cards, a small circular `+` icon that is visually ambiguous
- friction observed: the `+` affordance reads like add-to-vault, but the verified code path shows it is compare, not ownership
- premium feel score (1-10): 6
- trust/clarity score (1-10): 4
- does this move the collector forward cleanly? no
- notes: this is the first major trust break in the flow

### `03_result_selected.png`
- user intention: inspect the card and decide to add it
- what the collector expects here: card detail or an action hub
- what the screen actually offers: a large art preview modal
- friction observed: tapping a result produces media zoom behavior, not ownership behavior
- premium feel score (1-10): 4
- trust/clarity score (1-10): 3
- does this move the collector forward cleanly? no
- notes: feels like the app switched from collecting mode into image-viewing mode

### `04_expected_add_to_vault_moment.png`
- user intention: press `Add to Vault`
- what the collector expects here: the moment of commitment
- what the screen actually offers: no visible ownership action at all
- friction observed: the exact moment when the collector wants to act is a dead end
- premium feel score (1-10): 3
- trust/clarity score (1-10): 2
- does this move the collector forward cleanly? no
- notes: high-severity flow gap; direct search-to-vault action is missing from the visible product path

### `05_actual_next_screen.png`
- user intention: recover and find another way to add/own the card
- what the collector expects here: some obvious `Add to Vault` or `Add Card` affordance in Vault
- what the screen actually offers: owned-card grid, filters, search, no prominent add entry
- friction observed: the actual ownership context is disconnected from search and still does not surface a clear add control
- premium feel score (1-10): 7
- trust/clarity score (1-10): 5
- does this move the collector forward cleanly? partially
- notes: visually solid, but the ownership action is still hidden

### `06_intermediate_step_1.png`
- user intention: manage a card after ownership is established
- what the collector expects here: one clear next step, likely wall/show/share
- what the screen actually offers: hero, wall state, `View card`, `Remove from Wall`, `View wall`
- friction observed: strong manage surface, but it is several screens away from the original discovery moment
- premium feel score (1-10): 7
- trust/clarity score (1-10): 7
- does this move the collector forward cleanly? yes
- notes: this is where the product starts to feel intentional again

### `07_intermediate_step_2.png`
- user intention: configure wall/public settings and access exact-copy truth
- what the collector expects here: fast access to the exact copy
- what the screen actually offers: wall note, price display, copies lower on the page
- friction observed: the page asks for public presentation setup before it gives quick access to the owned copy
- premium feel score (1-10): 5
- trust/clarity score (1-10): 6
- does this move the collector forward cleanly? partially
- notes: useful controls, but the order is admin-first rather than collector-first

### `08_added_to_vault_state.png`
- user intention: confirm “this is my copy now”
- what the collector expects here: object truth, pricing, and obvious actions
- what the screen actually offers: exact-copy hero, market reference, manage/view actions, wall state
- friction observed: the screen itself is strong, but arriving here required too many context changes
- premium feel score (1-10): 8
- trust/clarity score (1-10): 8
- does this move the collector forward cleanly? yes
- notes: this is the clearest source-of-truth screen in the chain

### `09_manage_card_top.png`
- user intention: understand what can be done with the owned card immediately
- what the collector expects here: wall/show/share actions near the hero
- what the screen actually offers: exactly that, plus counts and card summary
- friction observed: the content is good, but it appears too late in the journey
- premium feel score (1-10): 7
- trust/clarity score (1-10): 7
- does this move the collector forward cleanly? yes
- notes: good proof that the product already knows the right actions, just not at the right moment

### `10_manage_card_mid.png`
- user intention: tune wall presentation and pricing
- what the collector expects here: only if they intentionally chose to manage the wall
- what the screen actually offers: wall category, note, price display
- friction observed: these controls are powerful, but they sit in the critical path before copy truth
- premium feel score (1-10): 5
- trust/clarity score (1-10): 6
- does this move the collector forward cleanly? partially
- notes: this is where the flow starts feeling like configuration instead of collecting

### `11_manage_card_bottom.png`
- user intention: inspect the actual owned copy
- what the collector expects here: copies should be easy to find
- what the screen actually offers: copies only after substantial scroll
- friction observed: the exact-copy jump is buried too low for something so central to ownership truth
- premium feel score (1-10): 4
- trust/clarity score (1-10): 5
- does this move the collector forward cleanly? no
- notes: the product forces the user through setup before identity

### `12_wall_entry.png`
- user intention: move from ownership into showcase
- what the collector expects here: a direct path to public wall state
- what the screen actually offers: `View wall` exists on Manage Card
- friction observed: the action exists, but only after passing through Vault and Manage Card
- premium feel score (1-10): 6
- trust/clarity score (1-10): 7
- does this move the collector forward cleanly? yes
- notes: this is buried value, not missing value

### `13_wall_state.png`
- user intention: see the final showcase result
- what the collector expects here: satisfying card-first wall presentation
- what the screen actually offers: good gallery-like wall, collector identity, share button, collection/in-play segmentation
- friction observed: the destination looks good, but the route into it is too indirect
- premium feel score (1-10): 8
- trust/clarity score (1-10): 8
- does this move the collector forward cleanly? yes
- notes: the wall is the most emotionally satisfying destination in the audited path

### `14_share_or_public_state.png`
- user intention: share or present the collection publicly
- what the collector expects here: a public/share affordance near the moment of deciding to show a card
- what the screen actually offers: share exists at wall header level
- friction observed: sharing is available, but late and detached from the original add/show intention
- premium feel score (1-10): 7
- trust/clarity score (1-10): 7
- does this move the collector forward cleanly? partially
- notes: good capability, weak timing

### `15_return_or_continue_flow.png`
- user intention: continue collecting or return naturally after exact-copy inspection
- what the collector expects here: a coherent continuation path back to search or forward to another add
- what the screen actually offers: a return into card detail mode
- friction observed: the flow changes mental models again instead of closing the loop cleanly
- premium feel score (1-10): 5
- trust/clarity score (1-10): 5
- does this move the collector forward cleanly? no
- notes: continuity is one of the biggest flow weaknesses in the current app

## Verified Action Availability
- search-level add to vault: not surfaced on the visible search result tile path; verified search grid shows compare toggle, not add-to-vault
- result-level quick action: compare exists; ownership action does not appear at result level
- manage-card path: exists; vault tile opens Manage Card, and the copies list opens private GVVI
- wall path: exists; Manage Card exposes `Add to Wall` / `Remove from Wall` and `View wall`
- public/share path: exists in parts; wall header has share, and private GVVI can expose `Open public page` and `Copy share link` when the copy is public-eligible
- parity gaps: direct add from search is missing, exact-copy access is too deep, and public/share timing is late relative to collector intent

## Collector-First Audit Summary

### What feels good
- The wall destination feels satisfying once reached.
- Manage Card has the right ownership verbs.
- Private GVVI now reads clearly as owned-copy truth.
- Card imagery is generally strong on search, wall, and exact-copy surfaces.

### What feels clunky
- Search discovery does not turn into ownership cleanly.
- Tapping a result opens preview instead of progress.
- The same collector intention gets broken into too many screens.
- Manage Card asks for wall configuration before putting the exact copy within easy reach.
- Continuity back out of exact-copy is weak and mode-shifting.

### What is missing
- Direct `Add to Vault` from search/result level
- A clear ownership action on the first result interaction
- A fast post-add handoff into exact-copy truth
- Earlier public/share framing at the point the collector decides to show or sell

### Biggest experience failures
1. No direct search-to-vault action
   - why it hurts: the collector cannot act at the moment of discovery
   - evidence screens: `02_search_results.png`, `03_result_selected.png`, `04_expected_add_to_vault_moment.png`
2. Result tap resolves to preview, not ownership
   - why it hurts: it breaks trust and changes the product from collecting to image viewing
   - evidence screens: `03_result_selected.png`, `04_expected_add_to_vault_moment.png`
3. Ownership requires too many context shifts
   - why it hurts: one intention gets split across Search, Vault, Manage Card, Copies, and Exact Copy
   - evidence screens: `05_actual_next_screen.png`, `06_intermediate_step_1.png`, `07_intermediate_step_2.png`, `08_added_to_vault_state.png`
4. Exact-copy truth is buried below wall configuration
   - why it hurts: the collector must wade through settings before reaching the object they actually own
   - evidence screens: `07_intermediate_step_2.png`, `10_manage_card_mid.png`, `11_manage_card_bottom.png`
5. Share/showcase actions arrive too late
   - why it hurts: the moment the collector wants to show or sell the card has already passed
   - evidence screens: `12_wall_entry.png`, `13_wall_state.png`, `14_share_or_public_state.png`

## Recommended Repair Plan

### P0 — Immediate high-value fixes
- problem: no direct add-to-vault path from search
  - proposed fix direction: add a real ownership CTA at result level and on first card detail entry
  - expected collector impact: removes the biggest dead-end in the product
  - implementation complexity guess: medium
  - requires backend change? no
- problem: result tap opens preview instead of action hub
  - proposed fix direction: route search result taps into a card-first detail/action surface, with preview demoted to secondary media behavior
  - expected collector impact: restores trust and momentum
  - implementation complexity guess: medium
  - requires backend change? no
- problem: exact-copy truth is too deep after ownership
  - proposed fix direction: after add, route straight into a compact ownership confirmation and then exact-copy/manage context
  - expected collector impact: makes ownership feel immediate and rewarding
  - implementation complexity guess: medium
  - requires backend change? no
- problem: wall/show decision is separated from discovery by too many screens
  - proposed fix direction: collapse add, own, and show into fewer transitions with a clearer post-add continuation step
  - expected collector impact: faster collector workflow and less cognitive reset
  - implementation complexity guess: medium
  - requires backend change? no

### P1 — Premium UX flow improvements
- problem: Manage Card is configuration-first in the middle of the journey
  - proposed fix direction: move exact-copy access higher and demote wall configuration until after identity is established
  - expected collector impact: makes the flow feel object-first instead of admin-first
  - implementation complexity guess: medium
  - requires backend change? no
- problem: public/share framing appears too late
  - proposed fix direction: surface public/show intent earlier once the card is owned and eligible
  - expected collector impact: better continuity from ownership into showcasing
  - implementation complexity guess: low
  - requires backend change? no
- problem: continuity after exact-copy inspection is weak
  - proposed fix direction: add clearer return/continue affordances back to search, vault, or repeat-add behavior
  - expected collector impact: better loop completion and less navigation fatigue
  - implementation complexity guess: low
  - requires backend change? no

### P2 — Collector delight / polish
- problem: result-level affordances are visually ambiguous
  - proposed fix direction: make compare and ownership visually distinct and intention-specific
  - expected collector impact: stronger confidence at a glance
  - implementation complexity guess: low
  - requires backend change? no
- problem: the flow feels segmented into modes rather than one collector journey
  - proposed fix direction: unify transitions, success moments, and card continuity across search, add, manage, and wall
  - expected collector impact: more premium, destination-like product feel
  - implementation complexity guess: medium
  - requires backend change? no
