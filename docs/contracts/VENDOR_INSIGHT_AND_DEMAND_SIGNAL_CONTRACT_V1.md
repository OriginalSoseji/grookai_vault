# VENDOR_INSIGHT_AND_DEMAND_SIGNAL_CONTRACT_V1

**Status:** ACTIVE  
**Type:** System Contract  
**Scope:** Defines how Grookai Vault captures, interprets, and surfaces collector demand, supply, and interaction signals for founder analytics and future vendor intelligence.

---

# 1. PURPOSE

This contract defines the canonical system rules for collecting and interpreting the market-intent data Grookai generates through real collector behavior.

Its purpose is to allow Grookai to begin gathering vendor-relevant insight from day one, even before vendor-facing products are fully launched.

This system exists so Grookai can truthfully say:

- we gather data other apps do not gather
- we learn from real collector behavior
- the more the platform is used, the stronger the insight becomes

This is not a generic analytics contract.

This contract exists to transform collector interaction into useful market intelligence.

---

# 2. PRODUCT TRUTH

Grookai is not trying to guess what the market wants from scraped noise alone.

Grookai is building a signal network from:

- what collectors want
- what collectors open
- what collectors save
- what collectors share
- what collectors add to their vault
- what collectors comment on
- what collectors try to act on

This means Grookai's vendor intelligence is not based only on price or listings.

It is based on:

**real collector intent and interaction**

That is the core strategic advantage.

---

# 3. WHY THIS CONTRACT EXISTS

If Grookai waits too long to define market-intent signals, it loses the most important data:

- early demand signals
- early collector interest patterns
- set momentum
- card-level desire
- demand versus ownership gaps
- repeat engagement around specific cards

This contract ensures those signals are treated as intentional system assets rather than accidental byproducts of app usage.

It also ensures future vendor insight surfaces are built from governed truth, not vague analytics drift.

---

# 4. CORE MODEL

Grookai vendor insight is built from three layers:

## 4.1 Intent Layer
What collectors explicitly say they want to do with a card.

Examples:
- Want
- Trade
- Sell
- Showcase

## 4.2 Interaction Layer
What collectors actually do with a card.

Examples:
- feed impression
- open detail
- share
- add to vault
- comments
- future trade actions

## 4.3 Supply Layer
What Grookai knows exists in collector ownership and availability.

Examples:
- vault ownership
- future public trade availability
- future public sale availability
- public Wanted surfaces

These three layers must remain conceptually distinct.

Demand is not the same as ownership.  
Ownership is not the same as intent.  
Interaction is not the same as supply.

---

# 5. CANONICAL ANCHOR RULE

All vendor insight governed by this contract must anchor to canonical Grookai card identity through:

- `card_print_id`

Vendor intelligence must not be built primarily from:

- raw external listing IDs
- text-only card names
- social-post objects
- user profiles without card anchors
- generic engagement counts

This system is card-first.

---

# 6. WHAT COUNTS AS A SIGNAL

A signal is any governed event or state that provides evidence of market interest, supply, or interaction around a canonical card.

Signals must be:

- attributable to a card
- durable or reconstructable
- truthful
- explainable
- useful in aggregate

Signals may be:

- explicit
- behavioral
- supply-based

---

# 7. EXPLICIT DEMAND SIGNALS

The strongest explicit demand signal in V1 is:

- `Want`

A collector marking a card as wanted is a first-class demand signal.

In future versions, other explicit signals may include:

- Trade intent
- Sell interest
- Showcase preference
- quantity wanted
- price target

V1 begins with Want as the core explicit demand signal.

---

# 8. BEHAVIORAL DEMAND SIGNALS

Behavioral signals indicate interest without requiring the user to explicitly state it.

Examples include:

- repeated card opens
- card shares
- add-to-vault actions
- repeat feed interaction
- card-anchored comments
- repeated search/query behavior
- future trade-click flows

Behavioral signals are meaningful but weaker than explicit intent unless repeated or reinforced.

---

# 9. SUPPLY SIGNALS

Supply signals represent what cards users actually hold or may make available.

Examples include:

- vault ownership
- ownership count over time
- future public trade availability
- future public sale availability
- future public showcase availability

Supply must be treated separately from demand.

A highly owned card is not automatically a highly desired card.  
A highly desired card is not automatically available.

Vendor insight becomes useful when Grookai can compare these two truths.

---

# 10. SIGNAL STRENGTH HIERARCHY

Signals must not be treated as equal.

V1 ranking principle:

## Strongest explicit demand
- Want

## Strong behavioral interest
- add to vault
- share
- repeated open detail
- card-anchored comment with action language

## Passive exposure / weak behavioral evidence
- impression
- single open with no repeat
- generic low-context interaction

## Supply evidence
- ownership
- future public availability states

This hierarchy guides aggregation and interpretation.

---

# 11. COMMENT SIGNAL RULE

Comments are allowed to contribute to market insight only when they are:

- card-anchored
- contextual
- action-relevant

Examples:
- "Trade?"
- "Need this for my binder"
- "Open to selling?"
- "Looking for one in NM"

Generic chatter must not be promoted into strong market signals.

Comments are supporting evidence, not primary truth, unless future systems explicitly classify them.

---

# 12. V1 INSIGHT CATEGORIES

Grookai must be able to derive at least the following insight categories from its signals.

## 12.1 Demand
Examples:
- most wanted cards
- rising wanted cards
- sets with growing Want density

## 12.2 Interaction
Examples:
- most opened cards
- most shared cards
- most discussed cards
- cards with growing feed engagement

## 12.3 Supply
Examples:
- most owned cards
- public availability counts (future)
- cards with high ownership concentration

## 12.4 Opportunity
Examples:
- high Want / low ownership cards
- high opens / low public supply cards
- rising set attention
- cards with repeated interest but weak supply

Opportunity is where Grookai becomes especially useful for vendors.

---

# 13. FOUNDER PAGE RULE

The founder page is the first internal proving surface for this intelligence system.

Before vendor-facing dashboards exist, Grookai may surface these insights on the founder page so the founder can:

- validate signal quality
- evaluate whether vendor interest is credible
- identify hot cards and sets
- demonstrate platform potential at card shows
- refine future vendor-facing insight products

The founder page is therefore an internal truth surface, not marketing fluff.

---

# 14. V1 FOUNDER INSIGHTS

V1 should aim to support founder-facing views such as:

- top wanted cards
- top opened cards
- top shared cards
- top added-to-vault cards
- rising demand cards
- high Want / low ownership cards
- set momentum
- collector attention trends

These insights may begin with simple daily or rolling windows.

V1 does not require a complex BI system.

---

# 15. TIME WINDOWS

Signals should be interpretable over time.

V1 should conceptually support windows such as:

- today
- last 7 days
- last 30 days

Future versions may support:
- rolling hourly views
- city/event windows
- card-show windows
- region-specific demand slices

Time matters because demand is dynamic.

---

# 16. AGGREGATION RULE

Vendor insight should be built from aggregated signals, not from raw anecdotal events.

This means Grookai should prefer:

- counts
- rolling windows
- deltas
- trends
- ranked lists
- demand/supply comparisons

over:

- isolated one-off actions
- vanity metrics
- generic page analytics

---

# 17. NOISE CONTROL RULE

Not every action should count as strong demand.

Grookai must avoid overvaluing:

- single passive impressions
- weak chatter
- one-off curiosity clicks
- generic social behavior
- repeated exposures without reinforcing action

The system should reward:

- repeated interest
- explicit Want
- conversion-like actions
- card-specific action language
- demand that persists across time

---

# 18. VENDOR TRUTH RULE

Grookai must be able to explain vendor insights in plain language.

The founder should be able to say things like:

- "These are the cards users explicitly want most."
- "These are the cards getting opened repeatedly."
- "These are the cards with strong demand but low ownership."
- "This set is gaining attention this week."

The system must not produce vendor claims it cannot truthfully defend.

---

# 19. PRIVACY RULE

Vendor intelligence is built from aggregate behavior, not from exposing private user intent indiscriminately.

Private collector actions may contribute to aggregate market intelligence, but they must not automatically become public individual disclosures.

This distinction is critical.

Grookai may learn from private behavior.  
Grookai must not leak private behavior.

---

# 20. FOUNDER DEMO RULE

This system is allowed to serve an early founder demo purpose.

It is valid for the founder to use these insights at card shows or in vendor conversations to demonstrate:

- that Grookai captures demand others miss
- that collector behavior can generate useful vendor insight
- that the value of the system compounds as usage increases

However, the founder must not exaggerate confidence beyond what the signal quality supports.

---

# 21. WHAT V1 EXPLICITLY DOES NOT REQUIRE

V1 does **not** require:

- a public vendor dashboard
- regional geospatial demand heatmaps
- marketplace order history
- advanced NLP on comments
- AI classification of every comment
- enterprise reporting
- event-level city segmentation
- a full analytics warehouse
- manual vendor tooling

V1 is allowed to begin with simple, truthful, compounding insight.

---

# 22. SIGNAL SOURCE SURFACES

This contract expects Grookai's signal sources to include, over time:

- `user_card_intents`
- `card_feed_events`
- `card_comments`
- vault ownership
- future public availability systems
- future trade/sale systems

These sources must remain explainable and card-anchored.

---

# 23. ANTI-DRIFT RULE

This system must not drift into generic analytics vanity.

It exists to answer questions like:

- what do collectors want?
- what are they repeatedly looking at?
- what is getting saved, shared, or added?
- what has demand but not enough supply?
- what should a vendor bring or stock?

If a metric does not help answer vendor-relevant or founder-relevant card questions, it should not dominate this system.

---

# 24. FUTURE EVOLUTION

## V1
- founder-facing insight only
- explicit Want as core demand signal
- behavioral demand signals
- supply comparison foundations
- simple ranked outputs
- honest trend windows

## V2
May add:
- vendor-facing dashboard surfaces
- stronger demand/supply gap models
- public trade/sale supply insight
- event/show specific views
- region-aware insight

## V3+
May add:
- richer signal weighting
- comment classification
- demand quality scoring
- predictive reorder or vendor opportunity models
- multi-TCG insight layers

Future versions must extend this contract rather than replace it.

---

# 25. FINAL PRINCIPLE

Grookai's vendor intelligence advantage is not that it has more listings.

Its advantage is that it captures:

**real collector intent + real collector interaction + real collector ownership**

and turns that into useful market signal.

The more Grookai is used, the stronger this insight becomes.

That compounding signal is the product advantage this contract protects.

END OF FILE
