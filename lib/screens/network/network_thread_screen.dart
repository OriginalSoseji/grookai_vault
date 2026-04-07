import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/network/card_interaction_service.dart';
import '../../widgets/card_surface_artwork.dart';

class NetworkThreadScreen extends StatefulWidget {
  const NetworkThreadScreen({required this.thread, super.key});

  final CardInteractionThreadSummary thread;

  @override
  State<NetworkThreadScreen> createState() => _NetworkThreadScreenState();
}

class _NetworkThreadScreenState extends State<NetworkThreadScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _replyController = TextEditingController();

  bool _loading = true;
  bool _sending = false;
  String? _error;
  List<CardInteractionMessageEntry> _messages = const [];

  bool get _canReply =>
      (widget.thread.vaultItemId ?? '').trim().isNotEmpty &&
      !widget.thread.isClosed &&
      !widget.thread.isArchived;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final userId = _client.auth.currentUser?.id ?? '';
    if (userId.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'You are not signed in.';
        _messages = const [];
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final messages = await CardInteractionService.fetchThreadMessages(
        client: _client,
        userId: userId,
        cardPrintId: widget.thread.cardPrintId,
        counterpartUserId: widget.thread.counterpartUserId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _messages = messages;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error is Error
            ? error.toString()
            : 'Unable to load this message thread.';
      });
    }
  }

  Future<void> _sendReply() async {
    if (!_canReply || _sending) {
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });

    final result = await CardInteractionService.replyToThread(
      client: _client,
      vaultItemId: widget.thread.vaultItemId ?? '',
      cardPrintId: widget.thread.cardPrintId,
      counterpartUserId: widget.thread.counterpartUserId,
      counterpartDisplayName: widget.thread.counterpartDisplayName,
      message: _replyController.text,
    );

    if (!mounted) {
      return;
    }

    if (!result.ok) {
      setState(() {
        _sending = false;
        _error = result.message;
      });
      return;
    }

    _replyController.clear();
    await _load();
    if (!mounted) {
      return;
    }

    setState(() {
      _sending = false;
    });
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(result.message)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final subtitleParts = <String>[
      widget.thread.setName,
      if (widget.thread.number != '—') '#${widget.thread.number}',
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.thread.counterpartDisplayName),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.14),
                  ),
                ),
                child: Row(
                  children: [
                    CardSurfaceArtwork(
                      label: widget.thread.cardName,
                      imageUrl: widget.thread.imageUrl,
                      width: 58,
                      height: 80,
                      borderRadius: 12,
                      padding: const EdgeInsets.all(4),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.thread.cardName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            subtitleParts.join(' • '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.68,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _ThreadStatePill(thread: widget.thread),
                              const Spacer(),
                              TextButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => CardDetailScreen(
                                        cardPrintId: widget.thread.cardPrintId,
                                        gvId: widget.thread.gvId,
                                        name: widget.thread.cardName,
                                        setName: widget.thread.setName,
                                        number: widget.thread.number,
                                        imageUrl: widget.thread.imageUrl,
                                        contactVaultItemId:
                                            widget.thread.vaultItemId,
                                        contactOwnerDisplayName: widget
                                            .thread
                                            .counterpartDisplayName,
                                        contactOwnerUserId:
                                            widget.thread.counterpartUserId,
                                      ),
                                    ),
                                  );
                                },
                                child: const Text('View card'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                  ? _ThreadStateCard(
                      title: 'Unable to load thread',
                      body: _error!,
                    )
                  : _messages.isEmpty
                  ? const _ThreadStateCard(
                      title: 'No messages yet',
                      body:
                          'Start the conversation from a card owner contact action.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                      itemBuilder: (context, index) {
                        return _MessageBubble(message: _messages[index]);
                      },
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 8),
                      itemCount: _messages.length,
                    ),
            ),
            Container(
              padding: EdgeInsets.fromLTRB(
                14,
                10,
                14,
                14 + MediaQuery.viewPaddingOf(context).bottom,
              ),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                border: Border(
                  top: BorderSide(
                    color: colorScheme.outline.withValues(alpha: 0.10),
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!_canReply)
                    Text(
                      widget.thread.isClosed || widget.thread.isArchived
                          ? 'Replies are unavailable for closed or archived threads.'
                          : 'Reply is unavailable for this thread right now.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.68),
                      ),
                    )
                  else ...[
                    TextField(
                      controller: _replyController,
                      minLines: 2,
                      maxLines: 4,
                      maxLength: 2000,
                      decoration: const InputDecoration(
                        labelText: 'Reply',
                        alignLabelWithHint: true,
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        _error!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.error,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        onPressed: _sending ? null : _sendReply,
                        child: Text(_sending ? 'Sending...' : 'Send reply'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final CardInteractionMessageEntry message;

  @override
  Widget build(BuildContext context) {
    final isSent = message.direction == 'sent';
    final colorScheme = Theme.of(context).colorScheme;

    return Align(
      alignment: isSent ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 300),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
          decoration: BoxDecoration(
            color: isSent
                ? colorScheme.primary.withValues(alpha: 0.12)
                : colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isSent ? 16 : 4),
              bottomRight: Radius.circular(isSent ? 4 : 16),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                message.message,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(height: 1.35),
              ),
              const SizedBox(height: 6),
              Text(
                _formatTimestamp(message.createdAt),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime? value) {
    if (value == null) {
      return 'Recently';
    }

    final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
    final minute = value.minute.toString().padLeft(2, '0');
    final suffix = value.hour >= 12 ? 'PM' : 'AM';
    return '${value.month}/${value.day} $hour:$minute $suffix';
  }
}

class _ThreadStatePill extends StatelessWidget {
  const _ThreadStatePill({required this.thread});

  final CardInteractionThreadSummary thread;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final (background, foreground, label) = thread.isArchived
        ? (
            colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
            colorScheme.onSurface.withValues(alpha: 0.72),
            'Archived',
          )
        : thread.isClosed
        ? (
            Colors.amber.withValues(alpha: 0.14),
            Colors.amber.shade900,
            'Closed',
          )
        : thread.hasUnread
        ? (Colors.green.withValues(alpha: 0.14), Colors.green.shade900, 'New')
        : (
            colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
            colorScheme.onSurface.withValues(alpha: 0.72),
            'Active',
          );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ThreadStateCard extends StatelessWidget {
  const _ThreadStateCard({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.14),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              body,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.72),
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
