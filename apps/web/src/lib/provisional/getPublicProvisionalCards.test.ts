import test from "node:test";
import assert from "node:assert/strict";

import { assertCanonicalCardRouteRow } from "@/lib/getPublicCardByGvId";
import { buildPublicProvisionalDetailModel } from "@/lib/provisional/buildPublicProvisionalDetailModel";
import {
  buildProvisionalContinuityRedirectHref,
  provisionalPromotionContinuityTestInternals,
  resolveProvisionalPromotionContinuity,
} from "@/lib/provisional/getProvisionalPromotionContinuity";
import {
  applyPromotionTransitionsToCanonicalRows,
  getPromotionTransitionState,
  suppressPromotedProvisionalRows,
} from "@/lib/provisional/getPromotionTransitionState";
import { recentlyConfirmedTestInternals } from "@/lib/provisional/getRecentlyConfirmedCanonicalCards";
import {
  isPublicProvisionalWarehouseRowEligible,
  safeImage,
  toPublicProvisionalCard,
  type PublicProvisionalWarehouseCandidateRow,
} from "@/lib/provisional/getPublicProvisionalCards";
import {
  getProvisionalDisplayLabel,
  PROVISIONAL_DETAIL_TRUST_COPY,
  PROVISIONAL_NOT_CANON_COPY,
  PROVISIONAL_SOURCE_COPY,
} from "@/lib/provisional/provisionalProductCopy";
import { shouldShowPromotionTransitionNote } from "@/lib/provisional/shouldShowPromotionTransitionNote";

const TEST_NOW = new Date("2026-04-22T12:00:00.000Z");
const RECENT_PROMOTED_AT = "2026-04-10T12:00:00.000Z";
const OLD_PROMOTED_AT = "2026-02-01T12:00:00.000Z";

function buildRow(
  overrides: Partial<PublicProvisionalWarehouseCandidateRow> = {},
): PublicProvisionalWarehouseCandidateRow {
  return {
    id: "candidate-1",
    state: "RAW",
    submission_intent: "MISSING_CARD",
    promoted_card_print_id: null,
    proposed_action_type: null,
    identity_audit_status: null,
    claimed_identity_payload: {
      name: "Pikachu",
      set_code: "sv01",
      printed_number: "025/198",
    },
    reference_hints_payload: {
      bridge_source: "external_discovery_bridge_v1",
    },
    created_at: "2026-04-21T00:00:00.000Z",
    ...overrides,
  };
}

test("warehouse row without display_name is not returned", () => {
  const card = toPublicProvisionalCard(
    buildRow({
      claimed_identity_payload: {
        set_code: "sv01",
        printed_number: "025/198",
      },
    }),
  );

  assert.equal(card, null);
});

test("state not allowed is excluded", () => {
  const card = toPublicProvisionalCard(buildRow({ state: "APPROVED_BY_FOUNDER" }));

  assert.equal(card, null);
});

test("alias row is not eligible", () => {
  assert.equal(
    isPublicProvisionalWarehouseRowEligible(
      buildRow({ identity_audit_status: "ALIAS" }),
    ),
    false,
  );
});

test("promoted row throws security error", () => {
  assert.throws(
    () =>
      isPublicProvisionalWarehouseRowEligible(
        buildRow({ promoted_card_print_id: "card-print-id" }),
      ),
    /SECURITY: Promoted row leaked into provisional adapter/,
  );
});

test("gv_id on provisional row throws security error", () => {
  assert.throws(
    () =>
      toPublicProvisionalCard({
        ...buildRow(),
        gv_id: "GV-PK-SV01-025",
      }),
    /SECURITY: GV-ID found on provisional row/,
  );
});

test("row with private image returns null image", () => {
  const row = buildRow({
    claimed_identity_payload: {
      name: "Pikachu",
      set_code: "sv01",
      printed_number: "025/198",
      image_url:
        "https://example.supabase.co/storage/v1/object/sign/founder-review/private.png?token=secret",
    },
  });

  assert.equal(safeImage(row), null);
});

test("attempt to route provisional row through canonical card route fails", () => {
  assert.throws(
    () => assertCanonicalCardRouteRow({ gv_id: null }, "candidate-1"),
    /SECURITY: Non-canonical entity attempted canonical route/,
  );
});

test("valid provisional row is returned without canonical identity fields and is frozen", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  assert.equal(card.candidate_id, "candidate-1");
  assert.equal(card.display_name, "Pikachu");
  assert.equal(card.set_hint, "sv01");
  assert.equal(card.number_hint, "025/198");
  assert.equal(card.provisional_label, "UNCONFIRMED");
  assert.equal("gv_id" in card, false);
  assert.equal(Object.isFrozen(card), true);
});

test("eligible provisional row builds detail model successfully", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  const model = buildPublicProvisionalDetailModel(card);

  assert.ok(model);
  assert.equal(model.display_name, "Pikachu");
  assert.equal(model.identity_line, "sv01 #025/198");
  assert.equal(model.href, "/provisional/candidate-1");
});

test("ineligible provisional row fails closed before detail model", () => {
  const card = toPublicProvisionalCard(buildRow({ identity_audit_status: "AMBIGUOUS" }));

  assert.equal(card, null);
});

test("provisional detail model never includes GV-ID", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  const model = buildPublicProvisionalDetailModel(card);

  assert.ok(model);
  assert.equal("gv_id" in model, false);
});

test("provisional detail model exposes no canonical actions", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  const model = buildPublicProvisionalDetailModel(card);

  assert.ok(model);
  assert.deepEqual(model.actions, {
    vault: false,
    pricing: false,
    ownership: false,
    provenance: false,
  });
  assert.equal("raw_price" in model, false);
  assert.equal("provenance" in model, false);
});

test("provisional helper copy stays within approved calm language", () => {
  const underReviewCard = toPublicProvisionalCard(buildRow({ state: "CLASSIFIED" }));
  const unconfirmedCard = toPublicProvisionalCard(buildRow({ state: "RAW" }));

  assert.ok(underReviewCard);
  assert.ok(unconfirmedCard);
  assert.equal(getProvisionalDisplayLabel(underReviewCard), "Under Review");
  assert.equal(getProvisionalDisplayLabel(unconfirmedCard), "Unconfirmed");
  assert.equal(PROVISIONAL_DETAIL_TRUST_COPY, "Visible while under review.");
  assert.equal(PROVISIONAL_NOT_CANON_COPY, "Not part of the canonical catalog yet.");
  assert.equal(PROVISIONAL_SOURCE_COPY, "Source available");
});

test("provisional detail route model never uses canonical card route", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  const model = buildPublicProvisionalDetailModel(card);

  assert.ok(model);
  assert.equal(model.href.startsWith("/provisional/"), true);
  assert.equal(model.href.startsWith("/card/"), false);
});

test("active eligible candidate resolves to provisional continuity", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  const outcome = resolveProvisionalPromotionContinuity({ candidate: card });

  assert.equal(outcome.kind, "provisional");
  if (outcome.kind === "provisional") {
    assert.equal(outcome.candidate.candidate_id, "candidate-1");
  }
});

test("promoted candidate with explicit canonical destination redirects", () => {
  const outcome = resolveProvisionalPromotionContinuity({
    promoted_card_print_id: "card-print-id",
    canonical_gv_id: "GV-PK-SV01-025",
  });

  assert.deepEqual(outcome, {
    kind: "redirect",
    gv_id: "GV-PK-SV01-025",
  });
});

test("promoted candidate with missing canonical GV-ID returns not found", () => {
  const outcome = resolveProvisionalPromotionContinuity({
    promoted_card_print_id: "card-print-id",
    canonical_gv_id: null,
  });

  assert.deepEqual(outcome, { kind: "not_found" });
});

test("invalid or ineligible candidate without canonical destination returns not found", () => {
  const outcome = resolveProvisionalPromotionContinuity({});

  assert.deepEqual(outcome, { kind: "not_found" });
});

test("promotion continuity never infers canonical identity by name set or number", () => {
  const outcome = resolveProvisionalPromotionContinuity({
    canonical_gv_id: "GV-PK-SV01-025",
  });

  assert.deepEqual(outcome, { kind: "not_found" });
});

test("provisional continuity redirect href is built only for explicit safe redirects", () => {
  const redirectOutcome = resolveProvisionalPromotionContinuity({
    promoted_card_print_id: "card-print-id",
    canonical_gv_id: "GV-PK-SV01-025",
  });
  const notFoundOutcome = resolveProvisionalPromotionContinuity({
    promoted_card_print_id: "card-print-id",
    canonical_gv_id: "candidate-1",
  });

  assert.equal(buildProvisionalContinuityRedirectHref(redirectOutcome), "/card/GV-PK-SV01-025");
  assert.equal(buildProvisionalContinuityRedirectHref(notFoundOutcome), null);
  assert.equal(provisionalPromotionContinuityTestInternals.normalizeCanonicalGvId("candidate-1"), "");
});

test("provisional candidate without promotion linkage remains provisional", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  assert.deepEqual(suppressPromotedProvisionalRows([card], [{ id: "card-print-id" }]), [card]);
});

test("provisional candidate with explicit promoted canonical destination is suppressed when canonical exists", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  const linkedCard = {
    ...card,
    promoted_card_print_id: "card-print-id",
  };

  assert.deepEqual(suppressPromotedProvisionalRows([linkedCard], [{ id: "card-print-id" }]), []);
});

test("canonical result with promotion linkage receives transition label", () => {
  const transitions = new Map([
    [
      "card-print-id",
      getPromotionTransitionState({
        promoted_card_print_id: "card-print-id",
        promoted_at: RECENT_PROMOTED_AT,
        now: TEST_NOW,
      }),
    ],
  ]);
  const rows = applyPromotionTransitionsToCanonicalRows([{ id: "card-print-id", gv_id: "GV-TEST" }], transitions);

  assert.equal(rows[0]?.promotion_transition?.isPromotedFromProvisional, true);
  assert.equal(rows[0]?.promotion_transition?.transitionLabel, "Now confirmed in Grookai");
});

test("canonical result without promotion linkage receives no transition label", () => {
  const rows = applyPromotionTransitionsToCanonicalRows([{ id: "card-print-id", gv_id: "GV-TEST" }], new Map());

  assert.equal("promotion_transition" in rows[0], false);
});

test("promoted provisional entity does not dual render beside canonical truth", () => {
  const card = toPublicProvisionalCard(buildRow());

  assert.ok(card);
  const linkedCard = {
    ...card,
    promoted_card_print_id: "card-print-id",
  };
  const canonicalRows = applyPromotionTransitionsToCanonicalRows(
    [{ id: "card-print-id", gv_id: "GV-TEST" }],
    new Map([
      [
        "card-print-id",
        getPromotionTransitionState({
          promoted_card_print_id: "card-print-id",
          promoted_at: RECENT_PROMOTED_AT,
          now: TEST_NOW,
        }),
      ],
    ]),
  );

  assert.equal(canonicalRows.length, 1);
  assert.equal(suppressPromotedProvisionalRows([linkedCard], canonicalRows).length, 0);
});

test("promotion transition fails closed when linkage is partial or missing", () => {
  const partialTransition = getPromotionTransitionState({ promoted_card_print_id: null });
  const missingTimestampTransition = getPromotionTransitionState({
    promoted_card_print_id: "card-print-id",
    now: TEST_NOW,
  });
  const suppressed = suppressPromotedProvisionalRows(
    [{ ...toPublicProvisionalCard(buildRow())!, promoted_card_print_id: null }],
    [{ id: "card-print-id" }],
  );

  assert.equal(partialTransition.isPromotedFromProvisional, false);
  assert.equal(partialTransition.transitionLabel, null);
  assert.equal(missingTimestampTransition.isPromotedFromProvisional, false);
  assert.equal(missingTimestampTransition.transitionLabel, null);
  assert.equal(suppressed.length, 1);
});

test("transition note TTL returns true for recent valid promotion", () => {
  assert.equal(
    shouldShowPromotionTransitionNote({
      promotedAt: RECENT_PROMOTED_AT,
      now: TEST_NOW,
    }),
    true,
  );
});

test("transition note TTL returns false for old promotion", () => {
  assert.equal(
    shouldShowPromotionTransitionNote({
      promotedAt: OLD_PROMOTED_AT,
      now: TEST_NOW,
    }),
    false,
  );
});

test("transition note TTL returns false for invalid timestamp", () => {
  assert.equal(
    shouldShowPromotionTransitionNote({
      promotedAt: "not-a-date",
      now: TEST_NOW,
    }),
    false,
  );
});

test("transition note TTL returns false when timestamp is missing", () => {
  assert.equal(
    shouldShowPromotionTransitionNote({
      promotedAt: null,
      now: TEST_NOW,
    }),
    false,
  );
});

test("recently confirmed promotion links require explicit canonical destination and valid TTL", () => {
  const links = recentlyConfirmedTestInternals.normalizePromotionLinks(
    [
      {
        promoted_card_print_id: "card-print-id",
        promoted_at: RECENT_PROMOTED_AT,
      },
      {
        promoted_card_print_id: null,
        promoted_at: RECENT_PROMOTED_AT,
      },
      {
        promoted_card_print_id: "missing-timestamp",
        promoted_at: null,
      },
    ],
    6,
    TEST_NOW,
  );

  assert.deepEqual(links, [
    {
      cardPrintId: "card-print-id",
      promotedAt: RECENT_PROMOTED_AT,
    },
  ]);
});

test("recently confirmed promotion links exclude expired TTL cards", () => {
  const links = recentlyConfirmedTestInternals.normalizePromotionLinks(
    [
      {
        promoted_card_print_id: "old-card-print-id",
        promoted_at: OLD_PROMOTED_AT,
      },
    ],
    6,
    TEST_NOW,
  );

  assert.deepEqual(links, []);
});
