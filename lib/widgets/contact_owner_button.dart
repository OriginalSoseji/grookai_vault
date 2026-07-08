import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../screens/network/network_inbox_screen.dart';
import '../screens/network/network_thread_screen.dart';
import '../services/network/card_interaction_service.dart';
import '../services/network/intent_presentation.dart' as intent_presentation;

enum ContactOwnerButtonVariant { filled, outlined, compact, pulseSecondary }

typedef ContactOwnerSendMessage =
    Future<CardInteractionSendResult> Function({
      required String vaultItemId,
      required String cardPrintId,
      required String message,
    });

typedef ContactOwnerResolveThread =
    Future<CardInteractionThreadSummary?> Function(
      CardInteractionSendResult result,
    );

typedef ContactOwnerOpenConversation =
    Future<void> Function(
      NavigatorState navigator,
      CardInteractionThreadSummary thread,
    );

Future<void> showContactOwnerComposerSheet({
  required BuildContext context,
  required String vaultItemId,
  required String cardPrintId,
  required String ownerDisplayName,
  required String cardName,
  String? intent,
  bool closeParentOnSuccess = false,
  ContactOwnerSendMessage? sendMessageOverride,
  ContactOwnerResolveThread? resolveThreadOverride,
  ContactOwnerOpenConversation? openConversationOverride,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => _ContactComposerSheet(
      vaultItemId: vaultItemId,
      cardPrintId: cardPrintId,
      ownerDisplayName: ownerDisplayName,
      cardName: cardName,
      intent: intent,
      launchContext: context,
      closeParentOnSuccess: closeParentOnSuccess,
      sendMessageOverride: sendMessageOverride,
      resolveThreadOverride: resolveThreadOverride,
      openConversationOverride: openConversationOverride,
    ),
  );
}

class ContactOwnerButton extends StatelessWidget {
  const ContactOwnerButton({
    required this.vaultItemId,
    required this.cardPrintId,
    required this.ownerDisplayName,
    required this.cardName,
    this.intent,
    this.ownerUserId,
    this.buttonLabel,
    this.variant = ContactOwnerButtonVariant.filled,
    this.closeParentOnSuccess = false,
    this.currentUserIdOverride,
    this.sendMessageOverride,
    this.resolveThreadOverride,
    this.openConversationOverride,
    super.key,
  });

  final String vaultItemId;
  final String cardPrintId;
  final String ownerDisplayName;
  final String cardName;
  final String? intent;
  final String? ownerUserId;
  final String? buttonLabel;
  final ContactOwnerButtonVariant variant;
  final bool closeParentOnSuccess;
  final String? currentUserIdOverride;
  final ContactOwnerSendMessage? sendMessageOverride;
  final ContactOwnerResolveThread? resolveThreadOverride;
  final ContactOwnerOpenConversation? openConversationOverride;

  @override
  Widget build(BuildContext context) {
    final currentUserId = currentUserIdOverride ?? _currentUserIdOrNull();
    if (currentUserId != null &&
        ownerUserId != null &&
        ownerUserId == currentUserId) {
      return const SizedBox.shrink();
    }

    final label =
        buttonLabel ?? CardInteractionService.contactButtonLabel(intent);

    final buttonChild = switch (variant) {
      ContactOwnerButtonVariant.compact => Text(label),
      ContactOwnerButtonVariant.pulseSecondary => Text(label),
      ContactOwnerButtonVariant.outlined => Text(label),
      ContactOwnerButtonVariant.filled => Text(label),
    };

    Future<void> onPressed() async {
      await showContactOwnerComposerSheet(
        context: context,
        vaultItemId: vaultItemId,
        cardPrintId: cardPrintId,
        ownerDisplayName: ownerDisplayName,
        cardName: cardName,
        intent: intent,
        closeParentOnSuccess: closeParentOnSuccess,
        sendMessageOverride: sendMessageOverride,
        resolveThreadOverride: resolveThreadOverride,
        openConversationOverride: openConversationOverride,
      );
    }

    return switch (variant) {
      ContactOwnerButtonVariant.filled => FilledButton(
        onPressed: onPressed,
        child: buttonChild,
      ),
      ContactOwnerButtonVariant.outlined => OutlinedButton(
        onPressed: onPressed,
        child: buttonChild,
      ),
      ContactOwnerButtonVariant.compact => TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          visualDensity: VisualDensity.compact,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        ),
        child: buttonChild,
      ),
      ContactOwnerButtonVariant.pulseSecondary => ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 7.5),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xFF182838),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: const Color(0xFF82B4EE),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    height: 1.0,
                    letterSpacing: 0,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    };
  }

  String? _currentUserIdOrNull() {
    try {
      return Supabase.instance.client.auth.currentUser?.id;
    } catch (_) {
      return null;
    }
  }
}

class _ContactComposerSheet extends StatefulWidget {
  const _ContactComposerSheet({
    required this.vaultItemId,
    required this.cardPrintId,
    required this.ownerDisplayName,
    required this.cardName,
    required this.launchContext,
    required this.closeParentOnSuccess,
    this.intent,
    this.sendMessageOverride,
    this.resolveThreadOverride,
    this.openConversationOverride,
  });

  final String vaultItemId;
  final String cardPrintId;
  final String ownerDisplayName;
  final String cardName;
  final BuildContext launchContext;
  final bool closeParentOnSuccess;
  final String? intent;
  final ContactOwnerSendMessage? sendMessageOverride;
  final ContactOwnerResolveThread? resolveThreadOverride;
  final ContactOwnerOpenConversation? openConversationOverride;

  @override
  State<_ContactComposerSheet> createState() => _ContactComposerSheetState();
}

class _ContactComposerSheetState extends State<_ContactComposerSheet> {
  late final TextEditingController _controller;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: CardInteractionService.defaultMessage(
        ownerDisplayName: widget.ownerDisplayName,
        cardName: widget.cardName,
        intent: widget.intent,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    FocusScope.of(context).unfocus();
    final rootNavigator = Navigator.of(
      widget.launchContext,
      rootNavigator: true,
    );
    final parentNavigator = Navigator.of(widget.launchContext);
    final messenger = ScaffoldMessenger.maybeOf(widget.launchContext);

    setState(() {
      _sending = true;
      _error = null;
    });

    late final CardInteractionSendResult result;
    try {
      result = await _sendMessage(_controller.text);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _sending = false;
        _error = 'Unable to send this message right now.';
      });
      return;
    }

    if (!mounted) {
      return;
    }

    CardInteractionThreadSummary? thread;
    if (result.ok) {
      try {
        thread = await _resolveThread(result);
      } catch (_) {
        thread = null;
      }
      if (!mounted) {
        return;
      }
    }

    setState(() {
      _sending = false;
      _error = result.ok ? null : result.message;
    });

    if (!result.ok) {
      return;
    }

    Navigator.of(context).pop();
    if (widget.closeParentOnSuccess && parentNavigator.canPop()) {
      parentNavigator.pop();
    }

    if (thread != null) {
      await (widget.openConversationOverride ?? _openConversation)(
        rootNavigator,
        thread,
      );
      return;
    }

    messenger?.showSnackBar(
      SnackBar(
        content: const Text(
          'Message sent, but the conversation could not be opened.',
        ),
        action: SnackBarAction(
          label: 'Messages',
          onPressed: () {
            rootNavigator.push(
              MaterialPageRoute<void>(
                builder: (_) => const NetworkInboxScreen(),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<CardInteractionSendResult> _sendMessage(String message) async {
    final override = widget.sendMessageOverride;
    if (override != null) {
      return override(
        vaultItemId: widget.vaultItemId,
        cardPrintId: widget.cardPrintId,
        message: message,
      );
    }

    final client = Supabase.instance.client;
    return CardInteractionService.sendMessage(
      client: client,
      vaultItemId: widget.vaultItemId,
      cardPrintId: widget.cardPrintId,
      message: message,
    );
  }

  Future<CardInteractionThreadSummary?> _resolveThread(
    CardInteractionSendResult result,
  ) async {
    final override = widget.resolveThreadOverride;
    if (override != null) {
      return override(result);
    }

    final client = Supabase.instance.client;
    final userId = client.auth.currentUser?.id ?? '';
    return CardInteractionService.fetchThreadSummaryForContact(
      client: client,
      userId: userId,
      cardPrintId: result.cardPrintId ?? widget.cardPrintId,
      counterpartUserId: result.counterpartUserId ?? '',
    );
  }

  Future<void> _openConversation(
    NavigatorState navigator,
    CardInteractionThreadSummary thread,
  ) async {
    await navigator.push(
      MaterialPageRoute<void>(
        builder: (_) => NetworkThreadScreen(thread: thread),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottomInset),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.intent == null
                  ? 'Collector Network'
                  : _intentLabel(widget.intent!),
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.58),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Message ${widget.ownerDisplayName}',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Start a message about ${widget.cardName}.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.72),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _controller,
              minLines: 4,
              maxLines: 6,
              maxLength: 2000,
              decoration: const InputDecoration(
                labelText: 'Message',
                alignLabelWithHint: true,
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton(
                  onPressed: _sending
                      ? null
                      : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                const Spacer(),
                FilledButton(
                  onPressed: _sending ? null : _send,
                  child: Text(_sending ? 'Sending...' : 'Send message'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _intentLabel(String intent) {
    return intent_presentation.getVaultIntentLabel(intent);
  }
}
