import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../cards/collector_card_context.dart';
import '../../theme/gv_tokens.dart';

class ExactTcgplayerButton extends StatefulWidget {
  const ExactTcgplayerButton({
    super.key,
    required this.cardPrintId,
    required this.cardPrintingId,
    required this.identity,
    this.condition,
    this.imageUrl,
    this.contextLabel,
  });
  final String cardPrintId, cardPrintingId, identity;
  final String? condition;
  final String? imageUrl, contextLabel;
  @override
  State<ExactTcgplayerButton> createState() => _ExactTcgplayerButtonState();
}

class _ExactTcgplayerButtonState extends State<ExactTcgplayerButton> {
  bool _busy = false;
  Future<void> _open() async {
    if (_busy) return;
    if (![
      'NM',
      'LP',
      'MP',
      'HP',
      'DMG',
    ].contains(widget.condition?.toUpperCase())) {
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        builder: (_) => CardMarketplaceSheet(
          cardPrintId: widget.cardPrintId,
          cardPrintingId: widget.cardPrintingId,
          identity: widget.identity,
          imageUrl: widget.imageUrl,
          contextLabel: widget.contextLabel,
        ),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'card-marketplace-links-v1',
        body: {
          'card_print_id': widget.cardPrintId,
          'card_printing_id': widget.cardPrintingId,
        },
      );
      final link = response.data is Map ? response.data['link'] : null;
      if (link is! Map ||
          link['card_print_id'] != widget.cardPrintId ||
          link['card_printing_id'] != widget.cardPrintingId) {
        throw StateError(
          'No qualified exact TCGplayer link for this printing.',
        );
      }
      final condition = (link['conditions'] as List? ?? [])
          .whereType<Map>()
          .where((row) => row['code'] == widget.condition?.toUpperCase())
          .firstOrNull;
      final uri = Uri.tryParse('${condition?['url']}');
      if (uri == null ||
          uri.scheme != 'https' ||
          uri.host != 'www.tcgplayer.com' ||
          !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw StateError('Could not open TCGplayer. Try again.');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              error is StateError
                  ? error.message
                  : 'Marketplace links could not be loaded. Try again.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    onPressed: _busy ? null : _open,
    icon: const Icon(Icons.open_in_new_rounded, size: 18),
    label: Text(
      _busy
          ? 'Loading exact link…'
          : [
              'NM',
              'LP',
              'MP',
              'HP',
              'DMG',
            ].contains(widget.condition?.toUpperCase())
          ? 'View ${widget.condition!.toUpperCase()} on TCGplayer'
          : 'TCGplayer · raw printing',
    ),
  );
}

class CardMarketplaceSheet extends StatefulWidget {
  const CardMarketplaceSheet({
    super.key,
    required this.cardPrintId,
    required this.cardPrintingId,
    required this.identity,
    this.condition,
    this.imageUrl,
    this.contextLabel,
    this.inline = false,
  });
  final String cardPrintId;
  final String cardPrintingId;
  final String identity;
  final String? condition;
  final String? imageUrl, contextLabel;
  final bool inline;

  @override
  State<CardMarketplaceSheet> createState() => _CardMarketplaceSheetState();
}

class _CardMarketplaceSheetState extends State<CardMarketplaceSheet> {
  Map<String, dynamic>? _link;
  String? _error;
  bool _loading = true;
  int _requestVersion = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant CardMarketplaceSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.cardPrintId != widget.cardPrintId ||
        oldWidget.cardPrintingId != widget.cardPrintingId) {
      _load();
    }
  }

  Future<void> _load() async {
    final version = ++_requestVersion;
    final parentId = widget.cardPrintId;
    final printingId = widget.cardPrintingId;
    setState(() {
      _loading = true;
      _error = null;
      _link = null;
    });
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'card-marketplace-links-v1',
        body: {'card_print_id': parentId, 'card_printing_id': printingId},
      );
      final raw = response.data is Map ? response.data['link'] : null;
      if (!mounted || version != _requestVersion) return;
      setState(() {
        _link =
            raw is Map &&
                raw['card_print_id'] == parentId &&
                raw['card_printing_id'] == printingId
            ? Map<String, dynamic>.from(raw)
            : null;
        _loading = false;
      });
    } catch (_) {
      if (mounted && version == _requestVersion) {
        setState(() {
          _loading = false;
          _error = 'Marketplace links could not be loaded.';
        });
      }
    }
  }

  Future<void> _open(Map condition) async {
    final uri = Uri.tryParse('${condition['url']}');
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host != 'www.tcgplayer.com') {
      return;
    }
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw StateError('launch failed');
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open TCGplayer. Try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final conditions = (_link?['conditions'] as List? ?? [])
        .whereType<Map>()
        .toList();
    if (widget.inline) return _buildInline(context, conditions);
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Open TCGplayer',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Close marketplace conditions',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            CollectorCardContext(
              name: widget.identity,
              imageUrl: widget.imageUrl,
              contextLabel: [
                widget.contextLabel,
                if (_link != null)
                  '${_link!['finish']} · ${_link!['language']}',
              ].whereType<String>().join(' · '),
            ),
            const Divider(height: 1),
            const SizedBox(height: 8),
            if (_loading)
              ...List.generate(
                5,
                (_) => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: LinearProgressIndicator(minHeight: 24),
                ),
              ),
            if (_error != null) ...[
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
              TextButton(onPressed: _load, child: const Text('Retry')),
            ],
            if (!_loading && _error == null && _link == null)
              const Text(
                'No qualified exact TCGplayer link for this printing.',
              ),
            for (final condition in conditions)
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                minTileHeight: 66,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                selected: condition['code'] == widget.condition?.toUpperCase(),
                selectedTileColor: theme.colorScheme.primary.withValues(
                  alpha: .07,
                ),
                leading: Container(
                  width: 44,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.onSurface.withValues(alpha: .04),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${condition['code']}',
                    style: theme.textTheme.labelSmall,
                  ),
                ),
                title: Text('${condition['label']}'),
                trailing: const Icon(Icons.open_in_new_rounded, size: 20),
                onTap: () => _open(condition),
              ),
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(
                'Opens this printing and condition on TCGplayer.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInline(BuildContext context, List<Map> conditions) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('TCGplayer', style: theme.textTheme.titleSmall),
        const SizedBox(height: 4),
        Text(
          _link == null
              ? 'Open by condition'
              : '${_link!['finish']} · ${_link!['language']}',
          style: theme.textTheme.bodySmall?.copyWith(
            color: colors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        if (_loading)
          Semantics(
            label: 'Loading exact TCGplayer links',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < 5; i++)
                  Container(
                    width: 52,
                    height: 48,
                    decoration: BoxDecoration(
                      color: colors.surfaceContainer,
                      borderRadius: BorderRadius.circular(GvRadii.control),
                    ),
                  ),
              ],
            ),
          )
        else if (_error != null) ...[
          Text(
            _error!,
            style: theme.textTheme.bodySmall?.copyWith(color: colors.error),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry TCGplayer'),
            ),
          ),
        ] else if (_link == null || conditions.isEmpty)
          Text(
            'No qualified exact TCGplayer link for this printing.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final condition in conditions)
                Tooltip(
                  message: '${condition['label']}',
                  child: OutlinedButton(
                    onPressed: () => _open(condition),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(52, 48),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      foregroundColor: colors.primary,
                      backgroundColor:
                          condition['code'] == widget.condition?.toUpperCase()
                          ? colors.primary.withValues(alpha: .08)
                          : null,
                      side: BorderSide(
                        color:
                            condition['code'] == widget.condition?.toUpperCase()
                            ? colors.primary
                            : colors.outlineVariant,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(GvRadii.control),
                      ),
                    ),
                    child: Text(
                      '${condition['code']}',
                      semanticsLabel: '${condition['label']} on TCGplayer',
                    ),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}
