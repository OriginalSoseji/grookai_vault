import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CardDetailScreen extends StatefulWidget {
  final String cardPrintId;
  final String? gvId;
  final String? name;
  final String? setName;
  final String? number;
  final String? imageUrl;
  final int? quantity;
  final String? condition;

  const CardDetailScreen({
    super.key,
    required this.cardPrintId,
    this.gvId,
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
  static const double _sectionSpacing = 20;
  final supabase = Supabase.instance.client;

  Map<String, dynamic>? _priceData;
  bool _priceLoading = false;
  String? _priceError;
  bool _requestingLivePrice = false;
  String? _livePriceRequestMessage;

  int _ttlMinutesForListings(int listingCount) {
    if (listingCount >= 40) return 30;
    if (listingCount >= 15) return 120;
    if (listingCount >= 5) return 360;
    return 1440;
  }

  @override
  void initState() {
    super.initState();
    _loadPricing();
  }

  Future<Map<String, dynamic>?> _fetchCanonicalRawPricing() async {
    // Phase 1 canonical raw read contract:
    // - raw price value/source/timestamp come from v_best_prices_all_gv_v1
    // - optional freshness metadata and active-listing stats come from card_print_active_prices
    final results = await Future.wait<dynamic>([
      supabase
          .from('v_best_prices_all_gv_v1')
          .select('card_id,base_market,base_source,base_ts')
          .eq('card_id', widget.cardPrintId)
          .maybeSingle(),
      supabase
          .from('card_print_active_prices')
          .select(
            'card_print_id,nm_median,nm_floor,lp_median,listing_count,confidence,updated_at,last_snapshot_at',
          )
          .eq('card_print_id', widget.cardPrintId)
          .maybeSingle(),
    ]);

    final compatibilityRow = results[0] as Map<String, dynamic>?;
    final activePriceRow = results[1] as Map<String, dynamic>?;

    if (compatibilityRow == null && activePriceRow == null) {
      return null;
    }

    final rawPrice = (compatibilityRow?['base_market'] as num?)?.toDouble();
    final rawPriceSource = compatibilityRow?['base_source'] as String?;
    final rawPriceTs = compatibilityRow?['base_ts'] as String?;
    final activeUpdatedAt = activePriceRow?['updated_at'] as String?;
    final lastSnapshotAt = activePriceRow?['last_snapshot_at'] as String?;

    return {
      'card_print_id': widget.cardPrintId,
      'raw_price': rawPrice,
      'raw_price_source': rawPrice != null ? rawPriceSource : null,
      'raw_price_ts': rawPrice != null ? rawPriceTs : null,
      'listing_count': activePriceRow?['listing_count'],
      'confidence': activePriceRow?['confidence'],
      'active_price_updated_at': activeUpdatedAt,
      'last_snapshot_at': lastSnapshotAt,
      // Compatibility aliases retained locally while the UI still uses Grookai
      // Value copy and active-listing detail labels.
      'latest_price': rawPrice,
      'price_source': rawPrice != null ? rawPriceSource : null,
      'updated_at': rawPrice != null ? rawPriceTs : null,
      // Existing active-listing detail fields remain available so the current
      // pricing card can keep its supporting context without changing the
      // canonical raw-price seam.
      'nm_median': activePriceRow?['nm_median'],
      'nm_floor': activePriceRow?['nm_floor'],
      'lp_median': activePriceRow?['lp_median'],
    };
  }

  Future<void> _loadPricing() async {
    setState(() {
      _priceLoading = true;
      _priceError = null;
    });

    try {
      final response = await _fetchCanonicalRawPricing();

      setState(() {
        _priceData = response;
      });
      // ignore: avoid_print
      print(
        '[pricing] _loadPricing data for ${widget.cardPrintId}: $_priceData',
      );
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
      if (mounted) {
        setState(() {
          _priceLoading = false;
        });
      }
    }
  }

  Future<void> _requestLivePrice() async {
    setState(() {
      _requestingLivePrice = true;
      _livePriceRequestMessage = null;
    });

    try {
      final data = _priceData;
      if (data != null) {
        String formatAgeMinutes(int totalMinutes) {
          if (totalMinutes < 60) return '${totalMinutes}m';
          if (totalMinutes < 1440) return '${(totalMinutes / 60).floor()}h';
          return '${(totalMinutes / 1440).floor()}d';
        }

        final listingCount = (data['listing_count'] as num?)?.toInt() ?? 0;
        final lastSnapshotAtRaw = data['last_snapshot_at'] as String?;
        final activeUpdatedAtRaw = data['active_price_updated_at'] as String?;
        final rawPriceTs = data['raw_price_ts'] as String?;
        final freshnessRaw =
            rawPriceTs ?? activeUpdatedAtRaw ?? lastSnapshotAtRaw;
        final freshnessTs = freshnessRaw != null
            ? DateTime.tryParse(freshnessRaw)
            : null;

        if (listingCount > 0 && freshnessTs != null) {
          final rawAgeMinutes = DateTime.now()
              .toUtc()
              .difference(freshnessTs.toUtc())
              .inMinutes;
          final ageMinutes = rawAgeMinutes < 0 ? 0 : rawAgeMinutes;
          final ttlMinutes = _ttlMinutesForListings(listingCount);
          if (ageMinutes < ttlMinutes) {
            final remainingMinutes = ttlMinutes - ageMinutes;
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Live price is fresh (Updated ${formatAgeMinutes(ageMinutes)} ago). Next refresh in ~${formatAgeMinutes(remainingMinutes)}.',
                  ),
                ),
              );
            }
            return;
          }
        }
      }

      final response = await supabase.functions.invoke(
        'pricing-live-request',
        body: {'card_print_id': widget.cardPrintId},
      );
      if (response.status < 200 || response.status >= 300) {
        throw Exception(
          'pricing-live-request failed: status=${response.status}, data=${response.data}',
        );
      }

      final payload = response.data;
      final status = payload is Map<String, dynamic>
          ? payload['status'] as String?
          : null;

      var requestMessage = 'Live price requested. Check back after processing.';
      if (status == 'fresh') {
        requestMessage = 'Current Grookai Value is still fresh.';
      } else if (status == 'already_queued') {
        requestMessage = 'A live price refresh is already queued.';
      } else if (status == 'cooldown') {
        requestMessage = 'Live price was requested recently. Try again later.';
      }

      setState(() {
        _livePriceRequestMessage = requestMessage;
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

  String _cleanText(String? value) => (value ?? '').trim();

  String get _displayName {
    final resolved = _cleanText(widget.name);
    return resolved.isNotEmpty ? resolved : 'Card Detail';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(_displayName, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeroImage(context),
              const SizedBox(height: _sectionSpacing),
              _buildIdentitySection(theme, theme.colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildPricingSection(theme, theme.colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildActions(context, theme, theme.colorScheme),
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
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 280),
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: colorScheme.onSurface.withValues(alpha: 0.08),
            ),
          ),
          padding: const EdgeInsets.all(16),
          child: AspectRatio(
            aspectRatio: 3 / 4,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: url.isEmpty
                  ? Container(
                      color: colorScheme.surfaceContainerHighest,
                      child: const Icon(Icons.style, size: 48),
                    )
                  : Image.network(
                      url,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: colorScheme.surfaceContainerHighest,
                        child: const Icon(Icons.broken_image, size: 48),
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIdentitySection(ThemeData theme, ColorScheme colorScheme) {
    final setName = _cleanText(widget.setName);
    final collectorNumber = _cleanText(widget.number);
    final outwardId = _cleanText(widget.gvId);
    final supportChips = _buildSupportChips(theme);
    final identityChips = <Widget>[];

    if (collectorNumber.isNotEmpty) {
      identityChips.add(
        _buildChip(
          label: 'Collector No. #$collectorNumber',
          icon: Icons.tag,
          color: colorScheme.secondary,
          theme: theme,
        ),
      );
    }

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _displayName,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            if (setName.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                setName,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface.withValues(alpha: 0.76),
                ),
              ),
            ],
            if (identityChips.isNotEmpty) ...[
              const SizedBox(height: 14),
              Wrap(spacing: 8, runSpacing: 8, children: identityChips),
            ],
            const SizedBox(height: 14),
            _buildIdentityValue(
              label: outwardId.isNotEmpty ? 'GV-ID' : 'Card ID',
              value: outwardId.isNotEmpty ? outwardId : widget.cardPrintId,
              theme: theme,
              colorScheme: colorScheme,
            ),
            if (supportChips.isNotEmpty) ...[
              const SizedBox(height: 16),
              Wrap(spacing: 8, runSpacing: 8, children: supportChips),
            ],
          ],
        ),
      ),
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
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.8), width: 0.7),
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

  List<Widget> _buildSupportChips(ThemeData theme) {
    final chips = <Widget>[];
    final condition = _cleanText(widget.condition);
    final quantity = widget.quantity;

    if (condition.isNotEmpty) {
      chips.add(
        _buildChip(
          label: 'Condition: $condition',
          icon: Icons.grade,
          color: Colors.teal,
          theme: theme,
        ),
      );
    }

    if (quantity != null) {
      chips.add(
        _buildChip(
          label: 'Qty: $quantity',
          icon: Icons.inventory_2,
          color: Colors.orange,
          theme: theme,
        ),
      );
    }

    return chips;
  }

  Widget _buildIdentityValue({
    required String label,
    required String value,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.6),
            fontWeight: FontWeight.w600,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface.withValues(alpha: 0.82),
          ),
        ),
      ],
    );
  }

  Widget _buildPricingSection(ThemeData theme, ColorScheme colorScheme) {
    if (_priceLoading && _priceData == null) {
      return Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 12),
              Text('Loading Grookai Value…', style: theme.textTheme.bodyMedium),
            ],
          ),
        ),
      );
    }

    if (_priceError != null) {
      return Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
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
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'No pricing data yet.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ),
      );
    }

    final data = _priceData!;
    final rawPrice = (data['raw_price'] as num?)?.toDouble();
    final rawPriceSource = data['raw_price_source'] as String?;
    final nmMedian = (data['nm_median'] ?? 0).toDouble();
    final nmFloor = (data['nm_floor'] ?? 0).toDouble();
    final lpMedian = data['lp_median'] != null
        ? (data['lp_median'] as num).toDouble()
        : null;
    final listingCount = (data['listing_count'] as num?)?.toInt() ?? 0;
    final confidence = data['confidence'] as num?;
    final rawPriceTs = data['raw_price_ts'] as String?;
    final activeUpdatedAtRaw = data['active_price_updated_at'] as String?;
    final lastSnapshotAtRaw = data['last_snapshot_at'] as String?;
    final freshnessRaw = rawPriceTs ?? activeUpdatedAtRaw ?? lastSnapshotAtRaw;
    final freshnessTs = freshnessRaw != null
        ? DateTime.tryParse(freshnessRaw)
        : null;
    final showListings = listingCount > 0;
    final showUpdated = freshnessTs != null;
    const currency = 'USD';

    String formatMoney(double v) {
      return '\$${v.toStringAsFixed(2)} $currency';
    }

    String formatAge(DateTime ts) {
      final age = DateTime.now().toUtc().difference(ts.toUtc());
      if (age.isNegative || age.inMinutes < 1) {
        return '0m ago';
      }
      if (age.inMinutes < 60) {
        return '${age.inMinutes}m ago';
      }
      if (age.inHours < 24) {
        return '${age.inHours}h ago';
      }
      if (age.inHours < 48) {
        return '1d ago';
      }
      return '${age.inDays}d ago';
    }

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pricing',
              style: theme.textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.7),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Grookai Value (Active Listings)',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Grookai Value',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.7),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formatMoney(rawPrice ?? nmMedian),
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
                            color: colorScheme.onSurface.withValues(alpha: 0.7),
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
                  color: colorScheme.onSurface.withValues(alpha: 0.8),
                ),
              ),
            ],
            if (showListings) ...[
              const SizedBox(height: 8),
              Text(
                'Listings: $listingCount',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
            if (rawPriceSource != null && rawPriceSource.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                'Source: $rawPriceSource',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
            if (showUpdated) ...[
              const SizedBox(height: 2),
              Text(
                'Updated: ${formatAge(freshnessTs)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
            if (confidence != null) ...[
              SizedBox(height: (showListings || showUpdated) ? 2 : 8),
              Text(
                'Confidence: ${(confidence * 100).toStringAsFixed(0)}%',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
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
                  color: colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActions(
    BuildContext context,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Actions',
          style: theme.textTheme.labelLarge?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.7),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Add to Vault coming soon.')),
                  );
                },
                icon: const Icon(Icons.inventory_2),
                label: const Text('Add to Vault'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Share coming soon.')),
                  );
                },
                icon: const Icon(Icons.share_outlined),
                label: const Text('Share'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
