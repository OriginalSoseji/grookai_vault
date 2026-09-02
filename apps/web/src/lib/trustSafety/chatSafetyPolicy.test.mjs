import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAT_SAFETY_POLICY_VERSION,
  reviewChatMessageSafety,
} from "./chatSafetyPolicy.ts";

const acceptedMessages = [
  "Would you consider trading this for my Charizard?",
  "That is a sick card with killer artwork.",
  "Misty's Determination is one of my favorite cards.",
  "Would you take $40 for the card?",
  "I can find you a cleaner copy in my vault.",
  "Here is the Grookai card link: https://grookai.com/cards/GV-PK-BASE-001",
];

const blockedMessages = [
  ["Email me at collector@example.com", "personal_contact_information"],
  ["Text me at 303-555-0118", "personal_contact_information"],
  ["Open https://example.com/card", "external_link"],
  ["Message me on Discord", "off_platform_contact"],
  ["Pay me with a gift card", "unsafe_payment_request"],
  ["I will hurt you", "direct_threat"],
  ["You are an idiot", "targeted_harassment"],
  ["Send me nudes", "sexual_solicitation"],
  ["I do not want to live", "self_harm_risk"],
  ["aaaaaaaaaaaa", "spam_pattern"],
];

test("chat safety policy accepts normal collector language", () => {
  for (const message of acceptedMessages) {
    const decision = reviewChatMessageSafety(message);
    assert.equal(decision.allowed, true, message);
    assert.equal(decision.policyVersion, CHAT_SAFETY_POLICY_VERSION);
  }
});

test("chat safety policy blocks concrete safety risks with stable reason codes", () => {
  for (const [message, expectedReason] of blockedMessages) {
    const decision = reviewChatMessageSafety(message);
    assert.equal(decision.allowed, false, message);
    assert.equal(decision.reasonCode, expectedReason, message);
    assert.ok(decision.userMessage, message);
  }
});

test("empty and oversized messages fail closed", () => {
  assert.equal(reviewChatMessageSafety("   ").reasonCode, "empty_message");
  assert.equal(
    reviewChatMessageSafety("a".repeat(2001)).reasonCode,
    "message_too_long",
  );
});
