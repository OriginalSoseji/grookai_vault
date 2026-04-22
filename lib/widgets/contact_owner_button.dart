import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../screens/network/network_inbox_screen.dart';
import '../services/network/card_interaction_service.dart';
import '../services/network/intent_presentation.dart' as intent_presentation;

enum ContactOwnerButtonVariant { filled, outlined, compact }

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

  @override
  Widget build(BuildContext context) {
    final currentUserId = Supabase.instance.client.auth.currentUser?.id;
    if (currentUserId != null &&
        ownerUserId != null &&
        ownerUserId == currentUserId) {
      return const SizedBox.shrink();
    }

    final label =
        buttonLabel ?? CardInteractionService.contactButtonLabel(intent);

    final buttonChild = switch (variant) {
      ContactOwnerButtonVariant.compact => Text(label),
      ContactOwnerButtonVariant.outlined => Text(label),
      ContactOwnerButtonVariant.filled => Text(label),
    };

    Future<void> onPressed() async {
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
        ),
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
    };
  }
}

class _ContactComposerSheet extends StatefulWidget {
  const _ContactComposerSheet({
    required this.vaultItemId,
    required this.cardPrintId,
    required this.ownerDisplayName,
    required this.cardName,
    this.intent,
  });

  final String vaultItemId;
  final String cardPrintId;
  final String ownerDisplayName;
  final String cardName;
  final String? intent;

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
    setState(() {
      _sending = true;
      _error = null;
    });

    final result = await CardInteractionService.sendMessage(
      client: Supabase.instance.client,
      vaultItemId: widget.vaultItemId,
      cardPrintId: widget.cardPrintId,
      message: _controller.text,
    );

    if (!mounted) {
      return;
    }

    setState(() {
      _sending = false;
      _error = result.ok ? null : result.message;
    });

    if (!result.ok) {
      return;
    }

    Navigator.of(context).pop();
    if (!context.mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result.message),
        action: SnackBarAction(
          label: 'Messages',
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const NetworkInboxScreen(),
              ),
            );
          },
        ),
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
                letterSpacing: -0.3,
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
