import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'models/card_print_price_curve.dart';

class CardDetailScreen extends StatefulWidget {
  final String cardPrintId;
  final String? name;
  final String? setName;
  final String? number;
  final String? imageUrl;
  final int? quantity;
  final String? condition;

  const CardDetailScreen({
    super.key,
    required this.cardPrintId,
    this.name,
    this.setName,
    this.number,
    this.imageUrl,
    this.quantity,
    this.condition,
  });

  @override
  State<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends State<CardDetailScreen> {
  final supabase = Supabase.instance.client;

  Map<String, dynamic>? _priceData;
  bool _priceLoading = false;
  String? _priceError;
  bool _requestingLivePrice = false;
  String? _livePriceRequestMessage;

  @override
  void initState() {
    super.initState();
    _loadPricing();
  }

  Future<void> _loadPricing() async {
    setState(() {
      _priceLoading = true;
      _priceError = null;
    });

    try {
      final response = await supabase
          .from('card_print_active_prices')
          .select()
          .eq('card_print_id', widget.cardPrintId)
          .maybeSingle();

      setState(() {
        _priceData = response;
      });
      // ignore: avoid_print
      print('[pricing] _loadPricing data for ${widget.cardPrintId}: $_priceData');
    } catch (e, st) {
      // Log the full error so we can diagnose it
      // ignore: avoid_print
      print('[pricing] _loadPricing error: $e');
      // ignore: avoid_print
      print(st);

      setState(() {
        _priceError = 'Failed to load pricing';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _priceLoading = false;
      });
    }
  }

  Future<void> _requestLivePrice() async {
    setState(() {
      _requestingLivePrice = true;
      _livePriceRequestMessage = null;
    });

    try {
      await supabase.from('pricing_jobs').insert({
        'card_print_id': widget.cardPrintId,
        'priority': 'user',
        'reason': 'live_price_request',
      });

      setState(() {
        _livePriceRequestMessage =
            'Live price requested. Check back after processing.';
      });
    } catch (e) {
      // ignore: avoid_print
      print('[pricing] live price insert failed: $e');
      setState(() {
        _livePriceRequestMessage = 'Failed to request live price.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _requestingLivePrice = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final name = widget.name ?? 'Card Detail';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeroImage(context),
              const SizedBox(height: 16),
              _buildTitleSection(theme, colorScheme),
              const SizedBox(height: 12),
              _buildMetaChips(theme, colorScheme),
              const SizedBox(height: 20),
              _buildPricingSection(theme, colorScheme),
              const SizedBox(height: 20),
              _buildDivider(theme),
              const SizedBox(height: 16),
              _buildInfoSection(theme, colorScheme),
              const SizedBox(height: 24),
              _buildActions(context, theme, colorScheme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroImage(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final url = (widget.imageUrl ?? '').toString();

    return Center(
      child: Container(
        decoration: BoxDecoration(
          color: colorScheme.surfaceVariant.withOpacity(0.5),
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.all(12),
        child: AspectRatio(
          aspectRatio: 3 / 4,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: url.isEmpty
                ? Container(
                    color: colorScheme.surfaceVariant,
                    child: const Icon(Icons.style, size: 48),
                  )
                : Image.network(
                    url,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: colorScheme.surfaceVariant,
                      child: const Icon(Icons.broken_image, size: 48),
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildTitleSection(ThemeData theme, ColorScheme colorScheme) {
    final subtitleParts = <String>[];
    final setName = widget.setName ?? '';
    final num = widget.number ?? '';
    if (setName.isNotEmpty) {
      subtitleParts.add(setName);
    }
    if (num.isNotEmpty) {
      subtitleParts.add('#$num');
    }
    final subtitle = subtitleParts.join(' • ');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.name ?? 'Card Detail',
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildMetaChips(ThemeData theme, ColorScheme colorScheme) {
    final chips = <Widget>[];
    final setName = widget.setName ?? '';
    final num = widget.number ?? '';
    final qty = widget.quantity;
    final condition = widget.condition;

    if (setName.isNotEmpty) {
      chips.add(_buildChip(
        label: setName,
        icon: Icons.layers,
        color: colorScheme.primary,
        theme: theme,
      ));
    }

    if (num.isNotEmpty) {
      chips.add(_buildChip(
        label: '#$num',
        icon: Icons.tag,
        color: colorScheme.secondary,
        theme: theme,
      ));
    }

    if (condition != null && condition.isNotEmpty) {
      chips.add(_buildChip(
        label: 'Condition: $condition',
        icon: Icons.grade,
        color: Colors.teal,
        theme: theme,
      ));
    }

    if (qty != null) {
      chips.add(_buildChip(
        label: 'Qty: $qty',
        icon: Icons.inventory_2,
        color: Colors.orange,
        theme: theme,
      ));
    }

    chips.add(_buildChip(
      label: 'ID: ${widget.cardPrintId}',
      icon: Icons.fingerprint,
      color: colorScheme.onSurface.withOpacity(0.6),
      theme: theme,
    ));

    if (chips.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: chips,
    );
  }

  Widget _buildChip({
    required String label,
    required IconData icon,
    required Color color,
    required ThemeData theme,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.8), width: 0.7),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Card details',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'This is a canonical print entry from your Grookai Vault catalog. '
          'Future updates will show live market pricing, trend graphs, and condition-based value curves here.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withOpacity(0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildPricingSection(ThemeData theme, ColorScheme colorScheme) {
    if (_priceLoading && _priceData == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 12),
              Text(
                'Loading Grookai Value…',
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      );
    }

    if (_priceError != null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Text(
            _priceError!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.error,
            ),
          ),
        ),
      );
    }

    if (_priceData == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Text(
            'No pricing data yet.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
        ),
      );
    }

    final data = _priceData!;
    final nmMedian = (data['nm_median'] ?? 0).toDouble();
    final nmFloor = (data['nm_floor'] ?? 0).toDouble();
    final lpMedian =
        data['lp_median'] != null ? (data['lp_median'] as num).toDouble() : null;
    final listingCount = (data['listing_count'] ?? 0) as int;
    final confidence = data['confidence'] as num?;
    const currency = 'USD';

    String formatMoney(double v) {
      return '\$${v.toStringAsFixed(2)} $currency';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Grookai Value (Active Listings)',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'NM median',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withOpacity(0.7),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formatMoney(nmMedian),
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (nmFloor > 0)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'NM floor',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          formatMoney(nmFloor),
                          style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            if (lpMedian != null) ...[
              const SizedBox(height: 8),
              Text(
                'LP median: ${formatMoney(lpMedian)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withOpacity(0.8),
                ),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              '$listingCount active listings used',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withOpacity(0.7),
              ),
            ),
            if (confidence != null) ...[
              const SizedBox(height: 2),
              Text(
                'Confidence: ${(confidence * 100).toStringAsFixed(0)}%',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withOpacity(0.7),
                ),
              ),
            ],
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                spacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: _requestingLivePrice ? null : _requestLivePrice,
                    icon: _requestingLivePrice
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.bolt),
                    label: const Text('Get live price'),
                  ),
                  TextButton.icon(
                    onPressed: _priceLoading ? null : _loadPricing,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                  ),
                ],
              ),
            ),
            if (_livePriceRequestMessage != null) ...[
              const SizedBox(height: 4),
              Text(
                _livePriceRequestMessage!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withOpacity(0.7),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDivider(ThemeData theme) {
    return Divider(
      thickness: 0.7,
      height: 1,
      color: theme.colorScheme.onSurface.withOpacity(0.12),
    );
  }

  Widget _buildActions(
      BuildContext context, ThemeData theme, ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Future: Add to Vault / actions.')),
            );
          },
          icon: const Icon(Icons.inventory_2),
          label: const Text('Vault actions (coming soon)'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Future: Live pricing.')),
            );
          },
          icon: const Icon(Icons.trending_up),
          label: const Text('Get live price (coming soon)'),
        ),
      ],
    );
  }
}
