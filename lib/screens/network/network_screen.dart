import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/network/network_stream_service.dart';
import '../../widgets/app_shell_metrics.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/card_surface_price.dart';
import '../../widgets/card_view_mode.dart';
import '../../widgets/contact_owner_button.dart';
import '../gvvi/public_gvvi_screen.dart';
import '../public_collector/public_collector_screen.dart';
import '../vault/vault_gvvi_screen.dart';
import 'network_discover_screen.dart';

class NetworkScreen extends StatefulWidget {
  const NetworkScreen({super.key});

  @override
  State<NetworkScreen> createState() => NetworkScreenState();
}

class NetworkScreenState extends State<NetworkScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  String? _intent;
  AppCardViewMode _viewMode = AppCardViewMode.grid;
  bool _loading = true;
  String? _error;
  List<NetworkStreamRow> _rows = const <NetworkStreamRow>[];
  int _loadVersion = 0;

  @override
  void initState() {
    super.initState();
    _loadRows();
  }

  void reload() {
    _loadRows();
  }

  Future<void> _loadRows() async {
    final loadVersion = ++_loadVersion;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final rows = await NetworkStreamService.fetchRows(
        client: _client,
        intent: _intent,
        excludeUserId: _client.auth.currentUser?.id,
      );

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _rows = rows;
      });
    } catch (error) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _error = error is Error
            ? error.toString()
            : 'Unable to load the collector network.';
      });
    } finally {
      if (mounted && loadVersion == _loadVersion) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _setIntent(String? intent) async {
    if (_intent == intent) {
      return;
    }

    setState(() {
      _intent = intent;
    });
    await _loadRows();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: _loadRows,
        child: ListView(
          padding: EdgeInsets.fromLTRB(
            14,
            6,
            14,
            shellContentBottomPadding(context, extra: 8),
          ),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Card stream',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                SharedCardViewModeButton(
                  value: _viewMode,
                  onChanged: (mode) {
                    setState(() {
                      _viewMode = mode;
                    });
                  },
                ),
                const SizedBox(width: 4),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const NetworkDiscoverScreen(),
                      ),
                    );
                  },
                  child: const Text('Collectors'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _NetworkSurfaceCard(
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  const Expanded(
                    child: _NetworkLaneButton(label: 'Cards', selected: true),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _NetworkLaneButton(
                      label: 'Collectors',
                      selected: false,
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const NetworkDiscoverScreen(),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            _NetworkSurfaceCard(
              padding: const EdgeInsets.all(8),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _IntentChip(
                    label: 'All intents',
                    selected: _intent == null,
                    onPressed: () => _setIntent(null),
                  ),
                  _IntentChip(
                    label: 'Trade',
                    selected: _intent == 'trade',
                    onPressed: () => _setIntent('trade'),
                  ),
                  _IntentChip(
                    label: 'Sell',
                    selected: _intent == 'sell',
                    onPressed: () => _setIntent('sell'),
                  ),
                  _IntentChip(
                    label: 'Showcase',
                    selected: _intent == 'showcase',
                    onPressed: () => _setIntent('showcase'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            _NetworkContentSection(
              intent: _intent,
              viewMode: _viewMode,
              rows: _rows,
              loading: _loading,
              error: _error,
              onRetry: _loadRows,
            ),
          ],
        ),
      ),
    );
  }
}

class _NetworkContentSection extends StatelessWidget {
  const _NetworkContentSection({
    required this.intent,
    required this.viewMode,
    required this.rows,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final String? intent;
  final AppCardViewMode viewMode;
  final List<NetworkStreamRow> rows;
  final bool loading;
  final String? error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = intent == null
        ? 'Latest cards'
        : '${NetworkStreamService.getVaultIntentLabel(intent)} cards';

    return _NetworkSurfaceCard(
      padding: const EdgeInsets.all(9),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 8),
          if (loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (error != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _NetworkEmptyState(
                  title: 'Unable to load the card stream',
                  body: error!,
                ),
                const SizedBox(height: 10),
                FilledButton.tonal(
                  onPressed: onRetry,
                  child: const Text('Retry'),
                ),
              ],
            )
          else if (rows.isEmpty)
            const _NetworkEmptyState(
              title: 'No cards available right now',
              body:
                  'Collectors will appear here when they mark cards for trade, sale, or showcase.',
            )
          else
            _NetworkStreamResults(rows: rows, viewMode: viewMode),
        ],
      ),
    );
  }
}

class _NetworkStreamResults extends StatelessWidget {
  const _NetworkStreamResults({required this.rows, required this.viewMode});

  final List<NetworkStreamRow> rows;
  final AppCardViewMode viewMode;

  @override
  Widget build(BuildContext context) {
    switch (viewMode) {
      case AppCardViewMode.grid:
        final width = MediaQuery.sizeOf(context).width - 28;
        final crossAxisCount = width >= 720 ? 3 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: rows.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
            mainAxisExtent: 266,
          ),
          itemBuilder: (context, index) =>
              _NetworkStreamGridTile(row: rows[index]),
        );
      case AppCardViewMode.compactList:
      case AppCardViewMode.comfortableList:
        return Column(
          children: [
            for (var index = 0; index < rows.length; index++) ...[
              _NetworkStreamListTile(
                row: rows[index],
                compact: viewMode == AppCardViewMode.compactList,
              ),
              if (index < rows.length - 1) const SizedBox(height: 4),
            ],
          ],
        );
    }
  }
}

class _NetworkStreamListTile extends StatelessWidget {
  const _NetworkStreamListTile({required this.row, required this.compact});

  final NetworkStreamRow row;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final meta = <String>[row.setName, if (row.number != '—') '#${row.number}'];
    final directContact = _groupedContactAnchor(row);
    final primaryIntentLabel = NetworkStreamService.getPrimaryIntentLabel(row);
    final primaryActionLabel = NetworkStreamService.getPrimaryContactLabel(row);
    final ownershipSummary = NetworkStreamService.getOwnershipSummary(row);
    final listingLabel = NetworkStreamService.getListingsLabel(row);
    final hasSignalRow =
        row.pricing?.hasVisibleValue == true || listingLabel != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () =>
            _openNetworkPrimaryDestination(context, row, directContact),
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
          ),
          padding: EdgeInsets.all(compact ? 8 : 9),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _NetworkStreamArtwork(row: row, compact: compact),
              SizedBox(width: compact ? 8 : 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _NetworkSummaryBadge(
                          label: primaryIntentLabel,
                          emphasis: true,
                        ),
                        _NetworkSummaryBadge(label: ownershipSummary),
                      ],
                    ),
                    SizedBox(height: compact ? 5 : 7),
                    Text(
                      row.name,
                      maxLines: compact ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          (compact
                                  ? theme.textTheme.bodySmall
                                  : theme.textTheme.titleMedium)
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                height: 1.15,
                              ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      meta.join(' • '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: 4),
                    _CollectorLink(
                      displayName: row.ownerDisplayName,
                      slug: row.ownerSlug,
                    ),
                    if (hasSignalRow) ...[
                      SizedBox(height: compact ? 4 : 5),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          if (row.pricing?.hasVisibleValue == true)
                            CardSurfacePricePill(
                              pricing: row.pricing,
                              size: compact
                                  ? CardSurfacePriceSize.dense
                                  : CardSurfacePriceSize.list,
                            ),
                          if (listingLabel != null)
                            _NetworkInlineSignalPill(label: listingLabel),
                        ],
                      ),
                    ],
                    SizedBox(height: compact ? 5 : 7),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            NetworkStreamService.formatCreatedAtShort(
                              row.createdAt,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.58,
                              ),
                            ),
                          ),
                        ),
                        if (directContact != null)
                          ContactOwnerButton(
                            vaultItemId: directContact.vaultItemId,
                            cardPrintId: row.cardPrintId,
                            ownerUserId: row.ownerUserId,
                            ownerDisplayName: row.ownerDisplayName,
                            cardName: row.name,
                            intent: directContact.intent,
                            buttonLabel: primaryActionLabel,
                            variant: ContactOwnerButtonVariant.filled,
                          ),
                        if (row.inPlayCopies.length > 1) ...[
                          if (directContact != null) const SizedBox(width: 6),
                          TextButton(
                            onPressed: () => _showCopiesSheet(context, row),
                            style: TextButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                            ),
                            child: Text(
                              'Choose copy (${row.inPlayCopies.length})',
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.36),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NetworkStreamGridTile extends StatelessWidget {
  const _NetworkStreamGridTile({required this.row});

  final NetworkStreamRow row;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final directContact = _groupedContactAnchor(row);
    final primaryIntentLabel = NetworkStreamService.getPrimaryIntentLabel(row);
    final primaryActionLabel = NetworkStreamService.getPrimaryContactLabel(row);
    final ownershipSummary = NetworkStreamService.getOwnershipSummary(row);
    final listingLabel = NetworkStreamService.getListingsLabel(row);
    final subtitle = [
      row.setCode.isNotEmpty ? row.setCode : row.setName,
      if (row.number != '—') '#${row.number}',
    ].join(' • ');

    return Material(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () =>
            _openNetworkPrimaryDestination(context, row, directContact),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(6, 6, 6, 5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CardSurfaceArtwork(
                        label: row.name,
                        imageUrl: row.imageUrl,
                        borderRadius: 13,
                        padding: const EdgeInsets.all(3),
                      ),
                    ),
                    Positioned(
                      left: 4,
                      top: 4,
                      child: _NetworkSummaryBadge(
                        label: primaryIntentLabel,
                        emphasis: true,
                        dense: true,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 5),
              Text(
                row.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.68),
                  fontSize: 10.4,
                ),
              ),
              const SizedBox(height: 1),
              _CollectorLink(
                displayName: row.ownerDisplayName,
                slug: row.ownerSlug,
                compact: true,
              ),
              const SizedBox(height: 1),
              Text(
                ownershipSummary,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                  fontSize: 10.1,
                ),
              ),
              if (row.pricing?.hasVisibleValue == true ||
                  listingLabel != null) ...[
                const SizedBox(height: 3),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (row.pricing?.hasVisibleValue == true)
                      CardSurfacePricePill(
                        pricing: row.pricing,
                        size: CardSurfacePriceSize.grid,
                      ),
                    if (listingLabel != null)
                      _NetworkInlineSignalPill(
                        label: listingLabel,
                        dense: true,
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 4),
              if (directContact != null)
                Align(
                  alignment: Alignment.centerLeft,
                  child: ContactOwnerButton(
                    vaultItemId: directContact.vaultItemId,
                    cardPrintId: row.cardPrintId,
                    ownerUserId: row.ownerUserId,
                    ownerDisplayName: row.ownerDisplayName,
                    cardName: row.name,
                    intent: directContact.intent,
                    buttonLabel: primaryActionLabel,
                    variant: ContactOwnerButtonVariant.outlined,
                  ),
                ),
              if (row.inPlayCopies.length > 1)
                TextButton(
                  onPressed: () => _showCopiesSheet(context, row),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                  ),
                  child: const Text('Choose copy'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CollectorLink extends StatelessWidget {
  const _CollectorLink({
    required this.displayName,
    required this.slug,
    this.compact = false,
  });

  final String displayName;
  final String slug;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => PublicCollectorScreen(slug: slug),
          ),
        );
      },
      child: Text(
        'Collector $displayName',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style:
            (compact
                    ? Theme.of(context).textTheme.labelSmall
                    : Theme.of(context).textTheme.bodySmall)
                ?.copyWith(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
      ),
    );
  }
}

class _NetworkStreamArtwork extends StatelessWidget {
  const _NetworkStreamArtwork({required this.row, required this.compact});

  final NetworkStreamRow row;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return CardSurfaceArtwork(
      label: row.name,
      imageUrl: row.imageUrl,
      width: compact ? 60 : 70,
      height: compact ? 82 : 96,
      borderRadius: 13,
      padding: const EdgeInsets.all(4),
    );
  }
}

class _NetworkSummaryBadge extends StatelessWidget {
  const _NetworkSummaryBadge({
    required this.label,
    this.emphasis = false,
    this.dense = false,
  });

  final String label;
  final bool emphasis;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final background = emphasis
        ? colorScheme.primary.withValues(alpha: 0.08)
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.42);
    final foreground = emphasis
        ? colorScheme.primary
        : colorScheme.onSurface.withValues(alpha: 0.72);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 6 : 8,
        vertical: dense ? 3 : 4,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: (emphasis ? colorScheme.primary : colorScheme.outline)
              .withValues(alpha: 0.14),
        ),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w700,
          fontSize: dense ? 9.8 : null,
          height: 1.0,
        ),
      ),
    );
  }
}

class _NetworkInlineSignalPill extends StatelessWidget {
  const _NetworkInlineSignalPill({required this.label, this.dense = false});

  final String label;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 6 : 7,
        vertical: dense ? 3 : 4,
      ),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.34),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.72),
          fontWeight: FontWeight.w600,
          fontSize: dense ? 9.8 : null,
          height: 1.0,
        ),
      ),
    );
  }
}

class _NetworkContactAnchor {
  const _NetworkContactAnchor({
    required this.vaultItemId,
    required this.intent,
  });

  final String vaultItemId;
  final String? intent;
}

_NetworkContactAnchor? _groupedContactAnchor(NetworkStreamRow row) {
  final copyVaultItemIds = row.inPlayCopies
      .map((copy) => copy.vaultItemId.trim())
      .where((value) => value.isNotEmpty)
      .toSet();

  if (copyVaultItemIds.length > 1) {
    return null;
  }

  final vaultItemId = copyVaultItemIds.isNotEmpty
      ? copyVaultItemIds.first
      : row.vaultItemId;
  if (vaultItemId.trim().isEmpty) {
    return null;
  }

  return _NetworkContactAnchor(
    vaultItemId: vaultItemId,
    intent: NetworkStreamService.getPrimaryIntent(row),
  );
}

void _openCardDetail(
  BuildContext context,
  NetworkStreamRow row,
  _NetworkContactAnchor? directContact,
) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => CardDetailScreen(
        cardPrintId: row.cardPrintId,
        gvId: row.gvId,
        name: row.name,
        setName: row.setName,
        setCode: row.setCode,
        number: row.number,
        imageUrl: row.imageUrl,
        contactVaultItemId: directContact?.vaultItemId,
        contactOwnerDisplayName: row.ownerDisplayName,
        contactOwnerUserId: row.ownerUserId,
        contactIntent: directContact?.intent,
      ),
    ),
  );
}

NetworkStreamCopy? _primaryExactCopy(NetworkStreamRow row) {
  if (row.inPlayCopies.length != 1) {
    return null;
  }

  final copy = row.inPlayCopies.first;
  return (copy.gvviId ?? '').trim().isNotEmpty ? copy : null;
}

void _openNetworkPrimaryDestination(
  BuildContext context,
  NetworkStreamRow row,
  _NetworkContactAnchor? directContact,
) {
  final exactCopy = _primaryExactCopy(row);
  if (exactCopy != null) {
    _openExactCopy(context, row, exactCopy);
    return;
  }

  _openCardDetail(context, row, directContact);
}

void _openExactCopy(
  BuildContext context,
  NetworkStreamRow row,
  NetworkStreamCopy copy,
) {
  final gvviId = (copy.gvviId ?? '').trim();
  if (gvviId.isEmpty) {
    return;
  }

  final currentUserId = Supabase.instance.client.auth.currentUser?.id;
  final isOwner = currentUserId != null && currentUserId == row.ownerUserId;

  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => isOwner
          ? VaultGvviScreen(gvviId: gvviId)
          : PublicGvviScreen(gvviId: gvviId),
    ),
  );
}

Future<void> _showCopiesSheet(BuildContext context, NetworkStreamRow row) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => _NetworkCopiesSheet(row: row),
  );
}

class _NetworkCopiesSheet extends StatelessWidget {
  const _NetworkCopiesSheet({required this.row});

  final NetworkStreamRow row;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              row.name,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Choose a copy to contact ${row.ownerDisplayName} about.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.72),
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: row.inPlayCopies.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final copy = row.inPlayCopies[index];
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colorScheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: colorScheme.outline.withValues(alpha: 0.12),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _NetworkSummaryBadge(
                              label: NetworkStreamService.getVaultIntentLabel(
                                copy.intent,
                              ),
                              emphasis: true,
                            ),
                            if (copy.isGraded)
                              _NetworkSummaryBadge(
                                label:
                                    copy.gradeLabel ??
                                    [copy.gradeCompany, copy.gradeValue]
                                        .whereType<String>()
                                        .where(
                                          (value) => value.trim().isNotEmpty,
                                        )
                                        .join(' '),
                              )
                            else if ((copy.conditionLabel ?? '')
                                .trim()
                                .isNotEmpty)
                              _NetworkSummaryBadge(label: copy.conditionLabel!),
                            if ((copy.certNumber ?? '').trim().isNotEmpty)
                              _NetworkSummaryBadge(
                                label: 'Cert ${copy.certNumber}',
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ContactOwnerButton(
                          vaultItemId: copy.vaultItemId,
                          cardPrintId: row.cardPrintId,
                          ownerUserId: row.ownerUserId,
                          ownerDisplayName: row.ownerDisplayName,
                          cardName: row.name,
                          intent: copy.intent,
                          variant: ContactOwnerButtonVariant.outlined,
                        ),
                        if ((copy.gvviId ?? '').trim().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).pop();
                              _openExactCopy(context, row, copy);
                            },
                            icon: const Icon(
                              Icons.open_in_new_rounded,
                              size: 16,
                            ),
                            label: const Text('Open exact copy'),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NetworkSurfaceCard extends StatelessWidget {
  const _NetworkSurfaceCard({required this.child, required this.padding});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      padding: padding,
      child: child,
    );
  }
}

class _NetworkLaneButton extends StatelessWidget {
  const _NetworkLaneButton({
    required this.label,
    required this.selected,
    this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return FilledButton(
      onPressed: selected ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: selected
            ? colorScheme.primary
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        foregroundColor: selected
            ? colorScheme.onPrimary
            : colorScheme.onSurface,
        disabledBackgroundColor: colorScheme.primary,
        disabledForegroundColor: colorScheme.onPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      child: Text(label),
    );
  }
}

class _IntentChip extends StatelessWidget {
  const _IntentChip({
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onPressed(),
      selectedColor: colorScheme.primary.withValues(alpha: 0.14),
      backgroundColor: colorScheme.surfaceContainerHighest.withValues(
        alpha: 0.45,
      ),
      side: BorderSide(
        color: selected
            ? colorScheme.primary.withValues(alpha: 0.42)
            : colorScheme.outline.withValues(alpha: 0.14),
      ),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      labelStyle: Theme.of(
        context,
      ).textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
    );
  }
}

class _NetworkEmptyState extends StatelessWidget {
  const _NetworkEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
