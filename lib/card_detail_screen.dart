import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'screens/compare/compare_screen.dart';
import 'screens/gvvi/public_gvvi_screen.dart';
import 'screens/network/network_inbox_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'screens/vault/vault_gvvi_screen.dart';
import 'services/public/compare_service.dart';
import 'widgets/card_surface_artwork.dart';
import 'widgets/contact_owner_button.dart';

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
  final String? contactVaultItemId;
  final String? contactOwnerDisplayName;
  final String? contactOwnerUserId;
  final String? contactIntent;
  final String? exactCopyGvviId;
  final String? exactCopyOwnerUserId;

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
    this.contactVaultItemId,
    this.contactOwnerDisplayName,
    this.contactOwnerUserId,
    this.contactIntent,
    this.exactCopyGvviId,
    this.exactCopyOwnerUserId,
  });

  @override
  State<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends State<CardDetailScreen> {
  static const double _sectionSpacing = 6;
  final supabase = Supabase.instance.client;

  Map<String, dynamic>? _cardContextData;
  Map<String, dynamic>? _priceData;
  List<Map<String, dynamic>> _relatedVersions = const [];
  bool _priceLoading = false;
  String? _priceError;

  @override
  void initState() {
    super.initState();
    _loadCardContext();
    _loadPricing();
  }

  Future<void> _loadCardContext() async {
    try {
      final detailRow = await supabase
          .from('card_prints')
          .select(
            'id,gv_id,name,number,number_plain,rarity,artist,variant_key,set_code,sets(name,printed_total,release_date,printed_set_abbrev)',
          )
          .eq('id', widget.cardPrintId)
          .maybeSingle();

      final contextData = detailRow == null
          ? null
          : Map<String, dynamic>.from(detailRow);
      final contextName = _cleanText(contextData?['name']);
      final resolvedName = contextName.isNotEmpty ? contextName : _displayName;

      List<Map<String, dynamic>> relatedRows = const [];
      if (resolvedName.isNotEmpty) {
        final response = await supabase
            .from('card_prints')
            .select(
              'id,gv_id,name,set_code,number,number_plain,rarity,image_url,image_alt_url,sets(name,release_date)',
            )
            .eq('name', resolvedName)
            .neq('id', widget.cardPrintId)
            .not('gv_id', 'is', null)
            .order('set_code', ascending: true)
            .order('number_plain', ascending: true, nullsFirst: false)
            .order('number', ascending: true)
            .limit(20);

        relatedRows = (response as List<dynamic>)
            .map((row) => Map<String, dynamic>.from(row as Map))
            .where((row) => _cleanText(row['id']).isNotEmpty)
            .toList();
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _cardContextData = contextData;
        _relatedVersions = relatedRows;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _cardContextData = null;
        _relatedVersions = const [];
      });
    }
  }

  Future<Map<String, dynamic>?> _fetchPricingUi() async {
    final row = await supabase
        .from('v_card_pricing_ui_v1')
        .select(
          'card_print_id,primary_price,primary_source,grookai_value,min_price,max_price,variant_count,ebay_median_price,ebay_listing_count',
        )
        .eq('card_print_id', widget.cardPrintId)
        .maybeSingle();

    if (row == null) {
      return null;
    }

    return Map<String, dynamic>.from(row);
  }

  Future<void> _loadPricing() async {
    setState(() {
      _priceLoading = true;
      _priceError = null;
    });

    try {
      final response = await _fetchPricingUi();
      if (!mounted) {
        return;
      }

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
    final contextName = _cleanText(_cardContextData?['name']);
    if (contextName.isNotEmpty) {
      return contextName;
    }
    return resolved.isNotEmpty ? resolved : 'Card Detail';
  }

  bool get _hasContactContext =>
      _cleanText(widget.contactVaultItemId).isNotEmpty &&
      _cleanText(widget.contactOwnerDisplayName).isNotEmpty;

  bool get _hasVaultContext =>
      widget.quantity != null || _cleanText(widget.condition).isNotEmpty;

  bool get _hasExactCopyContext =>
      _cleanText(widget.exactCopyGvviId).isNotEmpty;

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
    final setCode = _resolvedSetCode;
    if (setCode.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicSetDetailScreen(setCode: setCode),
      ),
    );
  }

  Future<void> _openExactCopy() async {
    final gvviId = _cleanText(widget.exactCopyGvviId);
    if (gvviId.isEmpty) {
      return;
    }

    final currentUserId = supabase.auth.currentUser?.id;
    final isOwner =
        currentUserId != null &&
        currentUserId == _cleanText(widget.exactCopyOwnerUserId);

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => isOwner
            ? VaultGvviScreen(gvviId: gvviId)
            : PublicGvviScreen(gvviId: gvviId),
      ),
    );
  }

  Map<String, dynamic>? _extractRecord(dynamic rawValue) {
    if (rawValue is List && rawValue.isNotEmpty && rawValue.first is Map) {
      return Map<String, dynamic>.from(rawValue.first as Map);
    }

    if (rawValue is Map) {
      return Map<String, dynamic>.from(rawValue);
    }

    return null;
  }

  String _bestImageUrl({dynamic primary, dynamic fallback}) {
    final primaryText = _cleanText(primary?.toString());
    if (primaryText.isNotEmpty) {
      return primaryText;
    }
    return _cleanText(fallback?.toString());
  }

  String get _resolvedSetName {
    final contextSet = _extractRecord(_cardContextData?['sets']);
    final fromContext = _cleanText(contextSet?['name']);
    if (fromContext.isNotEmpty) {
      return fromContext;
    }
    return _cleanText(widget.setName);
  }

  String get _resolvedSetCode {
    final fromContext = _cleanText(_cardContextData?['set_code']);
    if (fromContext.isNotEmpty) {
      return fromContext;
    }
    return _cleanText(widget.setCode);
  }

  String get _resolvedCollectorNumber {
    final fromPlain = _cleanText(_cardContextData?['number_plain']);
    if (fromPlain.isNotEmpty) {
      return fromPlain;
    }

    final fromWidget = _cleanText(widget.number);
    if (fromWidget.isNotEmpty) {
      return fromWidget;
    }

    return _cleanText(_cardContextData?['number']);
  }

  String? get _collectorIdentityLine {
    final setRecord = _extractRecord(_cardContextData?['sets']);
    final printedTotal = setRecord?['printed_total'] is num
        ? (setRecord!['printed_total'] as num).toInt()
        : null;
    final printedSetAbbrev = _cleanText(
      setRecord?['printed_set_abbrev'],
    ).toUpperCase();
    final setPrefix = printedSetAbbrev.isNotEmpty
        ? printedSetAbbrev
        : _resolvedSetCode.toUpperCase();
    final collectorNumber = _resolvedCollectorNumber;

    final identityParts = <String>[
      if (setPrefix.isNotEmpty) setPrefix,
      if (collectorNumber.isNotEmpty)
        printedTotal != null
            ? '$collectorNumber/$printedTotal'
            : '#$collectorNumber',
    ];
    if (identityParts.isEmpty) {
      return null;
    }
    return identityParts.join(' ');
  }

  int get _relatedVersionDisplayCount {
    final fromPricing = (_priceData?['variant_count'] as num?)?.toInt();
    final fromLoaded = _relatedVersions.isEmpty
        ? 0
        : _relatedVersions.length + 1;
    if (fromPricing == null) {
      return fromLoaded;
    }
    return fromLoaded > fromPricing ? fromLoaded : fromPricing;
  }

  int? get _printedTotalInSet {
    final setRecord = _extractRecord(_cardContextData?['sets']);
    final printedTotal = setRecord?['printed_total'];
    if (printedTotal is num) {
      return printedTotal.toInt();
    }
    return null;
  }

  int? get _listingCount {
    final rawValue = _priceData?['ebay_listing_count'];
    if (rawValue is num) {
      final value = rawValue.toInt();
      return value > 0 ? value : null;
    }
    return null;
  }

  String? get _topMarketSignalLabel {
    final listingCount = _listingCount;
    if (listingCount == null) {
      return null;
    }
    return '$listingCount listing${listingCount == 1 ? '' : 's'}';
  }

  String? _formatReleaseDateLabel(dynamic rawValue) {
    final rawText = _cleanText(rawValue?.toString());
    if (rawText.isEmpty) {
      return null;
    }

    final parsed = DateTime.tryParse(rawText);
    if (parsed == null) {
      return rawText;
    }

    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final month = months[parsed.month - 1];
    return '$month ${parsed.day}, ${parsed.year}';
  }

  List<MapEntry<String, String>> _buildDetailEntries() {
    final entries = <MapEntry<String, String>>[];
    final illustrator = _cleanText(_cardContextData?['artist']);
    final variantKey = _cleanText(_cardContextData?['variant_key']);
    final setRecord = _extractRecord(_cardContextData?['sets']);
    final printedTotal = setRecord?['printed_total'] is num
        ? (setRecord!['printed_total'] as num).toInt()
        : null;
    final releaseDate = _formatReleaseDateLabel(setRecord?['release_date']);

    if (illustrator.isNotEmpty) {
      entries.add(MapEntry('Illustrator', illustrator));
    }
    if (variantKey.isNotEmpty && variantKey.toLowerCase() != 'base') {
      entries.add(MapEntry('Variant', variantKey));
    }
    if (printedTotal != null) {
      entries.add(MapEntry('Printed Total', '$printedTotal cards'));
    }
    if (releaseDate != null) {
      entries.add(MapEntry('Release Date', releaseDate));
    }

    return entries;
  }

  Future<void> _openOtherVersions() async {
    if (_relatedVersions.isEmpty) {
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        final theme = Theme.of(context);
        final colorScheme = theme.colorScheme;
        final versionsLabel = _relatedVersionDisplayCount.toString();

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Other Versions',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$versionsLabel total prints with this card name.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.72),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.58,
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _relatedVersions.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final row = _relatedVersions[index];
                      final setRecord = _extractRecord(row['sets']);
                      final setName = _cleanText(setRecord?['name']);
                      final setCode = _cleanText(row['set_code']).toUpperCase();
                      final number = _cleanText(row['number_plain']).isNotEmpty
                          ? _cleanText(row['number_plain'])
                          : _cleanText(row['number']);
                      final rarity = _formatRarity(row['rarity']?.toString());
                      final imageUrl = _bestImageUrl(
                        primary: row['image_url'],
                        fallback: row['image_alt_url'],
                      );

                      return Material(
                        color: colorScheme.surface,
                        borderRadius: BorderRadius.circular(18),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () {
                            Navigator.of(context).pop();
                            Navigator.of(this.context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => CardDetailScreen(
                                  cardPrintId: _cleanText(row['id']),
                                  gvId: _cleanText(row['gv_id']),
                                  name: _cleanText(row['name']),
                                  setName: setName,
                                  setCode: setCode,
                                  number: number,
                                  rarity: rarity,
                                  imageUrl: imageUrl,
                                ),
                              ),
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 58,
                                  child: AspectRatio(
                                    aspectRatio: 3 / 4,
                                    child: CardSurfaceArtwork(
                                      label: _cleanText(row['name']),
                                      imageUrl: imageUrl,
                                      borderRadius: 12,
                                      padding: const EdgeInsets.all(4),
                                      showZoomAffordance: imageUrl.isNotEmpty,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        setName.isNotEmpty
                                            ? setName
                                            : _cleanText(row['name']),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        [
                                          if (setCode.isNotEmpty) setCode,
                                          if (number.isNotEmpty) '#$number',
                                          if (rarity.isNotEmpty) rarity,
                                        ].join(' • '),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                              color: colorScheme.onSurface
                                                  .withValues(alpha: 0.68),
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right_rounded,
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.42,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bottomInset = MediaQuery.viewPaddingOf(context).bottom;
    final sections = <Widget>[
      _buildHeroImage(colorScheme),
      _buildIdentitySection(theme, colorScheme),
      _buildPricingSection(theme, colorScheme),
      _buildActions(context, theme, colorScheme),
      if (_hasContactContext) _buildCollectorNetworkSection(theme, colorScheme),
      if (_buildDetailEntries().isNotEmpty)
        _buildCardDetailsSection(theme, colorScheme),
      if (_buildOwnershipChips(theme).isNotEmpty)
        _buildOwnershipSection(theme, colorScheme),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(_displayName, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 18 + bottomInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = 0; index < sections.length; index++) ...[
                if (index > 0) const SizedBox(height: _sectionSpacing),
                sections[index],
              ],
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
        constraints: const BoxConstraints(maxWidth: 236),
        child: Container(
          decoration: _surfaceDecoration(colorScheme, emphasize: true),
          padding: const EdgeInsets.all(10),
          child: Container(
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.55,
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            padding: const EdgeInsets.all(8),
            child: AspectRatio(
              aspectRatio: 3 / 4,
              child: CardSurfaceArtwork(
                label: _displayName,
                imageUrl: url,
                borderRadius: 12,
                padding: const EdgeInsets.all(6),
                showZoomAffordance: url.isNotEmpty,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIdentitySection(ThemeData theme, ColorScheme colorScheme) {
    final setName = _resolvedSetName;
    final setCode = _resolvedSetCode.toUpperCase();
    final collectorIdentity = _collectorIdentityLine;
    final resolvedRarity = _cleanText(
      (_cardContextData == null ? null : _cardContextData!['rarity'])
          ?.toString(),
    );
    final rarity = _formatRarity(
      resolvedRarity.isNotEmpty ? resolvedRarity : widget.rarity,
    );
    final relatedVersionCount = _relatedVersionDisplayCount;
    final listingSignal = _topMarketSignalLabel;
    final inSetLabel = _printedTotalInSet != null
        ? 'In this set · ${_printedTotalInSet!} cards'
        : 'In this set';
    final metadataBadges = <Widget>[
      if (_hasVaultContext)
        _buildInfoChip(
          label: 'In your vault',
          icon: Icons.inventory_2_outlined,
          tint: Colors.orange.shade800,
          theme: theme,
        ),
      if (rarity.isNotEmpty)
        _buildInfoChip(
          label: rarity,
          tint: _rarityAccentColor(colorScheme, rarity),
          theme: theme,
        ),
      if (listingSignal != null)
        _buildInfoChip(
          label: listingSignal,
          icon: Icons.storefront_outlined,
          tint: colorScheme.primary,
          theme: theme,
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _displayName,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.6,
            height: 1.04,
          ),
        ),
        if (setName.isNotEmpty || _relatedVersions.isNotEmpty) ...[
          const SizedBox(height: 9),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              if (setName.isNotEmpty)
                _buildPrimaryNavCue(
                  eyebrow: 'Set',
                  label: setName,
                  supporting: inSetLabel,
                  theme: theme,
                  colorScheme: colorScheme,
                  onTap: setCode.isNotEmpty ? _openSetDetail : null,
                ),
              if (_hasExactCopyContext)
                _buildPrimaryNavCue(
                  eyebrow: 'Exact copy',
                  label: 'Open exact copy',
                  supporting: _hasVaultContext
                      ? 'Continue to this owned copy'
                      : 'Continue to this specific copy',
                  theme: theme,
                  colorScheme: colorScheme,
                  onTap: _openExactCopy,
                ),
              if (_relatedVersions.isNotEmpty)
                _buildPrimaryNavCue(
                  eyebrow: 'Card family',
                  label: '$relatedVersionCount versions',
                  supporting: 'Explore other prints',
                  theme: theme,
                  colorScheme: colorScheme,
                  onTap: _openOtherVersions,
                ),
            ],
          ),
        ],
        if (collectorIdentity != null) ...[
          const SizedBox(height: 7),
          Text(
            collectorIdentity,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.15,
            ),
          ),
        ],
        if (metadataBadges.isNotEmpty) ...[
          const SizedBox(height: 6),
          Wrap(spacing: 8, runSpacing: 8, children: metadataBadges),
        ],
      ],
    );
  }

  Widget _buildOwnershipSection(ThemeData theme, ColorScheme colorScheme) {
    final ownershipChips = _buildOwnershipChips(theme);
    if (ownershipChips.isEmpty) {
      return const SizedBox.shrink();
    }

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Wrap(spacing: 8, runSpacing: 8, children: ownershipChips),
    );
  }

  Widget _buildInlineSection({
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.symmetric(
      horizontal: 2,
      vertical: 2,
    ),
  }) {
    return Padding(padding: padding, child: child);
  }

  Widget _buildSurface({
    required ColorScheme colorScheme,
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(14),
    bool emphasize = false,
    bool soft = false,
  }) {
    return Container(
      decoration: _surfaceDecoration(
        colorScheme,
        emphasize: emphasize,
        soft: soft,
      ),
      padding: padding,
      child: child,
    );
  }

  BoxDecoration _surfaceDecoration(
    ColorScheme colorScheme, {
    bool emphasize = false,
    bool soft = false,
  }) {
    return BoxDecoration(
      color: soft
          ? colorScheme.surfaceContainerLowest.withValues(alpha: 0.7)
          : colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: colorScheme.outlineVariant.withValues(
          alpha: emphasize
              ? 0.6
              : soft
              ? 0.28
              : 0.45,
        ),
      ),
      boxShadow: [
        BoxShadow(
          color: colorScheme.shadow.withValues(
            alpha: emphasize
                ? 0.1
                : soft
                ? 0.025
                : 0.06,
          ),
          blurRadius: emphasize
              ? 16
              : soft
              ? 4
              : 8,
          offset: Offset(
            0,
            emphasize
                ? 7
                : soft
                ? 1
                : 3,
          ),
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
        letterSpacing: 0.8,
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
      constraints: const BoxConstraints(minHeight: 28),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
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

  Widget _buildPrimaryNavCue({
    required String eyebrow,
    required String label,
    required String? supporting,
    required ThemeData theme,
    required ColorScheme colorScheme,
    required VoidCallback? onTap,
  }) {
    final cueChild = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          eyebrow.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.75,
            color: colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
        const SizedBox(height: 3),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 220),
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: onTap == null
                      ? colorScheme.onSurface
                      : colorScheme.primary,
                  height: 1.05,
                ),
              ),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 4),
              Icon(
                Icons.arrow_outward_rounded,
                size: 15,
                color: colorScheme.primary,
              ),
            ],
          ],
        ),
        if (_cleanText(supporting).isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(
            supporting!,
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface.withValues(alpha: 0.62),
            ),
          ),
        ],
      ],
    );

    if (onTap == null) {
      return cueChild;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.045),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.12),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
          child: cueChild,
        ),
      ),
    );
  }

  Widget _buildMetadataRow({
    required String label,
    required String value,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 104,
          child: Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFlowDivider(ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Divider(
        height: 1,
        thickness: 1,
        color: colorScheme.outlineVariant.withValues(alpha: 0.24),
      ),
    );
  }

  Widget _buildCollectorNetworkSection(
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    if (!_hasContactContext) {
      return const SizedBox.shrink();
    }

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Collector Network', theme, colorScheme),
          const SizedBox(height: 6),
          Text(
            _cleanText(widget.contactOwnerDisplayName),
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Card-specific messaging for this collector.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ContactOwnerButton(
                  vaultItemId: _cleanText(widget.contactVaultItemId),
                  cardPrintId: widget.cardPrintId,
                  ownerUserId: widget.contactOwnerUserId,
                  ownerDisplayName: _cleanText(widget.contactOwnerDisplayName),
                  cardName: _displayName,
                  intent: widget.contactIntent,
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const NetworkInboxScreen(),
                    ),
                  );
                },
                child: const Text('Messages'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCardDetailsSection(ThemeData theme, ColorScheme colorScheme) {
    final detailEntries = _buildDetailEntries();
    if (detailEntries.isEmpty) {
      return const SizedBox.shrink();
    }

    return _buildInlineSection(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Card Details', theme, colorScheme),
          const SizedBox(height: 7),
          for (var index = 0; index < detailEntries.length; index++) ...[
            if (index > 0) _buildFlowDivider(colorScheme),
            _buildMetadataRow(
              label: detailEntries[index].key,
              value: detailEntries[index].value,
              theme: theme,
              colorScheme: colorScheme,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPricingSection(ThemeData theme, ColorScheme colorScheme) {
    if (_priceLoading && _priceData == null) {
      return _buildInlineSection(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 6),
            Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 8),
                Text(
                  'Loading pricing…',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.78),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (_priceError != null) {
      return _buildInlineSection(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 4),
            Text(
              _priceError!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
            const SizedBox(height: 6),
            TextButton.icon(
              onPressed: _priceLoading ? null : _loadPricing,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                minimumSize: const Size(0, 30),
              ),
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_priceData == null) {
      return _buildInlineSection(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 4),
            Text(
              'No pricing data available',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              'Pricing for this card is not available yet.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ],
        ),
      );
    }

    final data = _priceData!;
    final primaryPrice = (data['primary_price'] as num?)?.toDouble();
    final grookaiValue = (data['grookai_value'] as num?)?.toDouble();
    final minPrice = (data['min_price'] as num?)?.toDouble();
    final maxPrice = (data['max_price'] as num?)?.toDouble();
    final ebayMedianPrice = (data['ebay_median_price'] as num?)?.toDouble();
    final primaryValue = primaryPrice ?? grookaiValue;
    final primaryLabel = primaryPrice != null ? 'Market' : 'Value';
    final primarySource = _pricingSourceName(data['primary_source'] as String?);
    final pricingFooterParts = <String>[
      if (primarySource != null) primarySource,
      if (_hasVaultContext) 'In your vault',
    ];
    final pricingContext = <Widget>[
      if (minPrice != null)
        _buildPricingMetricChip(
          label: 'Low',
          value: _formatMoney(minPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (primaryPrice != null)
        _buildPricingMetricChip(
          label: 'Mid',
          value: _formatMoney(primaryPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (maxPrice != null)
        _buildPricingMetricChip(
          label: 'High',
          value: _formatMoney(maxPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (grookaiValue != null && primaryPrice != null)
        _buildPricingMetricChip(
          label: 'Value',
          value: _formatMoney(grookaiValue),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (ebayMedianPrice != null)
        _buildPricingMetricChip(
          label: 'eBay',
          value: _formatMoney(ebayMedianPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
    ];

    return _buildInlineSection(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (primaryValue == null) ...[
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 4),
            Text(
              'No pricing data available',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              'Pricing for this card is not available yet.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ] else ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSectionLabel('Pricing', theme, colorScheme),
                      const SizedBox(height: 3),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            _formatMoney(primaryValue),
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.55,
                              height: 1.0,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 3),
                            child: Text(
                              primaryLabel,
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.68,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (pricingFooterParts.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          pricingFooterParts.join(' • '),
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.58,
                            ),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (_priceLoading)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colorScheme.primary,
                      ),
                    ),
                  ),
              ],
            ),
            if (pricingContext.isNotEmpty) ...[
              const SizedBox(height: 5),
              Wrap(spacing: 6, runSpacing: 6, children: pricingContext),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildPricingMetricChip({
    required String label,
    required String value,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.32),
        borderRadius: BorderRadius.circular(999),
      ),
      child: RichText(
        text: TextSpan(
          style: theme.textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.7),
            height: 1.0,
          ),
          children: [
            TextSpan(
              text: '$label ',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            TextSpan(
              text: value,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatMoney(double value) {
    return '\$${value.toStringAsFixed(2)}';
  }

  String? _pricingSourceName(String? source) {
    switch ((source ?? '').trim().toLowerCase()) {
      case 'justtcg':
        return 'JustTCG';
      case 'ebay':
        return 'eBay';
      default:
        return null;
    }
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
