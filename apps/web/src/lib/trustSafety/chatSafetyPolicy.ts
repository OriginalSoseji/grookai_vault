export const CHAT_SAFETY_POLICY_VERSION = "CHAT_SAFETY_POLICY_V1";
export const CHAT_SAFETY_MAX_MESSAGE_LENGTH = 2000;

export type ChatSafetyReasonCode =
  | "empty_message"
  | "message_too_long"
  | "personal_contact_information"
  | "external_link"
  | "off_platform_contact"
  | "unsafe_payment_request"
  | "direct_threat"
  | "targeted_harassment"
  | "sexual_solicitation"
  | "self_harm_risk"
  | "spam_pattern";

export type ChatSafetyDecision =
  | {
      allowed: true;
      policyVersion: typeof CHAT_SAFETY_POLICY_VERSION;
      reasonCode: null;
      userMessage: null;
    }
  | {
      allowed: false;
      policyVersion: typeof CHAT_SAFETY_POLICY_VERSION;
      reasonCode: ChatSafetyReasonCode;
      userMessage: string;
    };

const EMAIL_PATTERN = /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i;
const PHONE_PATTERN = /(?:^|\D)(?:\+?\d[\s().-]*){7,}(?:$|\D)/;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:app|co|com|gg|io|me|net|org)(?:\/[^\s]*)?/gi;
const OFF_PLATFORM_CONTACT_PATTERN = /\b(?:discord|instagram|kik|signal|snapchat|telegram|whatsapp)\b|(?:^|\s)@[a-z0-9_.]{3,}\b/i;
const UNSAFE_PAYMENT_PATTERN = /\b(?:cash\s*app|venmo|zelle|gift\s*cards?|wire\s+transfer|crypto(?:currency)?|bitcoin|paypal\s+(?:friends|family)|friends\s+and\s+family)\b/i;
const DIRECT_THREAT_PATTERN = /\b(?:i(?:'ll|\s+will|\s+am\s+going\s+to|'?m\s+gonna)\s+(?:kill|hurt|attack|doxx?)\s+you|kill\s+yourself|hurt\s+yourself)\b/i;
const TARGETED_HARASSMENT_PATTERN = /\b(?:you(?:'re|\s+are)\s+(?:an?\s+)?(?:idiot|moron|loser|stupid|worthless)|shut\s+up)\b/i;
const SEXUAL_SOLICITATION_PATTERN = /\b(?:send|show)\s+(?:me\s+)?(?:nudes?|naked\s+(?:pics?|photos?)|explicit\s+(?:pics?|photos?))\b|\b(?:meet|hook)\s*up\s+for\s+sex\b/i;
const SELF_HARM_PATTERN = /\b(?:i\s+(?:want\s+to|am\s+going\s+to|plan\s+to|might)\s+(?:kill|hurt)\s+myself|i\s+do\s+not\s+want\s+to\s+live|i\s+don't\s+want\s+to\s+live|i\s+am\s+suicidal|i'm\s+suicidal)\b/i;
const REPEATED_CHARACTER_PATTERN = /(.)\1{11,}/i;
const REPEATED_WORD_PATTERN = /\b([a-z0-9]{2,})(?:\s+\1){7,}\b/i;

function blocked(
  reasonCode: ChatSafetyReasonCode,
  userMessage: string,
): ChatSafetyDecision {
  return {
    allowed: false,
    policyVersion: CHAT_SAFETY_POLICY_VERSION,
    reasonCode,
    userMessage,
  };
}

function hasUnapprovedExternalLink(message: string) {
  const matches = message.match(URL_PATTERN) ?? [];
  return matches.some((rawMatch) => {
    const candidate = rawMatch
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/, 1)[0];
    return candidate !== "grookai.com" && !candidate.endsWith(".grookai.com");
  });
}

export function reviewChatMessageSafety(message: string): ChatSafetyDecision {
  const normalized = message.trim();

  if (!normalized) {
    return blocked("empty_message", "Enter a message before sending.");
  }

  if (normalized.length > CHAT_SAFETY_MAX_MESSAGE_LENGTH) {
    return blocked(
      "message_too_long",
      `Message must be ${CHAT_SAFETY_MAX_MESSAGE_LENGTH} characters or fewer.`,
    );
  }

  if (SELF_HARM_PATTERN.test(normalized)) {
    return blocked(
      "self_harm_risk",
      "Your message was not sent. If you may be in immediate danger, contact local emergency services or call or text 988 in the U.S. and Canada.",
    );
  }

  if (EMAIL_PATTERN.test(normalized) || PHONE_PATTERN.test(normalized)) {
    return blocked(
      "personal_contact_information",
      "Keep contact information private and continue the conversation in Grookai.",
    );
  }

  if (hasUnapprovedExternalLink(normalized)) {
    return blocked(
      "external_link",
      "External links are not allowed in collector messages.",
    );
  }

  if (OFF_PLATFORM_CONTACT_PATTERN.test(normalized)) {
    return blocked(
      "off_platform_contact",
      "Keep the conversation in Grookai instead of moving it to another messaging service.",
    );
  }

  if (UNSAFE_PAYMENT_PATTERN.test(normalized)) {
    return blocked(
      "unsafe_payment_request",
      "Off-platform payment requests are not allowed in collector messages.",
    );
  }

  if (DIRECT_THREAT_PATTERN.test(normalized)) {
    return blocked("direct_threat", "Threatening messages are not allowed.");
  }

  if (SEXUAL_SOLICITATION_PATTERN.test(normalized)) {
    return blocked(
      "sexual_solicitation",
      "Sexual requests are not allowed in collector messages.",
    );
  }

  if (TARGETED_HARASSMENT_PATTERN.test(normalized)) {
    return blocked(
      "targeted_harassment",
      "Harassing another collector is not allowed.",
    );
  }

  if (
    REPEATED_CHARACTER_PATTERN.test(normalized) ||
    REPEATED_WORD_PATTERN.test(normalized)
  ) {
    return blocked("spam_pattern", "Remove repeated spam before sending.");
  }

  return {
    allowed: true,
    policyVersion: CHAT_SAFETY_POLICY_VERSION,
    reasonCode: null,
    userMessage: null,
  };
}
