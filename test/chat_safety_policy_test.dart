import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/chat_safety_policy.dart';

void main() {
  group('Chat Safety Policy V1', () {
    test('accepts normal collector language', () {
      const messages = [
        'Would you consider trading this for my Charizard?',
        'That is a sick card with killer artwork.',
        "Misty's Determination is one of my favorite cards.",
        'Would you take \$40 for the card?',
        'I can find you a cleaner copy in my vault.',
        'Here is the Grookai card link: https://grookai.com/cards/GV-PK-BASE-001',
      ];

      for (final message in messages) {
        expect(
          reviewChatMessageSafety(message).allowed,
          isTrue,
          reason: message,
        );
      }
    });

    test('blocks concrete safety risks with stable reason codes', () {
      final cases = <String, ChatSafetyReasonCode>{
        'Email me at collector@example.com':
            ChatSafetyReasonCode.personalContactInformation,
        'Text me at 303-555-0118':
            ChatSafetyReasonCode.personalContactInformation,
        'Open https://example.com/card': ChatSafetyReasonCode.externalLink,
        'Message me on Discord': ChatSafetyReasonCode.offPlatformContact,
        'Pay me with a gift card': ChatSafetyReasonCode.unsafePaymentRequest,
        'I will hurt you': ChatSafetyReasonCode.directThreat,
        'You are an idiot': ChatSafetyReasonCode.targetedHarassment,
        'Send me nudes': ChatSafetyReasonCode.sexualSolicitation,
        'I do not want to live': ChatSafetyReasonCode.selfHarmRisk,
        'aaaaaaaaaaaa': ChatSafetyReasonCode.spamPattern,
      };

      for (final entry in cases.entries) {
        final decision = reviewChatMessageSafety(entry.key);
        expect(decision.allowed, isFalse, reason: entry.key);
        expect(decision.reasonCode, entry.value, reason: entry.key);
        expect(decision.userMessage, isNotEmpty, reason: entry.key);
      }
    });

    test('empty and oversized messages fail closed', () {
      expect(
        reviewChatMessageSafety('   ').reasonCode,
        ChatSafetyReasonCode.emptyMessage,
      );
      expect(
        reviewChatMessageSafety('a' * 2001).reasonCode,
        ChatSafetyReasonCode.messageTooLong,
      );
    });
  });
}
