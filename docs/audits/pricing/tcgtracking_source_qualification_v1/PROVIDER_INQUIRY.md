# Prepared TCGTracking inquiry — not sent

Superseded by the owner's November 17 instruction to use the intentionally
published API without a separate permission request unless an applicable
restriction is explicit. Retained as historical draft only; sending it is not
required or authorized. See [V2](../../../contracts/TCGTRACKING_CONDITION_PRICING_V2.md).

Intended route: [TCGTracking contact form](https://tcgtracking.com/contact.php).
Subject: Open TCG API usage and SKU price currency for grookai

Hi,

We're building grookai, a trading-card collection application, and evaluating
your free Open TCG API's SKU condition market prices. We'd like to confirm these
points before making the integration available to collectors:

1. May grookai cache the SKU feed and display individual condition prices in its
   free and paid web/mobile features, including collection valuation? We would
   identify TCGTracking as the source and would not offer the raw dataset or a
   competing bulk-data API. Please share any usage, attribution, retention or
   request-rate requirements that apply.
2. Is every SKU `mkt` amount in USD, across all game categories and language codes,
   including Japanese Pokemon? Can you link a published currency definition?
3. Does `mkt` represent the exact TCGplayer SKU Market Price for that product,
   printing, language and condition, without your own modeled adjustment? How
   should consumers treat null/zero amounts, and is `updated` a set publication
   timestamp or an observation time for every SKU?
4. Your documentation recommends daily fetching and local caching. Are there
   additional requirements or downstream-source restrictions relevant to this
   display use?

Thanks.

---

This is reviewable draft text only. No message has been submitted, no new account
has been created, and no provider terms have been accepted. A provider response
must be retained as evidence and evaluated for its actual scope before changing
grookai's qualification state.
