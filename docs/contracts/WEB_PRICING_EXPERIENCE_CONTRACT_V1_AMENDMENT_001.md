# WEB_PRICING_EXPERIENCE_CONTRACT_V1_AMENDMENT_001

Status: ACTIVE  
Type: Contract Amendment  
Scope: Pricing visibility rules for web surfaces  
Parent Contract: WEB_PRICING_EXPERIENCE_CONTRACT_V1  
Authority: Subordinate to PRICING_UI_CONTRACT_V1 and JUSTTCG_DISPLAY_CONTRACT_V1

---

## 1. Purpose

This amendment introduces an account-gating rule for pricing on web surfaces.

It overrides any previous assumption that pricing may be shown on public web surfaces.

It exists to:

- reduce compliance risk
- improve product clarity
- create user-value gating

---

## 2. Amendment Scope

This amendment affects:

- Public Web Surface behavior
- Pricing visibility rules

This amendment does not affect:

- pricing logic
- data pipelines
- authenticated UI behavior except for visibility gating

---

## 3. New Rule: Pricing Visibility Gate (LOCKED)

Pricing data MUST NOT be rendered on public unauthenticated web surfaces.

Pricing data MAY ONLY be rendered when:

- user is authenticated

This applies to:

- JustTCG prices
- eBay fallback prices
- Grookai Value
- any derived pricing
- any pricing ranges

---

## 4. Public Web Behavior (UPDATED)

This section overrides previous public-web pricing visibility assumptions.

Public card page MUST:

- NOT display any numeric pricing values
- NOT display ranges
- NOT display fallback pricing
- NOT display Grookai Value
- NOT display pricing comparisons

Public card page MUST instead display:

### Pricing Locked State Component

Content:

Header:

- `Pricing`

Body:

- `Sign in or create an account to view reference pricing and market context.`

Actions:

- `Sign in`
- `Create account`

Optional support text:

- `Pricing available for registered collectors`

---

## 5. Authenticated Web Behavior (CONFIRMED)

Authenticated behavior remains governed by:

- `PRICING_UI_CONTRACT_V1`
- `WEB_PRICING_EXPERIENCE_CONTRACT_V1`

Once authenticated:

- pricing becomes visible
- full pricing UI rules apply
- source hierarchy remains enforced

---

## 6. Component Contract: PricingGate

Define a new UI component:

### `PricingGate`

Props:

- `isAuthenticated` (`boolean`)

Behavior:

IF `isAuthenticated = false`:

- render Locked State UI

IF `isAuthenticated = true`:

- render full pricing system

---

## 7. UX / Product Rules

- Pricing must feel like a member feature, not a public commodity
- Public pages must not feel broken; they must feel intentionally gated
- Messaging must be clear, not misleading
- Do not imply missing data; imply restricted access

---

## 8. Prohibited Patterns (UPDATED)

The following are NOT allowed on public web:

- partial pricing exposure
- blurred or obfuscated prices
- teaser numbers
- sample pricing
- showing eBay while hiding JustTCG
- showing any real pricing values

---

## 9. Interaction Flow

Public user:

- lands on card page
- sees card identity
- sees pricing locked state
- is prompted to sign in or create account

Authenticated user:

- lands on card page
- sees full pricing UI immediately

---

## 10. Final Invariants

- Pricing is an authenticated-only feature on web
- No pricing values appear for anonymous users
- No fallback sources are exposed publicly
- No derived pricing appears publicly
- Authenticated experience remains unchanged and contract-governed

---

## 11. Result

This amendment ensures:

- compliance risk is reduced
- UI clarity is improved
- product value is gated behind account creation
- pricing system remains controlled and extensible
