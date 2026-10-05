# Direct account receipt delivery

Direct delivery uses an existing authenticated owner's saved receipt. It does not
create a sale, confirm payment, change inventory, enroll marketing contacts, or
include private CRM wants/notes. Device-only books keep Share/draft behavior.

The owner confirms the recipient and that the customer requested this receipt.
The API validates authentication and request origin; database RPCs recheck receipt
ownership. Clients cannot supply message content, a vendor ID, provider URL,
provider status or provider credentials. Email and SMS require separate database
switches plus configured server credentials. Both switches default off.

Requests serialize on the owner's receipt book. A receipt/channel/destination has
one durable delivery; repeated clicks and concurrent devices reuse it. Reusing a
recorded request ID with different content fails. Quotas are 100 new destinations
per owner/hour and 500/day. Privileged claims allow one provider attempt. There is
no automatic retry after claiming: loss of a response, process death or ambiguous
provider failure remains uncertain. A sending claim older than two minutes is
displayed as uncertain and never becomes claimable again. This favors duplicate
prevention over automatic recovery. Explicit resend/reconciliation is future work;
Share/draft remains available for a vendor-arranged fallback.

Statuses distinguish queued, sending, provider accepted, delivered, failed and
uncertain. Accepted is not proof of delivery. The owner's Check delivery status
action polls known provider IDs with a per-record 30-second throttle. Provider ID,
account and recipient must match before settlement. Terminal state does not
regress. There are no webhook endpoints or automatic background sending jobs in V1.

Resend sends one HTML/text email; Twilio sends a complete text receipt through a
configured Messaging Service. SMS receipts over 1600 characters are rejected,
never truncated; use email or Share. Sender setup and any carrier requirements
are separate from this implementation. Provider keys stay server-only.

Local staging blocks the default outbound transport; tests inject mocks. The
receipt proof flag accepts only loopback API32701 (combined429 lab; earlier65401 proof is historical) and cannot combine with other
proof modes or appear in a production build. Required proof includes actual local
Auth/RPC ownership/claim concurrency, clean migration replay, retained-data upgrade,
and desktop/phone DOM checks. Mock provider acceptance is not actual delivery proof.

References: [Resend send](https://resend.com/docs/api-reference/emails/send-email),
[Resend retrieval](https://resend.com/docs/api-reference/emails/retrieve-email),
[Resend idempotency](https://resend.com/changelog/idempotency-keys),
[Twilio messages](https://www.twilio.com/docs/messaging/api/message-resource).

Rollback disables the two database switches and server enable flag. Retain
delivery and receipt records. Do not release claims or blindly retry uncertain
messages. Sending and delivery status never establish Grookai-processed payment.
