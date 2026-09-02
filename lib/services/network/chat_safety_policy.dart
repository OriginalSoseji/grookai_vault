const String chatSafetyPolicyVersion = 'CHAT_SAFETY_POLICY_V1';
const int chatSafetyMaxMessageLength = 2000;

enum ChatSafetyReasonCode {
  emptyMessage,
  messageTooLong,
  personalContactInformation,
  externalLink,
  offPlatformContact,
  unsafePaymentRequest,
  directThreat,
  targetedHarassment,
  sexualSolicitation,
  selfHarmRisk,
  spamPattern,
}

class ChatSafetyDecision {
  const ChatSafetyDecision._({
    required this.allowed,
    this.reasonCode,
    this.userMessage,
  });

  const ChatSafetyDecision.allowed() : this._(allowed: true);

  const ChatSafetyDecision.blocked({
    required ChatSafetyReasonCode reasonCode,
    required String userMessage,
  }) : this._(allowed: false, reasonCode: reasonCode, userMessage: userMessage);

  final bool allowed;
  final ChatSafetyReasonCode? reasonCode;
  final String? userMessage;
}

final RegExp _emailPattern = RegExp(
  r"\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b",
  caseSensitive: false,
);
final RegExp _phonePattern = RegExp(r'(?:^|\D)(?:\+?\d[\s().-]*){7,}(?:$|\D)');
final RegExp _urlPattern = RegExp(
  r'\b(?:https?://|www\.)[^\s]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:app|co|com|gg|io|me|net|org)(?:/[^\s]*)?',
  caseSensitive: false,
);
final RegExp _offPlatformContactPattern = RegExp(
  r'\b(?:discord|instagram|kik|signal|snapchat|telegram|whatsapp)\b|(?:^|\s)@[a-z0-9_.]{3,}\b',
  caseSensitive: false,
);
final RegExp _unsafePaymentPattern = RegExp(
  r'\b(?:cash\s*app|venmo|zelle|gift\s*cards?|wire\s+transfer|crypto(?:currency)?|bitcoin|paypal\s+(?:friends|family)|friends\s+and\s+family)\b',
  caseSensitive: false,
);
final RegExp _directThreatPattern = RegExp(
  r"\b(?:i(?:'ll|\s+will|\s+am\s+going\s+to|'?m\s+gonna)\s+(?:kill|hurt|attack|doxx?)\s+you|kill\s+yourself|hurt\s+yourself)\b",
  caseSensitive: false,
);
final RegExp _targetedHarassmentPattern = RegExp(
  r"\b(?:you(?:'re|\s+are)\s+(?:an?\s+)?(?:idiot|moron|loser|stupid|worthless)|shut\s+up)\b",
  caseSensitive: false,
);
final RegExp _sexualSolicitationPattern = RegExp(
  r'\b(?:send|show)\s+(?:me\s+)?(?:nudes?|naked\s+(?:pics?|photos?)|explicit\s+(?:pics?|photos?))\b|\b(?:meet|hook)\s*up\s+for\s+sex\b',
  caseSensitive: false,
);
final RegExp _selfHarmPattern = RegExp(
  r"\b(?:i\s+(?:want\s+to|am\s+going\s+to|plan\s+to|might)\s+(?:kill|hurt)\s+myself|i\s+do\s+not\s+want\s+to\s+live|i\s+don't\s+want\s+to\s+live|i\s+am\s+suicidal|i'm\s+suicidal)\b",
  caseSensitive: false,
);
final RegExp _repeatedCharacterPattern = RegExp(
  r'(.)\1{11,}',
  caseSensitive: false,
);
final RegExp _repeatedWordPattern = RegExp(
  r'\b([a-z0-9]{2,})(?:\s+\1){7,}\b',
  caseSensitive: false,
);

bool _hasUnapprovedExternalLink(String message) {
  for (final match in _urlPattern.allMatches(message)) {
    final raw = match.group(0)?.toLowerCase() ?? '';
    final withoutScheme = raw
        .replaceFirst(RegExp(r'^https?://'), '')
        .replaceFirst(RegExp(r'^www\.'), '');
    final host = withoutScheme.split(RegExp(r'[/?#]')).first;
    if (host != 'grookai.com' && !host.endsWith('.grookai.com')) {
      return true;
    }
  }
  return false;
}

ChatSafetyDecision reviewChatMessageSafety(String message) {
  final normalized = message.trim();

  if (normalized.isEmpty) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.emptyMessage,
      userMessage: 'Enter a message before sending.',
    );
  }
  if (normalized.length > chatSafetyMaxMessageLength) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.messageTooLong,
      userMessage: 'Message must be 2000 characters or fewer.',
    );
  }
  if (_selfHarmPattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.selfHarmRisk,
      userMessage:
          'Your message was not sent. If you may be in immediate danger, contact local emergency services or call or text 988 in the U.S. and Canada.',
    );
  }
  if (_emailPattern.hasMatch(normalized) ||
      _phonePattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.personalContactInformation,
      userMessage:
          'Keep contact information private and continue the conversation in Grookai.',
    );
  }
  if (_hasUnapprovedExternalLink(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.externalLink,
      userMessage: 'External links are not allowed in collector messages.',
    );
  }
  if (_offPlatformContactPattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.offPlatformContact,
      userMessage:
          'Keep the conversation in Grookai instead of moving it to another messaging service.',
    );
  }
  if (_unsafePaymentPattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.unsafePaymentRequest,
      userMessage:
          'Off-platform payment requests are not allowed in collector messages.',
    );
  }
  if (_directThreatPattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.directThreat,
      userMessage: 'Threatening messages are not allowed.',
    );
  }
  if (_sexualSolicitationPattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.sexualSolicitation,
      userMessage: 'Sexual requests are not allowed in collector messages.',
    );
  }
  if (_targetedHarassmentPattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.targetedHarassment,
      userMessage: 'Harassing another collector is not allowed.',
    );
  }
  if (_repeatedCharacterPattern.hasMatch(normalized) ||
      _repeatedWordPattern.hasMatch(normalized)) {
    return const ChatSafetyDecision.blocked(
      reasonCode: ChatSafetyReasonCode.spamPattern,
      userMessage: 'Remove repeated spam before sending.',
    );
  }

  return const ChatSafetyDecision.allowed();
}
