SEARCH_TO_VAULT_TO_WALL_FLOW_REVIEW_V1

Objective

Review the current mobile flow from search -> card -> vault -> wall -> sale intent.

Recording
• raw file: /Users/cesarcabral/grookai_vault/temp/recordings/search_to_vault_to_wall_raw.mp4
• final file: /Users/cesarcabral/grookai_vault/temp/recordings/search_to_vault_to_wall_raw.mp4
• final duration: 27.72s

Flow Steps Observed
1. App opened into `My Wall`.
2. Entered `Explore`.
3. Opened a card from the Explore surface.
4. The card opened as a large image preview modal, not a card-first action/detail surface.
5. The flow stopped there because no real `Add to Vault` path was surfaced from that entry.

Friction Points
• The next step is not obvious from Explore. The user sees cards, but not a clear ownership action.
• Opening a card lands in an image preview modal, which feels like zoom/media, not progress toward owning or selling.
• The flow breaks before vault creation. `Add to Vault` is not presented on the path that starts from Explore.
• Screen purpose is muddled: Explore mixes browse, sets, compare, and image preview without a dominant ownership action.
• Because ownership never starts, the user cannot naturally continue into Wall or sale intent from this path.

Screen Intention Review

Search
• It does not feel intentional enough for an ownership flow. Explore feels like browsing first, not collecting first.
• The result is not obvious as an action surface. Cards read as media objects more than actionable inventory candidates.

Card Detail
• The next action is not obvious from the Explore entry path because the tap resolves to preview instead of an action hub.
• It does not feel like a card-first action hub on this path; it feels like a zoomed image state.

Vault / Manage / GVVI
• Owned-copy truth is not reached from the recorded flow, which is the key problem. The ownership path is disconnected from Explore.
• Wall/sell action therefore feels buried by architecture, because the user never gets a natural handoff into the owned-copy flow.

Wall
• The final result was not reached in the recorded flow.
• The flow does not currently resolve into a satisfying “now it is on my wall for sale” moment from Explore.

Recommendations
• 1. Make Explore card tap open a real card detail / action hub instead of an image preview modal.
• 2. Surface a clear `Add to Vault` action directly from Explore results or the first card detail screen.
• 3. Reserve prominent add-style affordances for ownership, not compare/discovery side actions.
• 4. After adding a card, route directly into the owned-copy / manage / wall flow instead of forcing a context switch.
• 5. Tighten screen intention so each surface answers one obvious question: browse, own, manage, or sell.
