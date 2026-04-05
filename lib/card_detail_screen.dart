import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/compare/compare_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'services/public/compare_service.dart';

class CardDetailScreen extends StatefulWidget {
  final String cardPrintId;
  final String? gvId;
  final String? name;
  final String? setName;
  final String? setCode;
  final String? number;
  final String? rarity;
  final String? imageUrl;
  final int? quantity;
  final String? condition;

  const CardDetailScreen({
    super.key,
    required this.cardPrintId,
    this.gvId,
    this.name,
    this.setName,
    this.setCode,
    this.number,
    this.rarity,
    this.imageUrl,
    this.quantity,
    this.condition,
  });

  @override
  State<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends State<CardDetailScreen> {
  static const double _sectionSpacing = 14;
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

  String _formatRarity(String? value) {
    final normalized = _cleanText(value);
    if (normalized.isEmpty) {
      return '';
    }

    return normalized
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .map((part) {
          final lower = part.toLowerCase();
          return '${lower[0].toUpperCase()}${lower.substring(1)}';
        })
        .join(' ');
  }

  String get _displayName {
    final resolved = _cleanText(widget.name);
    return resolved.isNotEmpty ? resolved : 'Card Detail';
  }

  Future<void> _openCompareWorkspace() async {
    final normalizedGvId = normalizeCompareCardId(widget.gvId ?? '');
    if (normalizedGvId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This card is missing a public GV-ID for compare.'),
        ),
      );
      return;
    }

    final controller = CompareCardSelectionController.instance;
    final selectedIds = controller.selectedIds;
    final isSelected = selectedIds.contains(normalizedGvId);
    if (!isSelected && selectedIds.length >= kMaxCompareCards) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Compare supports up to $kMaxCompareCards cards at a time.',
          ),
        ),
      );
      return;
    }

    controller.toggle(normalizedGvId);
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const CompareScreen()));
  }

  Future<void> _openSetDetail() async {
    final setCode = _cleanText(widget.setCode);
    if (setCode.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicSetDetailScreen(setCode: setCode),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bottomInset = MediaQuery.viewPaddingOf(context).bottom;

    return Scaffold(
      appBar: AppBar(
        title: Text(_displayName, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 20 + bottomInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeroImage(colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildIdentitySection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildPricingSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildActions(context, theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildPrintingsSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildCollectorNetworkSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildCardDetailsSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildOtherVersionsSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildSetContextSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildOwnershipSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildConditionSection(theme, colorScheme),
              const SizedBox(height: _sectionSpacing),
              _buildInSetSection(theme, colorScheme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroImage(ColorScheme colorScheme) {
    final url = (widget.imageUrl ?? '').toString();

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 268),
        child: Container(
          decoration: _surfaceDecoration(colorScheme, emphasize: true),
          padding: const EdgeInsets.all(14),
          child: Container(
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.55,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(10),
            child: AspectRatio(
              aspectRatio: 3 / 4,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: url.isEmpty
                    ? Container(
                        color: colorScheme.surfaceContainerHighest,
                        child: Icon(
                          Icons.style,
                          size: 48,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      )
                    : Image.network(
                        url,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => Container(
                          color: colorScheme.surfaceContainerHighest,
                          child: Icon(
                            Icons.broken_image,
                            size: 48,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
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
    final setCode = _cleanText(widget.setCode).toUpperCase();
    final collectorNumber = _cleanText(widget.number);
    final rarity = _formatRarity(widget.rarity);
    final outwardId = _cleanText(widget.gvId);
    final subtitleParts = <String>[];
    final metadataBadges = <Widget>[
      if (setCode.isNotEmpty)
        _buildInfoChip(label: setCode, tint: colorScheme.primary, theme: theme),
      if (collectorNumber.isNotEmpty)
        _buildInfoChip(
          label: '#$collectorNumber',
          tint: colorScheme.secondary,
          theme: theme,
        ),
      if (rarity.isNotEmpty)
        _buildInfoChip(
          label: rarity,
          tint: _rarityAccentColor(colorScheme, rarity),
          theme: theme,
        ),
    ];

    if (setName.isNotEmpty) {
      subtitleParts.add(setName);
    }
    if (collectorNumber.isNotEmpty) {
      subtitleParts.add('#$collectorNumber');
    }

    return _buildSurface(
      colorScheme: colorScheme,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _displayName,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
              height: 1.1,
            ),
          ),
          if (subtitleParts.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              subtitleParts.join(' • '),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface.withValues(alpha: 0.72),
                height: 1.25,
              ),
            ),
          ],
          if (metadataBadges.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: metadataBadges),
          ],
          if (outwardId.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                outwardId,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOwnershipSection(ThemeData theme, ColorScheme colorScheme) {
    final ownershipChips = _buildOwnershipChips(theme);

    return _buildSurface(
      colorScheme: colorScheme,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Your Vault', theme, colorScheme),
          const SizedBox(height: 10),
          Text(
            'Existing ownership',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            ownershipChips.isEmpty
                ? 'Vault ownership for this card will appear here when the Flutter route is opened from a vault-backed context.'
                : 'Condition and quantity already available on this card.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.35,
            ),
          ),
          if (ownershipChips.isNotEmpty) ...[
            const SizedBox(height: 16),
            Wrap(spacing: 8, runSpacing: 8, children: ownershipChips),
          ],
        ],
      ),
    );
  }

  Widget _buildSurface({
    required ColorScheme colorScheme,
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(14),
    bool emphasize = false,
  }) {
    return Container(
      decoration: _surfaceDecoration(colorScheme, emphasize: emphasize),
      padding: padding,
      child: child,
    );
  }

  BoxDecoration _surfaceDecoration(
    ColorScheme colorScheme, {
    bool emphasize = false,
  }) {
    return BoxDecoration(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(
        color: colorScheme.outlineVariant.withValues(
          alpha: emphasize ? 0.6 : 0.45,
        ),
      ),
      boxShadow: [
        BoxShadow(
          color: colorScheme.shadow.withValues(alpha: emphasize ? 0.1 : 0.06),
          blurRadius: emphasize ? 18 : 10,
          offset: Offset(0, emphasize ? 8 : 4),
        ),
      ],
    );
  }

  Widget _buildSectionLabel(
    String label,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return Text(
      label.toUpperCase(),
      style: theme.textTheme.labelMedium?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: 1.0,
        color: colorScheme.onSurface.withValues(alpha: 0.58),
      ),
    );
  }

  Widget _buildInfoChip({
    required String label,
    required Color tint,
    required ThemeData theme,
    IconData? icon,
  }) {
    return Container(
      constraints: const BoxConstraints(minHeight: 30),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tint.withValues(alpha: 0.24)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: tint),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: tint,
              height: 1.0,
            ),
          ),
        ],
      ),
    );
  }

  Color _rarityAccentColor(ColorScheme colorScheme, String rarity) {
    final lower = rarity.toLowerCase();
    if (lower.contains('secret')) {
      return Colors.amber.shade800;
    }
    if (lower.contains('ultra')) {
      return Colors.deepPurple;
    }
    if (lower.contains('rare')) {
      return Colors.blue;
    }
    if (lower.contains('uncommon')) {
      return Colors.green;
    }
    if (lower.contains('common')) {
      return Colors.grey.shade700;
    }
    return colorScheme.tertiary;
  }

  List<Widget> _buildOwnershipChips(ThemeData theme) {
    final chips = <Widget>[];
    final condition = _cleanText(widget.condition);
    final quantity = widget.quantity;

    if (condition.isNotEmpty) {
      chips.add(
        _buildInfoChip(
          label: 'Condition $condition',
          icon: Icons.grade_outlined,
          tint: Colors.teal.shade700,
          theme: theme,
        ),
      );
    }

    if (quantity != null) {
      chips.add(
        _buildInfoChip(
          label: 'Qty $quantity',
          icon: Icons.inventory_2_outlined,
          tint: Colors.orange.shade800,
          theme: theme,
        ),
      );
    }

    return chips;
  }

  Widget _buildPlaceholderSection({
    required String label,
    required String title,
    required String body,
    required ThemeData theme,
    required ColorScheme colorScheme,
    Widget? child,
  }) {
    return _buildSurface(
      colorScheme: colorScheme,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel(label, theme, colorScheme),
          const SizedBox(height: 8),
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.3,
            ),
          ),
          if (child != null) ...[const SizedBox(height: 12), child],
        ],
      ),
    );
  }

  Widget _buildMetadataTile({
    required String label,
    required String value,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.62),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrintingsSection(ThemeData theme, ColorScheme colorScheme) {
    return _buildPlaceholderSection(
      label: 'Printings',
      title: 'Printing selector',
      body: 'Alternate printings are not wired in Flutter yet.',
      theme: theme,
      colorScheme: colorScheme,
    );
  }

  Widget _buildCollectorNetworkSection(
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return _buildPlaceholderSection(
      label: 'Collector Network',
      title: 'Collector offers',
      body: 'Collector offers will appear here once the network read is wired.',
      theme: theme,
      colorScheme: colorScheme,
    );
  }

  Widget _buildCardDetailsSection(ThemeData theme, ColorScheme colorScheme) {
    final detailTiles = <Widget>[
      if (_cleanText(widget.setName).isNotEmpty)
        _buildMetadataTile(
          label: 'Set',
          value: _cleanText(widget.setName),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (_cleanText(widget.setCode).isNotEmpty)
        _buildMetadataTile(
          label: 'Set Code',
          value: _cleanText(widget.setCode).toUpperCase(),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (_cleanText(widget.number).isNotEmpty)
        _buildMetadataTile(
          label: 'Number',
          value: _cleanText(widget.number),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (_formatRarity(widget.rarity).isNotEmpty)
        _buildMetadataTile(
          label: 'Rarity',
          value: _formatRarity(widget.rarity),
          theme: theme,
          colorScheme: colorScheme,
        ),
      _buildMetadataTile(
        label: 'Card ID',
        value: widget.cardPrintId,
        theme: theme,
        colorScheme: colorScheme,
      ),
      if (_cleanText(widget.gvId).isNotEmpty)
        _buildMetadataTile(
          label: 'GV-ID',
          value: _cleanText(widget.gvId),
          theme: theme,
          colorScheme: colorScheme,
        ),
    ];

    return _buildPlaceholderSection(
      label: 'Card Details',
      title: 'Catalog details',
      body: 'Identity and card traits surfaced from the current Flutter data.',
      theme: theme,
      colorScheme: colorScheme,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final halfWidth = (constraints.maxWidth - 12) / 2;
          final tileWidth = halfWidth < 140 ? constraints.maxWidth : halfWidth;
          return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: detailTiles
                .map((tile) => SizedBox(width: tileWidth, child: tile))
                .toList(),
          );
        },
      ),
    );
  }

  Widget _buildOtherVersionsSection(ThemeData theme, ColorScheme colorScheme) {
    return _buildPlaceholderSection(
      label: 'Other Versions',
      title: 'Other versions of this card',
      body: 'Related prints will appear here after later catalog wiring.',
      theme: theme,
      colorScheme: colorScheme,
    );
  }

  Widget _buildSetContextSection(ThemeData theme, ColorScheme colorScheme) {
    final setName = _cleanText(widget.setName);
    final setCode = _cleanText(widget.setCode).toUpperCase();
    final tiles = <Widget>[
      if (setName.isNotEmpty)
        _buildMetadataTile(
          label: 'Set Name',
          value: setName,
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (setCode.isNotEmpty)
        _buildMetadataTile(
          label: 'Set Code',
          value: setCode,
          theme: theme,
          colorScheme: colorScheme,
        ),
    ];

    return _buildPlaceholderSection(
      label: 'About This Set',
      title: setName.isNotEmpty ? setName : 'Set context',
      body: tiles.isEmpty
          ? 'Set context will appear here once Flutter carries the broader set contract.'
          : 'Context for this set.',
      theme: theme,
      colorScheme: colorScheme,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (tiles.isNotEmpty)
            LayoutBuilder(
              builder: (context, constraints) {
                final halfWidth = (constraints.maxWidth - 12) / 2;
                final tileWidth = halfWidth < 140
                    ? constraints.maxWidth
                    : halfWidth;
                return Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: tiles
                      .map((tile) => SizedBox(width: tileWidth, child: tile))
                      .toList(),
                );
              },
            ),
          if (setCode.isNotEmpty) ...[
            if (tiles.isNotEmpty) const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _openSetDetail,
              style: _secondaryButtonStyle(theme, colorScheme),
              icon: const Icon(Icons.grid_view_rounded),
              label: Text(setName.isNotEmpty ? 'Browse $setCode' : 'Open set'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildConditionSection(ThemeData theme, ColorScheme colorScheme) {
    return _buildPlaceholderSection(
      label: 'Condition',
      title: 'Condition snapshots',
      body: 'Condition history is not wired in Flutter yet.',
      theme: theme,
      colorScheme: colorScheme,
    );
  }

  Widget _buildInSetSection(ThemeData theme, ColorScheme colorScheme) {
    return _buildPlaceholderSection(
      label: 'In This Set',
      title: 'Nearby cards',
      body: 'Nearby cards from the same set will appear here later.',
      theme: theme,
      colorScheme: colorScheme,
    );
  }

  Widget _buildPricingSection(ThemeData theme, ColorScheme colorScheme) {
    if (_priceLoading && _priceData == null) {
      return _buildSurface(
        colorScheme: colorScheme,
        child: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 12),
            Text(
              'Loading price…',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.78),
              ),
            ),
          ],
        ),
      );
    }

    if (_priceError != null) {
      return _buildSurface(
        colorScheme: colorScheme,
        child: Text(
          _priceError!,
          style: theme.textTheme.bodyMedium?.copyWith(color: colorScheme.error),
        ),
      );
    }

    if (_priceData == null) {
      return _buildSurface(
        colorScheme: colorScheme,
        child: Text(
          'No pricing data yet.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.72),
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
    final metricTiles = <Widget>[
      if (nmFloor > 0)
        _buildPricingMetricTile(
          label: 'NM floor',
          value: _formatMoney(nmFloor, currency),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (lpMedian != null)
        _buildPricingMetricTile(
          label: 'LP median',
          value: _formatMoney(lpMedian, currency),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (showListings)
        _buildPricingMetricTile(
          label: 'Listings',
          value: '$listingCount',
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (showUpdated)
        _buildPricingMetricTile(
          label: 'Updated',
          value: _formatAge(freshnessTs),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (confidence != null)
        _buildPricingMetricTile(
          label: 'Confidence',
          value: '${(confidence * 100).toStringAsFixed(0)}%',
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (rawPriceSource != null && rawPriceSource.isNotEmpty)
        _buildPricingMetricTile(
          label: 'Source',
          value: rawPriceSource,
          theme: theme,
          colorScheme: colorScheme,
        ),
    ];

    return _buildSurface(
      colorScheme: colorScheme,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Pricing', theme, colorScheme),
          const SizedBox(height: 8),
          Text(
            'Latest price',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          _buildPrimaryPriceValue(
            value: rawPrice ?? nmMedian,
            currency: currency,
            theme: theme,
            colorScheme: colorScheme,
          ),
          if (metricTiles.isNotEmpty) ...[
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final halfWidth = (constraints.maxWidth - 12) / 2;
                final tileWidth = halfWidth < 140
                    ? constraints.maxWidth
                    : halfWidth;

                return Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: metricTiles
                      .map((tile) => SizedBox(width: tileWidth, child: tile))
                      .toList(),
                );
              },
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              OutlinedButton.icon(
                onPressed: _requestingLivePrice ? null : _requestLivePrice,
                style: _secondaryButtonStyle(theme, colorScheme),
                icon: _requestingLivePrice
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.bolt),
                label: const Text('Get live price'),
              ),
              OutlinedButton.icon(
                onPressed: _priceLoading ? null : _loadPricing,
                style: _secondaryButtonStyle(theme, colorScheme),
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),
          if (_livePriceRequestMessage != null) ...[
            const SizedBox(height: 6),
            Text(
              _livePriceRequestMessage!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.7),
                height: 1.35,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatMoney(double value, String currency) {
    return '\$${value.toStringAsFixed(2)} $currency';
  }

  String _formatAge(DateTime ts) {
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

  Widget _buildPrimaryPriceValue({
    required double value,
    required String currency,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '\$',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface.withValues(alpha: 0.72),
            ),
          ),
          TextSpan(
            text: value.toStringAsFixed(2),
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: colorScheme.onSurface,
              letterSpacing: -0.6,
            ),
          ),
          TextSpan(
            text: ' $currency',
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface.withValues(alpha: 0.62),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPricingMetricTile({
    required String label,
    required String value,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.62),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  ButtonStyle _secondaryButtonStyle(ThemeData theme, ColorScheme colorScheme) {
    return OutlinedButton.styleFrom(
      minimumSize: const Size(0, 40),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      side: BorderSide(
        color: colorScheme.outlineVariant.withValues(alpha: 0.9),
      ),
      foregroundColor: colorScheme.onSurface,
      textStyle: theme.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
      ),
    );
  }

  ButtonStyle _primaryActionButtonStyle(ThemeData theme) {
    return FilledButton.styleFrom(
      minimumSize: const Size.fromHeight(44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      textStyle: theme.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
      ),
    );
  }

  ButtonStyle _secondaryActionButtonStyle(
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      side: BorderSide(
        color: colorScheme.outlineVariant.withValues(alpha: 0.9),
      ),
      textStyle: theme.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _buildActions(
    BuildContext context,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        FilledButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Add to Vault coming soon.')),
            );
          },
          style: _primaryActionButtonStyle(theme),
          icon: const Icon(Icons.inventory_2_outlined),
          label: const Text('Add to Vault'),
        ),
        OutlinedButton.icon(
          onPressed: _openCompareWorkspace,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.compare_arrows_rounded),
          label: const Text('Compare'),
        ),
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(const SnackBar(content: Text('Share coming soon.')));
          },
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.share_outlined),
          label: const Text('Share'),
        ),
      ],
    );
  }
}
