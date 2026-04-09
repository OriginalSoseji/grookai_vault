import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/network/network_stream_service.dart';
import '../../widgets/app_shell_metrics.dart';
import '../../widgets/card_view_mode.dart';
import '../../widgets/contact_owner_button.dart';
import '../../widgets/network/network_interaction_card.dart';
import '../gvvi/public_gvvi_screen.dart';
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
  AppCardViewMode _viewMode = AppCardViewMode.comfortableList;
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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            colorScheme.surface.withValues(alpha: 0.995),
            colorScheme.surfaceContainerLowest.withValues(alpha: 0.96),
            colorScheme.surface.withValues(alpha: 0.99),
          ],
        ),
      ),
      child: Stack(
        children: [
          const Positioned(
            top: -70,
            left: -36,
            child: _NetworkAtmosphereOrb(
              width: 230,
              height: 230,
              opacity: 0.22,
            ),
          ),
          Positioned(
            top: 110,
            right: -48,
            child: _NetworkAtmosphereOrb(
              width: 210,
              height: 210,
              opacity: colorScheme.brightness == Brightness.dark ? 0.14 : 0.12,
              color: colorScheme.secondaryContainer,
            ),
          ),
          SafeArea(
            bottom: false,
            child: RefreshIndicator(
              onRefresh: _loadRows,
              child: ListView(
                padding: EdgeInsets.only(
                  bottom: shellContentBottomPadding(context, extra: 8),
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Network',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.65,
                            ),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const NetworkDiscoverScreen(),
                              ),
                            );
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: colorScheme.onSurface.withValues(
                              alpha: 0.62,
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 6,
                            ),
                            visualDensity: VisualDensity.compact,
                          ),
                          icon: const Icon(Icons.people_alt_outlined, size: 16),
                          label: const Text('Collectors'),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _IntentChip(
                                  label: 'All',
                                  selected: _intent == null,
                                  onPressed: () => _setIntent(null),
                                ),
                                const SizedBox(width: 8),
                                _IntentChip(
                                  label: 'Trade',
                                  selected: _intent == 'trade',
                                  onPressed: () => _setIntent('trade'),
                                ),
                                const SizedBox(width: 8),
                                _IntentChip(
                                  label: 'Sell',
                                  selected: _intent == 'sell',
                                  onPressed: () => _setIntent('sell'),
                                ),
                                const SizedBox(width: 8),
                                _IntentChip(
                                  label: 'Showcase',
                                  selected: _intent == 'showcase',
                                  onPressed: () => _setIntent('showcase'),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _NetworkViewModeToggle(
                          value: _viewMode,
                          onChanged: (mode) {
                            setState(() {
                              _viewMode = mode;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
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
          ),
        ],
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
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 28),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (error != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _NetworkEmptyState(
              title: 'Unable to load the card stream',
              body: error!,
            ),
            const SizedBox(height: 10),
            FilledButton.tonal(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (rows.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: _NetworkEmptyState(
          title: 'No cards available right now',
          body:
              'Collectors will appear here when they mark cards for trade, sale, or showcase.',
        ),
      );
    }

    return _NetworkStreamResults(rows: rows, viewMode: viewMode);
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
        return LayoutBuilder(
          builder: (context, constraints) {
            final crossAxisCount = constraints.maxWidth >= 820 ? 3 : 2;
            const spacing = 10.0;
            final tileWidth =
                (constraints.maxWidth - 16 - (spacing * (crossAxisCount - 1))) /
                crossAxisCount;

            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Wrap(
                spacing: spacing,
                runSpacing: spacing,
                children: [
                  for (final row in rows)
                    SizedBox(
                      width: tileWidth,
                      child: _buildCard(
                        context,
                        row,
                        layout: NetworkInteractionCardLayout.grid,
                      ),
                    ),
                ],
              ),
            );
          },
        );
      case AppCardViewMode.compactList:
      case AppCardViewMode.comfortableList:
        return Column(
          children: [
            for (var index = 0; index < rows.length; index++) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: _buildCard(
                  context,
                  rows[index],
                  layout: viewMode == AppCardViewMode.compactList
                      ? NetworkInteractionCardLayout.compactFeed
                      : NetworkInteractionCardLayout.feed,
                ),
              ),
              if (index < rows.length - 1)
                SizedBox(
                  height: viewMode == AppCardViewMode.compactList ? 6 : 8,
                ),
            ],
          ],
        );
    }
  }

  Widget _buildCard(
    BuildContext context,
    NetworkStreamRow row, {
    required NetworkInteractionCardLayout layout,
  }) {
    final directContact = _groupedContactAnchor(row);
    final hook = _buildHookData(row);
    final primaryIntentLabel = NetworkStreamService.getPrimaryIntentLabel(row);
    final primaryActionLabel = NetworkStreamService.getPrimaryContactLabel(row);
    final metadata = [
      row.setName,
      if (row.number != '—') '#${row.number}',
    ].where((value) => value.trim().isNotEmpty).join(' • ');
    final supportText = _buildSupportText(row);

    return NetworkInteractionCard(
      title: row.name,
      imageLabel: row.name,
      imageUrl: row.imageUrl,
      metadata: metadata,
      layout: layout,
      onPressed: () =>
          _openNetworkPrimaryDestination(context, row, directContact),
      heroHook: hook == null ? null : _NetworkHookBadge(data: hook),
      topContext: _NetworkCollectorContext(
        displayName: row.ownerDisplayName,
        timestampLabel: NetworkStreamService.formatCreatedAtShort(
          row.createdAt,
        ),
        intentLabel: primaryIntentLabel,
      ),
      supportingInfo: supportText == null
          ? null
          : Text(
              supportText,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.56),
                fontWeight: FontWeight.w500,
                fontSize: 12.3,
                height: 1.3,
              ),
            ),
      actionBar: _NetworkActionBar(
        row: row,
        directContact: directContact,
        primaryActionLabel: primaryActionLabel,
        onViewDetails: () =>
            _openNetworkPrimaryDestination(context, row, directContact),
        onChooseCopy: row.inPlayCopies.length > 1
            ? () => _showCopiesSheet(context, row)
            : null,
      ),
    );
  }

  String? _buildSupportText(NetworkStreamRow row) {
    final values = <String>[];
    final ownershipSummary = NetworkStreamService.getOwnershipSummary(row);
    final normalizedOwnership = ownershipSummary.trim().toLowerCase();
    if (row.isGraded ||
        (row.conditionLabel ?? '').trim().isNotEmpty ||
        row.inPlayCopies.length > 1) {
      if (normalizedOwnership.isNotEmpty && normalizedOwnership != 'raw') {
        values.add(ownershipSummary);
      } else if (row.inPlayCopies.length > 1) {
        values.add('${row.inPlayCopies.length} copies');
      }
    }

    final visiblePrice = row.pricing?.visibleValue;
    if (visiblePrice != null) {
      values.add(_formatPrice(visiblePrice));
    }

    if (values.isEmpty) {
      return null;
    }
    return values.join(' • ');
  }

  String _formatPrice(double value) {
    if (value >= 1000) {
      return '\$${value.toStringAsFixed(0)}';
    }
    return '\$${value.toStringAsFixed(2)}';
  }

  _NetworkHookData? _buildHookData(NetworkStreamRow row) {
    if (row.isGraded) {
      return _NetworkHookData(
        label: NetworkStreamService.getOwnershipSummary(row),
        icon: Icons.workspace_premium_rounded,
        highlighted: true,
      );
    }

    if (_isFreshListing(row.createdAt)) {
      return const _NetworkHookData(
        label: 'Just listed',
        icon: Icons.bolt_rounded,
        highlighted: true,
      );
    }

    if (row.inPlayCount > 1) {
      return _NetworkHookData(
        label: '${row.inPlayCount} live',
        icon: Icons.local_fire_department_outlined,
        highlighted: true,
      );
    }

    switch (NetworkStreamService.getPrimaryIntent(row)) {
      case 'sell':
        return const _NetworkHookData(
          label: 'Available now',
          icon: Icons.sell_outlined,
        );
      case 'trade':
        return const _NetworkHookData(
          label: 'Open to trade',
          icon: Icons.swap_horiz_rounded,
        );
      case 'showcase':
        return const _NetworkHookData(
          label: 'Collector pick',
          icon: Icons.auto_awesome_outlined,
        );
      default:
        return null;
    }
  }

  bool _isFreshListing(String? createdAt) {
    final parsed = DateTime.tryParse(createdAt?.trim() ?? '');
    if (parsed == null) {
      return false;
    }

    return DateTime.now().difference(parsed.toLocal()).inHours <= 72;
  }
}

class _NetworkCollectorContext extends StatelessWidget {
  const _NetworkCollectorContext({
    required this.displayName,
    required this.timestampLabel,
    required this.intentLabel,
  });

  final String displayName;
  final String timestampLabel;
  final String intentLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.10),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            displayName.isEmpty
                ? 'G'
                : displayName.substring(0, 1).toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.82),
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: displayName,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface.withValues(alpha: 0.80),
                    letterSpacing: -0.04,
                  ),
                ),
                if (timestampLabel.trim().isNotEmpty)
                  TextSpan(
                    text: '  •  $timestampLabel',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.48),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),
        _NetworkIntentMarker(label: intentLabel),
      ],
    );
  }
}

class _NetworkIntentMarker extends StatelessWidget {
  const _NetworkIntentMarker({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.10)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.64),
          fontWeight: FontWeight.w600,
          letterSpacing: 0.12,
        ),
      ),
    );
  }
}

class _NetworkHookData {
  const _NetworkHookData({
    required this.label,
    required this.icon,
    this.highlighted = false,
  });

  final String label;
  final IconData icon;
  final bool highlighted;
}

class _NetworkHookBadge extends StatelessWidget {
  const _NetworkHookBadge({required this.data});

  final _NetworkHookData data;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final foreground = data.highlighted
        ? Colors.white
        : colorScheme.onSurface.withValues(alpha: 0.90);
    final background = data.highlighted
        ? Colors.black.withValues(alpha: 0.52)
        : colorScheme.surface.withValues(alpha: 0.78);
    final border = data.highlighted
        ? Colors.white.withValues(alpha: 0.12)
        : colorScheme.outline.withValues(alpha: 0.08);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(data.icon, size: 14, color: foreground),
            const SizedBox(width: 5),
            Text(
              data.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: foreground,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.08,
                  ) ??
                  const TextStyle(),
            ),
          ],
        ),
      ),
    );
  }
}

class _NetworkSummaryBadge extends StatelessWidget {
  const _NetworkSummaryBadge({required this.label, this.emphasis = false});

  final String label;
  final bool emphasis;

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
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
          height: 1.0,
        ),
      ),
    );
  }
}

class _NetworkActionBar extends StatelessWidget {
  const _NetworkActionBar({
    required this.row,
    required this.directContact,
    required this.primaryActionLabel,
    required this.onViewDetails,
    required this.onChooseCopy,
  });

  final NetworkStreamRow row;
  final _NetworkContactAnchor? directContact;
  final String primaryActionLabel;
  final VoidCallback onViewDetails;
  final VoidCallback? onChooseCopy;

  @override
  Widget build(BuildContext context) {
    final actions = <Widget>[];
    final usesGenericContactLabel = primaryActionLabel == 'Contact owner';

    if (directContact != null) {
      actions.add(
        _NetworkPrimaryActionShell(
          child: ContactOwnerButton(
            vaultItemId: directContact!.vaultItemId,
            cardPrintId: row.cardPrintId,
            ownerUserId: row.ownerUserId,
            ownerDisplayName: row.ownerDisplayName,
            cardName: row.name,
            intent: directContact!.intent,
            buttonLabel: usesGenericContactLabel
                ? 'Ask about this card'
                : primaryActionLabel,
            variant: ContactOwnerButtonVariant.compact,
          ),
        ),
      );
      if (!usesGenericContactLabel) {
        actions.add(
          _NetworkSecondaryContactAction(
            vaultItemId: directContact!.vaultItemId,
            cardPrintId: row.cardPrintId,
            ownerUserId: row.ownerUserId,
            ownerDisplayName: row.ownerDisplayName,
            cardName: row.name,
            intent: directContact!.intent,
            label: 'Ask about this card',
          ),
        );
      }
    } else if (onChooseCopy != null) {
      actions.add(
        _NetworkActionLink(
          icon: Icons.question_answer_outlined,
          label: 'Ask about this card',
          onPressed: onChooseCopy!,
          emphasized: true,
        ),
      );
    }

    if (directContact == null && onChooseCopy == null) {
      actions.add(
        _NetworkActionLink(
          icon: Icons.open_in_new_rounded,
          label: 'View details',
          onPressed: onViewDetails,
        ),
      );
    }

    if (directContact != null && onChooseCopy != null) {
      actions.add(
        _NetworkActionLink(
          icon: Icons.layers_outlined,
          label: 'Choose copy',
          onPressed: onChooseCopy!,
        ),
      );
    }

    return Wrap(spacing: 6, runSpacing: 2, children: actions);
  }
}

class _NetworkPrimaryActionShell extends StatelessWidget {
  const _NetworkPrimaryActionShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Theme(
      data: Theme.of(context).copyWith(
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: colorScheme.onSurface,
            textStyle: Theme.of(
              context,
            ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            visualDensity: VisualDensity.compact,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ),
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: colorScheme.primary.withValues(alpha: 0.09),
          ),
        ),
        child: child,
      ),
    );
  }
}

class _NetworkSecondaryContactAction extends StatelessWidget {
  const _NetworkSecondaryContactAction({
    required this.vaultItemId,
    required this.cardPrintId,
    required this.ownerUserId,
    required this.ownerDisplayName,
    required this.cardName,
    required this.label,
    this.intent,
  });

  final String vaultItemId;
  final String cardPrintId;
  final String ownerUserId;
  final String ownerDisplayName;
  final String cardName;
  final String label;
  final String? intent;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);

    return Theme(
      data: theme.copyWith(
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            visualDensity: VisualDensity.compact,
            foregroundColor: colorScheme.onSurface.withValues(alpha: 0.62),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            textStyle: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
      child: ContactOwnerButton(
        vaultItemId: vaultItemId,
        cardPrintId: cardPrintId,
        ownerUserId: ownerUserId,
        ownerDisplayName: ownerDisplayName,
        cardName: cardName,
        intent: intent,
        buttonLabel: label,
        variant: ContactOwnerButtonVariant.compact,
      ),
    );
  }
}

class _NetworkActionLink extends StatelessWidget {
  const _NetworkActionLink({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.emphasized = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final child = TextButton.icon(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        visualDensity: VisualDensity.compact,
        foregroundColor: emphasized
            ? colorScheme.primary
            : colorScheme.onSurface.withValues(alpha: 0.62),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      icon: Icon(icon, size: 16),
      label: Text(label),
    );

    if (!emphasized) {
      return child;
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.09)),
      ),
      child: child,
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

class _NetworkViewModeToggle extends StatelessWidget {
  const _NetworkViewModeToggle({required this.value, required this.onChanged});

  final AppCardViewMode value;
  final ValueChanged<AppCardViewMode> onChanged;

  static const _modes = <AppCardViewMode>[
    AppCardViewMode.comfortableList,
    AppCardViewMode.compactList,
  ];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final mode in _modes)
          _NetworkViewModeChip(
            mode: mode,
            selected: value == mode,
            onPressed: () => onChanged(mode),
          ),
      ],
    );
  }
}

class _NetworkAtmosphereOrb extends StatelessWidget {
  const _NetworkAtmosphereOrb({
    required this.width,
    required this.height,
    required this.opacity,
    this.color,
  });

  final double width;
  final double height;
  final double opacity;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return IgnorePointer(
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              (color ?? colorScheme.primaryContainer).withValues(
                alpha: opacity,
              ),
              Colors.transparent,
            ],
          ),
        ),
      ),
    );
  }
}

class _NetworkViewModeChip extends StatelessWidget {
  const _NetworkViewModeChip({
    required this.mode,
    required this.selected,
    required this.onPressed,
  });

  final AppCardViewMode mode;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final label = switch (mode) {
      AppCardViewMode.comfortableList => 'Feed',
      AppCardViewMode.compactList => 'Compact',
      AppCardViewMode.grid => 'Grid',
    };

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: selected ? null : onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? colorScheme.onSurface.withValues(alpha: 0.075)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected
                  ? colorScheme.onSurface.withValues(alpha: 0.08)
                  : colorScheme.outline.withValues(alpha: 0.04),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                mode.icon,
                size: 15,
                color: selected
                    ? colorScheme.onSurface.withValues(alpha: 0.84)
                    : colorScheme.onSurface.withValues(alpha: 0.52),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: selected
                      ? colorScheme.onSurface.withValues(alpha: 0.86)
                      : colorScheme.onSurface.withValues(alpha: 0.58),
                  letterSpacing: 0.1,
                ),
              ),
            ],
          ),
        ),
      ),
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

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: selected
                ? colorScheme.primary.withValues(alpha: 0.055)
                : colorScheme.surface.withValues(alpha: 0.68),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected
                  ? colorScheme.primary.withValues(alpha: 0.12)
                  : colorScheme.outline.withValues(alpha: 0.04),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (selected) ...[
                Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colorScheme.primary.withValues(alpha: 0.78),
                  ),
                ),
                const SizedBox(width: 7),
              ],
              Text(
                label.toUpperCase(),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                  color: selected
                      ? colorScheme.primary.withValues(alpha: 0.82)
                      : colorScheme.onSurface.withValues(alpha: 0.60),
                ),
              ),
            ],
          ),
        ),
      ),
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
