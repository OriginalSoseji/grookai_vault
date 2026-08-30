# Founder Notifications In-App V1

## Purpose

Founder operations alerts must remain visible after a push notification is dismissed. The app presents the existing append-only operations alert ledger in Pulse and in a permanent founder inbox.

## Authority And Privacy

- `operations_notification_events` remains the source event ledger and is never updated by the inbox.
- Only users with an active `founder` entitlement may call the inbox RPCs.
- The viewer cursor table is private, RLS protected, and inaccessible as an app-facing table.
- Collector and anonymous clients cannot read founder alerts.
- Pulse uses a private founder projection. Alerts never enter public collector `card_events`.

## Product Contract

- Pulse shows a concise founder-only alert section and includes unread alerts in its badge.
- Account provides a permanent Founder Notifications destination.
- The inbox preserves the latest operational history, action/update filters, source metadata, unit state, journal evidence, and commit SHA.
- Push taps route to the exact notification in the mobile or web founder inbox.
- Opening Pulse or the inbox advances a monotonic per-founder seen cursor. It never deletes or mutates source alerts.
- Inbox failure cannot block the collector Pulse feed.

## Invariants

- Alert history is append-only.
- Seen state can only advance.
- Founder access is authorized by the database, not by client presentation hints.
- No service-role credential is shipped to a client.
- No internal operations evidence is exposed on public routes.
