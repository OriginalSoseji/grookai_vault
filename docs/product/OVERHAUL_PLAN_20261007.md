# Grookai product overhaul

October 7, 2026. Proposed target experience and implementation sequence following the DeckTradr review. This document expands the tactical BUILD_PLAN.md into a complete product direction. It does not claim implementation or deployment has occurred.

## Product objective

Make Grookai the easiest place to understand the card you own, build the collection you want, and complete a trustworthy deal involving that exact copy.

Use DeckTradr as a concrete workflow benchmark. Match its useful task coverage and clarity, then demonstrate a measurable advantage in deal completion, identity correctness, recovery and collecting collaboration. Those advantages must be proven; the audit did not establish that its backend lacks these qualities.

The overhaul covers navigation, visual hierarchy, onboarding, scanning handoff, card research, inventory, collecting goals, selling, reporting, storefronts and public positioning. Preserve the existing identity, ownership and transaction foundations. Extend those foundations where data is genuinely missing, especially historical valuation and event economics.

## One account, two workspaces

Recommended primary navigation:

| Collector workspace | Vendor workspace |
|---|---|
| Vault | Desk |
| Explore | Inventory |
| Scan | Scan |
| Binders | Reports |
| Community | Store |

The visible workspace changes navigation and defaults, never ownership, permissions or publication. A person can use both. Account controls and a clear workspace switch remain consistently placed. Existing links continue to resolve.

Explore includes search, sets, Dex and card research. Community provides the understandable entry to Pulse, Wall and Nearby. Advanced tools remain accessible inside the appropriate workflow rather than competing for top-level navigation. Migration must preserve the functionality and existing destinations of these tools.

Vendor Desk is the working landing screen: Buy, Sell, Trade, held deals and current deal. Scan supports clearly chosen camera identification or label input, with review before inventory mutation. Store includes customer-facing catalog, sharing and store administration; receipt and order access remains available when appropriate even if selling access changes.

## Target journeys

### First session

Choose collecting, selling or both, with a skip path. Offer import, scan or find a card immediately. Use short contextual setup as needed. Explain what saved, what needs review and what to do next. Preserve the destination through sign-in and entitlement steps. Do not require completing a store or social profile to start a collection.

Success means useful inventory or a meaningful collecting goal in the first session, not finishing an onboarding carousel.

### Identify and add

Scan or search → confirm exact printing → condition/raw or slab details → quantity and optional known cost → choose destination/intent → save → continue.

Keep repeated safe preferences available, while requiring review when identity or condition changes. A compact result sheet should make uncertainty visible without exposing implementation vocabulary. A wrong match is easy to correct. No double additions after retries. Batch progress and unresolved entries remain recoverable.

### Research a card

Show identity, artwork and printing first. Keep raw condition and slab grade distinct. Present a price with its source, observation date and limitations. Provide supported history and sold evidence where available. Group Add, Watch, Buy offer and Sell by workspace and current ownership.

Separate catalog-level information from a particular owned copy's condition, cost, photos, asking price and history. Never overwrite negotiated prices when market references refresh. Preserve private cost when presenting a customer view.

### Manage inventory

Use compact, readable rows and an optional image grid. Search and primary actions remain close to the list. Show useful identity, condition, price and status before secondary administration. Group duplicate catalog items for browsing while allowing explicit selection of the physical copy needed for a deal.

Provide filters and guided actions for unpriced stock, missing cost, unresolved printing, sealed qualification, listed stock and unavailable stock. Bulk actions must clearly identify their scope and preserve per-copy exceptions. Label and listing actions reuse existing authorities.

### Make a deal

Desk → choose Buy, Sell or Trade → scan/search stock or catalog → review item values → negotiate → hold or review → record supported payment methods → complete once → receipt and inventory result.

Keep one persistent deal while users inspect references or add items. Reuse current trade, held-deal, split-payment and recovery behavior. Introduce optional buy presets only where absent. Make customer view deliberate and free of private notes/cost. A network interruption must produce a recoverable state, not an invitation to create a second transaction.

Integrated charging is a separate provider capability; the interface must describe external payment recording accurately.

### Close a show

Choose an event, review deals, enter event expenses, inspect missing cost and reconcile results. Present revenue, cash movements and known-cost profit separately. Show unknown-cost coverage beside profit. Extend the existing receipt ledger rather than maintaining another inventory or sale history.

### Keep collecting

Vault shows useful value and coverage. Binders show progress and the next missing items. History separates market change from additions and removals. Supported opt-in alerts provide a reason to return. Community connects collection goals to people without placing social setup in the path of basic inventory tasks.

Collaborative binders should demonstrate contribution while ownership remains with each collector, once current release gates are verified.

### Sell through a store

Make the route from inventory to explicit listing to a visitor's purchase or inquiry understandable. Show only currently supported checkout and fulfillment states. Finish existing commerce work and validate buyer/seller recovery before adding more providers. Customer-session queues and collector/vendor matching are later extensions once inventory and commerce are dependable.

## Visual and interaction system

Create a single design specification implemented through shared Flutter and web tokens/components: typography, spacing, color, buttons, fields, price presentation, status labels, cards, rows, sheets and charts. Retain recognizable Grookai identity; develop original layouts rather than copying competitor artwork.

Use compact operational layouts for vendors and image-oriented discovery for collectors. Keep action placement predictable. Remove repeated introductory blocks above working content. Distinguish loading, empty, unavailable, error and needs-review states. Each state should answer what happened and what the user can do.

Support readable contrast, large text, keyboard navigation on desktop, accessible tap alternatives, thumb-friendly mobile controls and visible input errors. Test phone, tablet and desktop as layouts of the same workflow, not isolated feature lists.

## Implementation sequence

| Release | Scope | Exit evidence |
|---|---|---|
| Foundation | Current platform/release inventory; six reference screens; shared component specification; task baselines | Source and device versions known; complete prototype of a vendor deal and collector add flow; reuse boundaries mapped |
| 1: Daily work | Workspace navigation, compact inventory, card/detail hierarchy, existing QR-to-desk work, review/receipt continuity | A real device completes the designated test deal and recovers an interruption; existing drafts and ownership preserved |
| 2: Decisions and economics | Price evidence, valuation repair, cost completeness, buy presets where needed, events/expenses/profit | Reconciled fixtures cover missing cost, trades, discounts and split methods; users can explain displayed amounts |
| 3: Collecting and return use | Vault redesign, portfolio history, binder continuation, alerts, verified collaboration | Import/holding changes do not masquerade as gains; alert identity/cadence correct; collector tasks work without coaching |
| 4: Distribution and expansion | Import/export polish, store journey, existing checkout completion, truthful public product pages | Verified migration and supported export; accurate platform availability; buyer/seller lifecycle proof for released commerce |

Do not hold all improvements for one large release. Each release can be subdivided into deployable slices, but a redesigned entry must lead into a working downstream flow. Start recording qualified historical snapshots early enough to support Release 3; a chart cannot conjure a month of trustworthy history on release day.

Work in isolated changes from current main. Inspect active worktrees and external checkpoints before touching overlapping scanner, import, receipt or payment work. Preserve real inventory and pending import/deal requests. Integrate compatible changes regularly; do not replace canonical data or reset existing accounts to suit the redesign.

Dates require a capacity and dependency check. The immediate deliverable is a reference prototype plus an implementation-ready first slice; provider activation and accumulated history have independent dependencies. Do not promise a finished overhaul in 72 hours.

## First implementation packet

1. Pin current web, Android and iOS release states; inspect the active QR/scanner work.
2. Produce six linked reference screens: collector Vault, Explore/card research, Scan review, vendor Desk, compact Inventory, event Report. Include populated, empty and needs-review examples using non-personal sample data.
3. Map each action to the existing route, service and data authority. Mark genuinely missing data separately from presentation changes.
4. Implement workspace navigation and one shared inventory/card row, then wire the current desk and QR input through to the existing receipt result.
5. Verify the vertical slice on the Samsung and current web surface; obtain equivalent iOS proof through the existing release workflow.
6. Measure task completion and fix observed friction before widening the redesign.

This is the first code scope. It deliberately avoids launching a second POS, importer, label system or checkout implementation.

## What beating DeckTradr means

| Dimension | Comparative test | Success condition |
|---|---|---|
| First value | Same new-user import/add task | Users finish without coaching and can reconcile saved/reviewed items |
| Deal speed | Same mixed ten-card deal, same device where possible | Faster median task completion without increased wrong-copy or pricing errors |
| Identity correctness | Ground-truthed difficult printings and variants | Correct selection or useful abstention; no gain in speed through silent misidentification |
| Financial clarity | Same cost-known/cost-unknown event scenarios | Users correctly distinguish sales, payments and known-cost profit |
| Recovery | Disconnect/reopen during designated test operations | No duplicated copies or completed deals; clear recovery state |
| Collecting utility | Resume a goal and find the next missing card | Successful uncoached progress and evidence of repeat use |
| Trust and portability | Inspect a price, export/import supported records | Explainable evidence and reconciled data retention |

These are proposed acceptance dimensions, not claims that Grookai currently wins. Establish the measured DeckTradr baseline first; camera accuracy remains untested from the audit. Initial usability sessions are exploratory and must not be presented as statistically conclusive.

## Investment boundaries

Finish the core workflow before broad AI grading, many new games, universal marketplace sync or additional peripheral integrations. Existing provider/release work can continue without being duplicated. Reorder expansion only when target users demonstrate a stronger need.

The durable product promise is a coherent experience that connects understanding a card, owning it, collecting toward a goal and completing a deal. Feature count alone is not the acceptance criterion.
