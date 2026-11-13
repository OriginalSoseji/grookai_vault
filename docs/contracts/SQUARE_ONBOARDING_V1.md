# Square onboarding V1

Status: active implementation; self-service release control defaults off.
Owner direction November12,2026: fix new-user Square sign-in on both website
and Samsung before continuing the pricing/label follow-up.

An eligible active vendor starts from Sell with Square in their own grookai
account. No developer account or operator allowlist edit is part of signup.
The authenticated no-owner-argument enrollment RPC grants only that actor
integration access. It neither connects a merchant nor changes offers, prices,
stock, allocations or sales. Eligibility uses the existing effective entitlement
authority. Existing explicitly authorized canary accounts remain supported.

Self-service enrollment has a separate default-off revision/CAS release control
and immutable control history. A grant is unique per owner and records its
control revision and time. Only the shared service authority can change release
controls. Anonymous users, collectors, inactive vendors and service-role sessions
without an authenticated actor cannot self-enroll. Private tables and helper
functions have no client/service direct access.

Existing global catalog and commerce controls continue gating their lanes.
Persisted integration grants remain usable after onboarding is paused or a
plan changes: established merchant credentials and settlement/reconciliation
must remain recoverable. The unchanged per-copy vendor/public-offer/price/
printing authorities still reprove eligibility before publishing any stock.
No permission or pause releases an unresolved external physical-stock claim.

OAuth retains single-use hashed state, browser binding, pre-exchange consumption,
encrypted server credentials, immutable merchant binding and uncertain-exchange
recovery. A server-derived encrypted launch return hint distinguishes native
from website. A short-lived HttpOnly routing cookie preserves only that fixed
choice after cancellation/expiry; it establishes no identity or success and
cannot select an external URL. Codes, state, provider errors, credentials and
capabilities never enter the final return URL or logs.

The native return page attempts the fixed app scheme and offers an Open app
fallback. Website consent returns to the signed-in connection page. The app
refreshes authenticated workspace state, including returns received while a
launch or refresh is busy; deep links never prove connection success.

Locations load automatically. One active USD location can be preselected as a
draft; multiple locations require a choice. Empty/failed reads offer recovery
without reconnecting. Opening a page, selecting a location or returning from
OAuth cannot save configuration or publish inventory.

Enable automatic Square sales is the explicit confirmation for current/future
eligible public For sale cards and their exclusive Square allocation. Its copy
explains the reservation and private-card boundary. Existing configure and
preferences authorities execute in sequence; failures are not advertised as
atomic success. Background sync readiness remains distinct from setup success.
Existing sellers keep saved preferences. Reconnect, pause, disconnect and manual
catalog selection remain available under secondary settings/details.

Release requires pinned494-to495 AuditLinkedSchema and PrePush, genuine fresh
CLI replay, retained/no-op upgrade with unchanged pre-existing rows, exact
schema/security comparison, actual local Auth isolation/concurrency checks,
website desktop/phone interactions, native lifecycle/widget checks, normal
hooks/hosted review, and live website/Samsung readback. Local provider fixtures
are identified explicitly and cannot qualify a real Square sale. Existing live
stock, the owner's genuine sale, paused pricing and outstanding physical-label
acceptance remain protected. New self-service activation is a separate audited
control operation after source, schema and deployment qualification.
