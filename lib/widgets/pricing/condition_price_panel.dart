import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/pricing/condition_price_service.dart';

/// Follows the existing exact-copy controls; this amount never sets a sale price.
class ConditionPricePanel extends StatefulWidget {
  const ConditionPricePanel({
    super.key,
    required this.printingId,
    required this.condition,
    this.createReader,
  });

  final String? printingId;
  final String? condition;
  final ConditionPriceReaderFactory? createReader;

  @override
  State<ConditionPricePanel> createState() => _ConditionPricePanelState();
}

class _ConditionPricePanelState extends State<ConditionPricePanel> {
  ConditionPriceReader? _reader;
  ConditionPriceReference? _price;
  bool _failed = false;
  int _generation = 0;

  bool get _selected =>
      (widget.printingId ?? '').isNotEmpty &&
      conditionPriceCodes.contains(widget.condition);

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ConditionPricePanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.printingId != oldWidget.printingId ||
        widget.condition != oldWidget.condition ||
        widget.createReader != oldWidget.createReader) {
      _load();
    }
  }

  void _load() {
    final generation = ++_generation;
    _reader?.dispose();
    _reader = null;
    _price = null;
    _failed = false;
    if (!_selected) return;
    unawaited(() async {
      try {
        final reader = widget.createReader?.call() ?? ConditionPriceService();
        _reader = reader;
        final price = await reader.read(widget.printingId!, widget.condition!);
        if (!mounted || generation != _generation) return;
        if (price.printingId != widget.printingId ||
            price.condition != widget.condition) {
          throw const FormatException('Condition price selection mismatch');
        }
        setState(() => _price = price);
      } catch (_) {
        if (mounted && generation == _generation) {
          setState(() => _failed = true);
        }
      } finally {
        if (generation == _generation) {
          _reader?.dispose();
          _reader = null;
        }
      }
    }());
  }

  @override
  void dispose() {
    _generation++;
    _reader?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondary = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final price = _price;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outlineVariant),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _selected
                  ? '${widget.condition} condition reference'
                  : 'Condition reference',
              style: secondary,
            ),
            const SizedBox(height: 4),
            if ((widget.printingId ?? '').isEmpty)
              const Text('Choose an exact printing to see its condition price.')
            else if (!_selected)
              const Text('Choose a condition to see its price.')
            else if (_failed) ...[
              const Text('Condition price could not load.'),
              TextButton(
                onPressed: () => setState(_load),
                child: const Text('Retry condition price'),
              ),
            ] else if (price == null)
              const Text('Loading condition price…')
            else if (price.amount != null) ...[
              Text(
                price.amount!
                    .toStringAsFixed(8)
                    .replaceFirst(RegExp(r'0{1,6}$'), ''),
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text('Reported amount · USD assumed', style: secondary),
            ] else
              Text('${widget.condition} price unavailable'),
            if (_selected) ...[
              const SizedBox(height: 4),
              Text('TCGplayer via TCGTracking', style: secondary),
              if (price?.updatedAt != null)
                Text(
                  'Updated ${MaterialLocalizations.of(context).formatShortDate(price!.updatedAt!.toLocal())}',
                  style: secondary,
                ),
            ],
          ],
        ),
      ),
    );
  }
}
