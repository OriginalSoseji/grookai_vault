import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../screens/auth/sign_in_continuation_screen.dart';
import '../../services/network/card_engagement_service.dart';
import '../../theme/gv_tokens.dart';

class CardCommentsSheet extends StatefulWidget {
  const CardCommentsSheet({
    super.key,
    required this.cardPrintId,
    required this.cardName,
    this.loadComments,
  });
  final String cardPrintId;
  final String cardName;
  final Future<List<CardCommentEntry>> Function()? loadComments;
  @override
  State<CardCommentsSheet> createState() => _CardCommentsSheetState();
}

class _CardCommentsSheetState extends State<CardCommentsSheet> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final _bodyController = TextEditingController();
  List<CardCommentEntry> _comments = const [];
  bool _loading = true;
  bool _submitting = false;
  String? _loadError;
  String? _submitError;
  @override
  void initState() {
    super.initState();
    unawaited(_loadComments());
  }

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });

    try {
      final comments =
          await (widget.loadComments?.call() ??
              CardEngagementService.fetchComments(
                client: _supabase,
                cardPrintId: widget.cardPrintId,
              ));
      if (!mounted) {
        return;
      }
      setState(() {
        _comments = comments;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _loadError = 'Comments could not be loaded. Try again.';
      });
    }
  }

  Future<void> _submitComment() async {
    final message = _bodyController.text.trim();
    if (_submitting || message.isEmpty) {
      return;
    }

    setState(() {
      _submitting = true;
      _submitError = null;
    });

    try {
      final entry = await CardEngagementService.addComment(
        client: _supabase,
        cardPrintId: widget.cardPrintId,
        body: message,
      );
      if (!mounted) {
        return;
      }
      _bodyController.clear();
      setState(() {
        _comments = <CardCommentEntry>[entry, ..._comments];
        _submitting = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _submitting = false;
        _submitError = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _signIn() async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => const SignInContinuationScreen(
          destinationLabel: 'comment on this card',
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final canComment = _supabase.auth.currentUser != null;
    final header = Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 12, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Comments', style: theme.textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(
                  widget.cardName,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Close comments',
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.close),
          ),
        ],
      ),
    );
    final body = <Widget>[
      if (_loading)
        Semantics(
          label: 'Loading comments',
          child: Column(
            children: [
              for (var i = 0; i < 3; i++)
                Container(
                  height: 72,
                  margin: const EdgeInsets.only(bottom: 9),
                  decoration: BoxDecoration(
                    color: colors.surfaceContainer,
                    borderRadius: BorderRadius.circular(GvRadii.surface),
                  ),
                ),
            ],
          ),
        )
      else if (_loadError != null) ...[
        Text(
          _loadError!,
          style: theme.textTheme.bodyMedium?.copyWith(color: colors.error),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _loadComments,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Retry comments'),
          ),
        ),
      ] else if (_comments.isEmpty) ...[
        Text('No comments yet.', style: theme.textTheme.titleSmall),
        const SizedBox(height: 6),
        Text(
          canComment
              ? 'Start the first comment on this card.'
              : 'Sign in to join the conversation.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colors.onSurfaceVariant,
          ),
        ),
      ] else
        for (final entry in _comments) ...[
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      entry.isOwnedBy(_supabase.auth.currentUser?.id)
                          ? 'You'
                          : 'Collector',
                      style: theme.textTheme.labelLarge,
                    ),
                    Text(
                      CardEngagementService.formatRelativeTime(entry.createdAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                    if (entry.intentType?.isNotEmpty ?? false)
                      Text(
                        entry.intentType!.toUpperCase(),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  entry.body,
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: colors.outlineVariant),
        ],
    ];
    final composer = Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (canComment) ...[
            if (_submitError != null) ...[
              Text(
                _submitError!,
                style: theme.textTheme.bodySmall?.copyWith(color: colors.error),
              ),
              const SizedBox(height: 8),
            ],
            TextField(
              controller: _bodyController,
              minLines: 1,
              maxLines: 4,
              maxLength: 2000,
              enabled: !_submitting,
              decoration: const InputDecoration(
                labelText: 'Your comment',
                hintText: 'Comment on this card',
              ),
            ),
            const SizedBox(height: 8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: _bodyController,
              builder: (context, value, _) => FilledButton.icon(
                onPressed:
                    !_submitting &&
                        value.text.trim().isNotEmpty &&
                        value.text.length <= 2000
                    ? _submitComment
                    : null,
                icon: _submitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send_outlined, size: 18),
                label: Text(_submitting ? 'Posting...' : 'Post'),
              ),
            ),
          ] else
            OutlinedButton.icon(
              onPressed: _signIn,
              icon: const Icon(Icons.login_rounded, size: 18),
              label: const Text('Sign in to comment'),
            ),
          const SizedBox(height: 8),
          Text(
            'Comments stay attached to this card.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
    return SafeArea(
      top: false,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final inset = MediaQuery.viewInsetsOf(context).bottom;
          final height = math.max(
            0.0,
            math.min(
              MediaQuery.sizeOf(context).height * .82,
              constraints.maxHeight - inset,
            ),
          );
          final compact =
              height < 460 || MediaQuery.textScalerOf(context).scale(14) > 20;
          return Padding(
            padding: EdgeInsets.only(bottom: inset),
            child: SizedBox(
              height: height,
              child: compact
                  ? ListView(
                      children: [
                        header,
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: body,
                          ),
                        ),
                        composer,
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        header,
                        Expanded(
                          child: ListView(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            children: body,
                          ),
                        ),
                        Divider(height: 1, color: colors.outlineVariant),
                        composer,
                      ],
                    ),
            ),
          );
        },
      ),
    );
  }
}
