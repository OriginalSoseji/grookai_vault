// lib/main.dart
import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'card_detail_screen.dart';
import 'models/card_print.dart';
import 'models/ownership_state.dart';
import 'secrets.dart';
import 'screens/account/account_screen.dart';
import 'screens/compare/compare_screen.dart';
import 'screens/network/network_inbox_screen.dart';
import 'screens/network/network_screen.dart';
import 'screens/public_collector/public_collector_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'screens/sets/public_sets_screen.dart';
import 'screens/vault/vault_manage_card_screen.dart';
import 'screens/vault/vault_gvvi_screen.dart';
import 'services/public/card_surface_pricing_service.dart';
import 'services/public/compare_service.dart';
import 'services/public/public_collector_service.dart';
import 'services/navigation/grookai_web_route_service.dart';
import 'services/vault/vault_card_service.dart';
import 'services/vault/vault_gvvi_service.dart';
import 'services/vault/ownership_resolver_adapter.dart';
import 'screens/scanner/scan_capture_screen.dart';
import 'screens/identity_scan/identity_scan_screen.dart';
import 'widgets/card_surface_artwork.dart';
import 'widgets/card_surface_price.dart';
import 'widgets/card_view_mode.dart';
import 'widgets/app_shell_metrics.dart';

part 'main_shell.dart';
part 'main_vault.dart';

const bool kDebugTouchLog = false;
const bool _kCatalogOwnershipDiagnostics = false;
const bool _kGoogleOAuthDiagnostics = true;
const Duration _kMicroPressDownDuration = Duration(milliseconds: 96);
const Duration _kMicroReleaseDuration = Duration(milliseconds: 172);
const Duration _kActionFeedbackDuration = Duration(milliseconds: 320);
const Duration _kDrawerOpenDuration = Duration(milliseconds: 280);
const Duration _kDrawerCloseDuration = Duration(milliseconds: 180);
const double _kWallMatchGridSpacing = 6;
const double _kWallMatchGridOuterPadding = 10;
const double _kWallMatchArtworkAspectRatio = 0.69;
const double _kWallMatchGridChildAspectRatio = 0.5;
const double _kWallMatchTitleHeight = 40;
const double _kWallMatchMetaHeight = 22;
const double _kWallMatchBottomRhythmHeight = 27;

ThemeData _buildGrookaiTheme(Brightness brightness) {
  const seed = Color(0xFF4A90E2);

  final base = ThemeData(
    useMaterial3: true,
    colorSchemeSeed: seed,
    brightness: brightness,
  );

  final colorScheme = base.colorScheme;

  return base.copyWith(
    scaffoldBackgroundColor: colorScheme.surface,
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      toolbarHeight: kShellAppBarHeight,
      titleSpacing: 12,
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      titleTextStyle: base.textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        fontSize: 18,
        color: colorScheme.onSurface,
      ),
      iconTheme: IconThemeData(
        size: 18,
        color: colorScheme.onSurface.withValues(alpha: 0.84),
      ),
      actionsIconTheme: IconThemeData(
        size: 18,
        color: colorScheme.onSurface.withValues(alpha: 0.84),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: colorScheme.surface,
      indicatorColor: colorScheme.primary.withValues(alpha: 0.08),
      height: kShellBottomNavHeight,
      labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return IconThemeData(color: colorScheme.primary, size: 20);
        }
        return IconThemeData(
          color: colorScheme.onSurface.withValues(alpha: 0.62),
          size: 19,
        );
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final style = base.textTheme.labelMedium;
        if (states.contains(WidgetState.selected)) {
          return style?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
            fontSize: 10.8,
          );
        }
        return style?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.62),
          fontSize: 10.2,
        );
      }),
    ),
    cardTheme: CardThemeData(
      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.8),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: base.inputDecorationTheme.copyWith(
      filled: false,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: colorScheme.outline.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: colorScheme.outline.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.primary, width: 1.4),
      ),
    ),
    textTheme: base.textTheme.copyWith(
      headlineSmall: base.textTheme.headlineSmall?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
      titleMedium: base.textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(
        fontWeight: FontWeight.w500,
      ),
      labelSmall: base.textTheme.labelSmall?.copyWith(
        letterSpacing: 0.3,
        fontWeight: FontWeight.w500,
      ),
    ),
    snackBarTheme: base.snackBarTheme.copyWith(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}

abstract class _CatalogRow {
  _CatalogRow();
}

class _CatalogHeaderRow extends _CatalogRow {
  final String title;
  _CatalogHeaderRow(this.title);
}

class _CatalogCardRow extends _CatalogRow {
  final CardPrint card;
  _CatalogCardRow(this.card);
}

class _ProductSurfaceCard extends StatelessWidget {
  const _ProductSurfaceCard({
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.05),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: padding,
      child: child,
    );
  }
}

class _ProductSectionHeading extends StatelessWidget {
  const _ProductSectionHeading({
    required this.title,
    required this.description,
    this.trailing,
  });

  final String title;
  final String description;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
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
              if (description.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.72),
                    height: 1.35,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    );
  }
}

class _ProductEmptyState extends StatelessWidget {
  const _ProductEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(18),
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

enum _RarityFilter { all, common, uncommon, rare, ultra }

class _CatalogSkeletonTile extends StatelessWidget {
  const _CatalogSkeletonTile();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final base = colorScheme.surfaceContainerHighest.withValues(alpha: 0.7);
    final highlight = colorScheme.surfaceContainerHighest.withValues(
      alpha: 0.4,
    );

    Widget bar({double width = 120, double height = 10}) {
      return Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: base,
          borderRadius: BorderRadius.circular(8),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Container(
        decoration: BoxDecoration(
          color: highlight,
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: base,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  bar(width: 160, height: 12),
                  const SizedBox(height: 6),
                  bar(width: 110, height: 10),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogSearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onSubmitted;

  const _CatalogSearchField({
    required this.controller,
    required this.onChanged,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.26),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          prefixIcon: Icon(
            Icons.search,
            color: colorScheme.onSurface.withValues(alpha: 0.58),
          ),
          hintText: 'Search by name, set, or number',
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            vertical: 14,
            horizontal: 14,
          ),
        ),
      ),
    );
  }
}

class _ResolverStatusBanner extends StatelessWidget {
  final CardSearchResolverMeta? meta;
  final String query;
  final EdgeInsetsGeometry padding;

  const _ResolverStatusBanner({
    required this.meta,
    required this.query,
    this.padding = const EdgeInsets.fromLTRB(12, 0, 12, 8),
  });

  @override
  Widget build(BuildContext context) {
    final trimmed = query.trim();
    if (meta == null || trimmed.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    late final Color background;
    late final Color border;
    late final String title;
    late final String body;

    switch (meta!.resolverState) {
      case ResolverSearchState.strongMatch:
        return const SizedBox.shrink();
      case ResolverSearchState.ambiguousMatch:
        background = Colors.amber.withValues(alpha: 0.12);
        border = Colors.amber.withValues(alpha: 0.6);
        title = 'Multiple plausible matches';
        body =
            'This query is still ambiguous. Review the ranked cards instead of treating the top result as certain.';
        break;
      case ResolverSearchState.weakMatch:
        background = colorScheme.surfaceContainerHighest.withValues(alpha: 0.7);
        border = colorScheme.outline.withValues(alpha: 0.35);
        title = 'Weak match';
        body =
            'These results are approximate. Add a set code, collector number, or promo code to strengthen the match.';
        break;
      case ResolverSearchState.noMatch:
        background = colorScheme.surfaceContainerHighest.withValues(alpha: 0.7);
        border = colorScheme.outline.withValues(alpha: 0.35);
        title = 'No matching cards';
        body = 'No viable deterministic match was found for "$trimmed".';
        break;
    }

    return Padding(
      padding: padding,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border, width: 0.8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              body,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.75),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogSectionHeader extends StatelessWidget {
  final String title;
  final bool compact;

  const _CatalogSectionHeader(this.title, {this.compact = false});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme.onSurface.withValues(alpha: 0.6);
    return Padding(
      padding: EdgeInsets.fromLTRB(16, compact ? 8 : 10, 16, compact ? 0 : 2),
      child: Text(
        title,
        style: theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _PressScaleInkWell extends StatefulWidget {
  const _PressScaleInkWell({
    required this.child,
    required this.borderRadius,
    this.onTap,
    this.pressedScale = 0.96,
    this.hapticOnTapDown = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final BorderRadius borderRadius;
  final double pressedScale;
  final bool hapticOnTapDown;

  @override
  State<_PressScaleInkWell> createState() => _PressScaleInkWellState();
}

class _PressScaleInkWellState extends State<_PressScaleInkWell> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value || !mounted) {
      return;
    }
    setState(() {
      _pressed = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;

    return AnimatedScale(
      scale: enabled && _pressed ? widget.pressedScale : 1,
      duration: _pressed ? _kMicroPressDownDuration : _kMicroReleaseDuration,
      curve: _pressed ? Curves.easeOutCubic : Curves.easeOutBack,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: widget.borderRadius,
          onTapDown: enabled
              ? (_) {
                  if (widget.hapticOnTapDown) {
                    HapticFeedback.selectionClick();
                  }
                  _setPressed(true);
                }
              : null,
          onTapUp: enabled ? (_) => _setPressed(false) : null,
          onTapCancel: enabled ? () => _setPressed(false) : null,
          onTap: enabled
              ? () {
                  _setPressed(false);
                  widget.onTap?.call();
                }
              : null,
          child: widget.child,
        ),
      ),
    );
  }
}

class _CatalogCardTile extends StatelessWidget {
  final CardPrint card;
  final CardSurfacePricingData? pricing;
  final OwnershipState? ownershipState;
  final VoidCallback? onTap;
  final AppCardViewMode viewMode;

  const _CatalogCardTile({
    required this.card,
    required this.viewMode,
    required this.ownershipState,
    this.pricing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final compact = viewMode == AppCardViewMode.compactList;

    final subtitleParts = <String>[];
    if (compact) {
      final compactSet = card.setCode.isNotEmpty
          ? card.setCode.toUpperCase()
          : card.displaySet;
      if (compactSet.isNotEmpty) {
        subtitleParts.add(compactSet);
      }
    } else if (card.displaySet.isNotEmpty) {
      subtitleParts.add(card.displaySet);
    }
    if (card.displayNumber.isNotEmpty) {
      subtitleParts.add('#${card.displayNumber}');
    }
    if (!compact && (card.rarity ?? '').isNotEmpty) {
      subtitleParts.add(card.rarity!);
    }
    final subtitle = subtitleParts.join(' • ');
    final thumbWidth = compact ? 44.0 : 50.0;
    final thumbHeight = compact ? 62.0 : 72.0;

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 10 : 10,
        vertical: compact ? 2 : 3,
      ),
      child: _PressScaleInkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(compact ? 16 : 18),
        pressedScale: compact ? 0.982 : 0.978,
        child: Material(
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.24),
          borderRadius: BorderRadius.circular(compact ? 16 : 18),
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 8 : 8,
              vertical: compact ? 6 : 8,
            ),
            child: Row(
              children: [
                _thumb(card.displayImage, thumbWidth, thumbHeight),
                SizedBox(width: compact ? 7 : 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        card.name,
                        style:
                            (compact
                                    ? theme.textTheme.bodySmall
                                    : theme.textTheme.bodyMedium)
                                ?.copyWith(
                                  fontWeight: FontWeight.w500,
                                  height: 1.1,
                                ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle.isNotEmpty) ...[
                        SizedBox(height: compact ? 0 : 1),
                        Text(
                          subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.58,
                            ),
                            fontSize: compact ? 11.5 : null,
                          ),
                        ),
                      ],
                      if (pricing?.hasVisibleValue == true) ...[
                        SizedBox(height: compact ? 4 : 5),
                        Opacity(
                          opacity: 0.86,
                          child: CardSurfacePricePill(
                            pricing: pricing,
                            size: compact
                                ? CardSurfacePriceSize.dense
                                : CardSurfacePriceSize.list,
                          ),
                        ),
                      ],
                      _CatalogOwnershipSummaryLine(
                        ownershipState: ownershipState,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _thumb(String? url, double width, double height) {
    return CardSurfaceArtwork(
      label: card.name,
      imageUrl: url,
      width: width,
      height: height,
      borderRadius: 10,
      padding: const EdgeInsets.all(3),
      enableTapToZoom: false,
    );
  }
}

class _CatalogCardGridTile extends StatelessWidget {
  const _CatalogCardGridTile({
    required this.card,
    required this.onTap,
    required this.ownershipState,
    this.pricing,
  });

  final CardPrint card;
  final VoidCallback onTap;
  final CardSurfacePricingData? pricing;
  final OwnershipState? ownershipState;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final subtitleParts = <String>[
      if (card.displaySet.isNotEmpty)
        card.displaySet
      else if (card.setCode.isNotEmpty)
        card.setCode.toUpperCase(),
      if (card.displayNumber.isNotEmpty) '#${card.displayNumber}',
    ];
    final subtitle = subtitleParts.join(' • ');

    return Material(
      color: Colors.transparent,
      child: _PressScaleInkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        pressedScale: 0.972,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: _kWallMatchArtworkAspectRatio,
              child: _CatalogGridArtwork(card: card),
            ),
            const SizedBox(height: 6),
            SizedBox(
              height: _kWallMatchTitleHeight,
              child: Text(
                card.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.04,
                  letterSpacing: -0.3,
                ),
              ),
            ),
            const SizedBox(height: 3),
            SizedBox(
              height: _kWallMatchMetaHeight,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Text(
                      subtitle.isEmpty ? 'Card' : subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.60),
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.02,
                      ),
                    ),
                  ),
                  if (pricing?.hasVisibleValue == true) ...[
                    const SizedBox(width: 6),
                    CardSurfacePricePill(
                      pricing: pricing,
                      size: CardSurfacePriceSize.grid,
                    ),
                  ],
                ],
              ),
            ),
            SizedBox(
              height: _kWallMatchBottomRhythmHeight,
              child: Align(
                alignment: Alignment.centerLeft,
                child: _CatalogOwnershipSummaryLine(
                  ownershipState: ownershipState,
                  grid: true,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogGridArtwork extends StatelessWidget {
  const _CatalogGridArtwork({required this.card});

  final CardPrint card;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return CardSurfaceArtwork(
      label: card.name,
      imageUrl: card.displayImage,
      borderRadius: 22,
      padding: const EdgeInsets.all(1.5),
      backgroundColor: colorScheme.surfaceContainerLow.withValues(alpha: 0.52),
      enableTapToZoom: false,
    );
  }
}

class _CatalogOwnershipSummaryLine extends StatelessWidget {
  const _CatalogOwnershipSummaryLine({
    required this.ownershipState,
    this.grid = false,
  });

  final OwnershipState? ownershipState;
  final bool grid;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final state = ownershipState;
    if (state == null || !state.owned) {
      return const SizedBox.shrink();
    }

    // PERFORMANCE_P3_SYNC_OWNERSHIP_RENDER
    // Tile renders ownership from precomputed state, not async builder work.
    return Padding(
      padding: EdgeInsets.only(top: grid ? 0 : 4),
      child: Text(
        _ownershipSummaryLabel(state),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.labelSmall?.copyWith(
          color: colorScheme.onSurface.withValues(alpha: 0.58),
          fontWeight: FontWeight.w700,
          letterSpacing: 0.06,
        ),
      ),
    );
  }
}

class _ActionSheetPrimaryButton extends StatefulWidget {
  const _ActionSheetPrimaryButton({
    required this.label,
    required this.icon,
    this.onPressed,
    this.successState = false,
    this.isBusy = false,
  });

  final String label;
  final Widget icon;
  final VoidCallback? onPressed;
  final bool successState;
  final bool isBusy;

  @override
  State<_ActionSheetPrimaryButton> createState() =>
      _ActionSheetPrimaryButtonState();
}

class _ActionSheetPrimaryButtonState extends State<_ActionSheetPrimaryButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _successController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 240),
  );
  late final Animation<double> _successScale = TweenSequence<double>([
    TweenSequenceItem(
      tween: Tween<double>(
        begin: 1,
        end: 1.05,
      ).chain(CurveTween(curve: Curves.easeOutCubic)),
      weight: 45,
    ),
    TweenSequenceItem(
      tween: Tween<double>(
        begin: 1.05,
        end: 1,
      ).chain(CurveTween(curve: Curves.easeOutBack)),
      weight: 55,
    ),
  ]).animate(_successController);

  bool _pressed = false;

  @override
  void didUpdateWidget(covariant _ActionSheetPrimaryButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.successState && widget.successState) {
      _successController.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _successController.dispose();
    super.dispose();
  }

  void _setPressed(bool value) {
    if (_pressed == value || !mounted) {
      return;
    }
    setState(() {
      _pressed = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final enabled = widget.onPressed != null;
    final baseBackground = Color.lerp(
      colorScheme.primary,
      colorScheme.surface,
      0.12,
    )!;
    final background = enabled
        ? baseBackground
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.62);
    final foreground = enabled
        ? colorScheme.onPrimary
        : colorScheme.onSurface.withValues(alpha: 0.44);

    return AnimatedBuilder(
      animation: _successController,
      builder: (context, child) {
        final successScale = _successController.isAnimating
            ? _successScale.value
            : 1.0;
        final pressedScale = enabled && _pressed ? 0.968 : 1.0;
        return Transform.scale(
          scale: successScale * pressedScale,
          child: child,
        );
      },
      child: AnimatedContainer(
        duration: _pressed ? _kMicroPressDownDuration : _kMicroReleaseDuration,
        curve: _pressed ? Curves.easeOutCubic : Curves.easeOutBack,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: colorScheme.shadow.withValues(
                alpha: enabled ? (_pressed ? 0.08 : 0.16) : 0,
              ),
              blurRadius: enabled ? (_pressed ? 10 : 18) : 0,
              offset: Offset(0, enabled ? (_pressed ? 4 : 10) : 0),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTapDown: enabled
                ? (_) {
                    HapticFeedback.selectionClick();
                    _setPressed(true);
                  }
                : null,
            onTapUp: enabled ? (_) => _setPressed(false) : null,
            onTapCancel: enabled ? () => _setPressed(false) : null,
            onTap: enabled
                ? () {
                    _setPressed(false);
                    widget.onPressed?.call();
                  }
                : null,
            child: SizedBox(
              height: 48,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconTheme(
                      data: IconThemeData(color: foreground, size: 18),
                      child: DefaultTextStyle.merge(
                        style:
                            theme.textTheme.labelLarge?.copyWith(
                              color: foreground,
                              fontWeight: FontWeight.w700,
                            ) ??
                            TextStyle(
                              color: foreground,
                              fontWeight: FontWeight.w700,
                            ),
                        child: widget.icon,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        widget.label,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        style:
                            theme.textTheme.labelLarge?.copyWith(
                              color: foreground,
                              fontWeight: FontWeight.w700,
                            ) ??
                            TextStyle(
                              color: foreground,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _ownershipSummaryLabel(OwnershipState state) {
  if (!state.owned) {
    return '';
  }
  return state.ownedCount > 1 ? '${state.ownedCount} copies' : 'In Vault';
}

OwnershipAction _effectiveOwnershipAction(OwnershipState? state) {
  if (state == null) {
    return OwnershipAction.addToVault;
  }
  if (state.bestAction != OwnershipAction.none) {
    return state.bestAction;
  }
  return state.owned
      ? OwnershipAction.openManageCard
      : OwnershipAction.addToVault;
}

bool _canOpenOwnedSurface(OwnershipState? state) {
  if (state == null || !state.owned) {
    return false;
  }
  final hasGvvi = (state.primaryGvviId ?? '').trim().isNotEmpty;
  final hasVaultItem = (state.primaryVaultItemId ?? '').trim().isNotEmpty;
  return hasGvvi || hasVaultItem;
}

class _SearchResultActionSheet extends StatelessWidget {
  const _SearchResultActionSheet({
    required this.card,
    required this.onPrimaryAction,
    required this.onCopyGvid,
    required this.onOpenSet,
    required this.onShare,
    required this.onViewCard,
    required this.onViewYourCopy,
    required this.onRemoveFromVault,
    this.ownershipState,
    this.justAdded = false,
    this.pricing,
    this.isAdding = false,
    this.isOpeningOwnedCopy = false,
    this.isOpeningManageCard = false,
    this.isRemoving = false,
  });

  final CardPrint card;
  final CardSurfacePricingData? pricing;
  final VoidCallback onPrimaryAction;
  final VoidCallback onCopyGvid;
  final VoidCallback onOpenSet;
  final VoidCallback onShare;
  final VoidCallback onViewCard;
  final VoidCallback onViewYourCopy;
  final VoidCallback onRemoveFromVault;
  final OwnershipState? ownershipState;
  final bool justAdded;
  final bool isAdding;
  final bool isOpeningOwnedCopy;
  final bool isOpeningManageCard;
  final bool isRemoving;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final action = _effectiveOwnershipAction(ownershipState);
    final ownedCount = ownershipState?.ownedCount ?? 0;
    final interactionLocked =
        isAdding ||
        justAdded ||
        isOpeningOwnedCopy ||
        isOpeningManageCard ||
        isRemoving;
    final normalizedCompareId = normalizeCompareCardId(card.gvId ?? '');
    final gvid = (card.gvId ?? '').trim();
    final primaryLabel = switch (action) {
      OwnershipAction.viewYourCopy =>
        isOpeningOwnedCopy ? 'Opening your copy...' : 'View your copy',
      OwnershipAction.openManageCard =>
        isOpeningManageCard ? 'Opening manage card...' : 'Manage card',
      OwnershipAction.addAnotherCopy =>
        isAdding
            ? 'Adding copy...'
            : justAdded
            ? 'Added ✓'
            : 'Add another copy',
      OwnershipAction.addToVault || OwnershipAction.none =>
        isAdding
            ? 'Adding...'
            : justAdded
            ? 'Added ✓'
            : 'Add to Vault',
    };
    final showOwnedShortcut =
        _canOpenOwnedSurface(ownershipState) &&
        action != OwnershipAction.viewYourCopy &&
        action != OwnershipAction.openManageCard;
    final hasSubtitle =
        card.displaySet.isNotEmpty ||
        card.displayNumber.isNotEmpty ||
        (card.rarity ?? '').isNotEmpty;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 256),
                child: AspectRatio(
                  aspectRatio: 3 / 4,
                  child: CardSurfaceArtwork(
                    label: card.name,
                    imageUrl: card.displayImage,
                    borderRadius: 24,
                    padding: const EdgeInsets.all(6),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              card.name,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            if (hasSubtitle) ...[
              const SizedBox(height: 4),
              Center(
                child: Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 4,
                  runSpacing: 2,
                  children: [
                    if (card.displaySet.isNotEmpty)
                      _ActionSheetMetadataLink(
                        label: card.displaySet,
                        onTap: interactionLocked ? null : onOpenSet,
                      ),
                    if (card.displayNumber.isNotEmpty)
                      _ActionSheetMetadataText(label: '#${card.displayNumber}'),
                    if ((card.rarity ?? '').isNotEmpty)
                      _ActionSheetMetadataText(label: card.rarity!),
                  ],
                ),
              ),
            ],
            if (pricing?.hasVisibleValue == true) ...[
              const SizedBox(height: 9),
              Center(
                child: MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(textScaler: const TextScaler.linear(1.08)),
                  child: Transform.scale(
                    scale: 1.04,
                    child: CardSurfacePricePill(
                      pricing: pricing,
                      size: CardSurfacePriceSize.list,
                    ),
                  ),
                ),
              ),
            ],
            if (gvid.isNotEmpty) ...[
              const SizedBox(height: 6),
              Center(
                child: _PressScaleInkWell(
                  onTap: interactionLocked ? null : onCopyGvid,
                  borderRadius: BorderRadius.circular(13),
                  pressedScale: 0.99,
                  hapticOnTapDown: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest.withValues(
                        alpha: 0.07,
                      ),
                      borderRadius: BorderRadius.circular(13),
                      border: Border.all(
                        color: colorScheme.outline.withValues(alpha: 0.045),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'GVID',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.34,
                            ),
                            fontWeight: FontWeight.w600,
                            fontSize: 10.0,
                            letterSpacing: 0.28,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          gvid,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.52,
                            ),
                            fontWeight: FontWeight.w500,
                            fontSize: 10.8,
                            letterSpacing: 0.08,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Icon(
                          Icons.content_copy_rounded,
                          size: 13,
                          color: colorScheme.onSurface.withValues(alpha: 0.34),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            if (ownershipState?.owned == true) ...[
              const SizedBox(height: 10),
              Center(
                child: Text(
                  _ownershipSummaryLabel(ownershipState!),
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.68),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
            if (showOwnedShortcut) ...[
              const SizedBox(height: 10),
              Center(
                child: _PressScaleInkWell(
                  onTap: interactionLocked ? null : onViewYourCopy,
                  borderRadius: BorderRadius.circular(16),
                  pressedScale: 0.985,
                  hapticOnTapDown: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isOpeningOwnedCopy)
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.72,
                              ),
                            ),
                          )
                        else
                          Icon(
                            Icons.collections_bookmark_outlined,
                            size: 18,
                            color: colorScheme.onSurface.withValues(alpha: 0.8),
                          ),
                        const SizedBox(width: 8),
                        Text(
                          isOpeningOwnedCopy
                              ? 'Opening your copy...'
                              : 'View your copy',
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.84,
                            ),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 12),
            _ActionSheetPrimaryButton(
              onPressed: interactionLocked ? null : onPrimaryAction,
              successState:
                  justAdded &&
                  (action == OwnershipAction.addToVault ||
                      action == OwnershipAction.addAnotherCopy),
              isBusy: isAdding || isOpeningOwnedCopy || isOpeningManageCard,
              icon: isAdding
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : isOpeningOwnedCopy || isOpeningManageCard
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(switch (action) {
                      OwnershipAction.viewYourCopy =>
                        Icons.collections_bookmark_outlined,
                      OwnershipAction.openManageCard => Icons.tune_rounded,
                      OwnershipAction.addAnotherCopy =>
                        justAdded
                            ? Icons.check_circle_rounded
                            : Icons.add_circle_outline_rounded,
                      OwnershipAction.addToVault || OwnershipAction.none =>
                        justAdded
                            ? Icons.check_circle_rounded
                            : Icons.add_circle_outline_rounded,
                    }),
              label: primaryLabel,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _ActionSheetSecondaryButton(
                    icon: Icons.style_outlined,
                    label: 'View card',
                    expand: true,
                    onPressed: interactionLocked ? null : onViewCard,
                  ),
                ),
                if (normalizedCompareId.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: ValueListenableBuilder<List<String>>(
                      valueListenable:
                          CompareCardSelectionController.instance.listenable,
                      builder: (context, selectedIds, _) {
                        final isSelected = selectedIds.contains(
                          normalizedCompareId,
                        );
                        return _ActionSheetSecondaryButton(
                          icon: isSelected
                              ? Icons.check_circle_rounded
                              : Icons.compare_arrows_rounded,
                          label: isSelected ? 'In compare' : 'Compare',
                          expand: true,
                          onPressed: interactionLocked
                              ? null
                              : () {
                                  if (!isSelected &&
                                      selectedIds.length >= kMaxCompareCards) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Compare supports up to $kMaxCompareCards cards at a time.',
                                        ),
                                      ),
                                    );
                                    return;
                                  }
                                  CompareCardSelectionController.instance
                                      .toggle(normalizedCompareId);
                                },
                          highlighted: isSelected,
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(width: 8),
                Expanded(
                  child: _ActionSheetSecondaryButton(
                    icon: Icons.share_outlined,
                    label: 'Share',
                    expand: true,
                    onPressed: interactionLocked ? null : onShare,
                  ),
                ),
              ],
            ),
            if (ownershipState?.owned == true) ...[
              const SizedBox(height: 8),
              Center(
                child: _ActionSheetSecondaryButton(
                  icon: isRemoving
                      ? Icons.hourglass_top_rounded
                      : Icons.remove_circle_outline_rounded,
                  label: isRemoving ? 'Removing...' : 'Remove from Vault',
                  onPressed: interactionLocked ? null : onRemoveFromVault,
                ),
              ),
            ],
            if (ownedCount > 1) ...[
              const SizedBox(height: 10),
              Center(
                child: Text(
                  '$ownedCount active copies in your vault',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.54),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActionSheetSecondaryButton extends StatefulWidget {
  const _ActionSheetSecondaryButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.expand = false,
    this.highlighted = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool expand;
  final bool highlighted;

  @override
  State<_ActionSheetSecondaryButton> createState() =>
      _ActionSheetSecondaryButtonState();
}

class _ActionSheetSecondaryButtonState
    extends State<_ActionSheetSecondaryButton> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value || !mounted) {
      return;
    }
    setState(() {
      _pressed = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final foreground = widget.highlighted
        ? colorScheme.primary
        : colorScheme.onSurface.withValues(alpha: 0.74);
    final background = widget.highlighted
        ? colorScheme.primary.withValues(alpha: 0.08)
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.18);
    final borderColor = widget.highlighted
        ? colorScheme.primary.withValues(alpha: 0.22)
        : colorScheme.outline.withValues(alpha: 0.1);
    final enabled = widget.onPressed != null;

    return AnimatedScale(
      scale: enabled && _pressed ? 0.975 : 1,
      duration: _pressed ? _kMicroPressDownDuration : _kMicroReleaseDuration,
      curve: _pressed ? Curves.easeOutCubic : Curves.easeOutBack,
      child: AnimatedContainer(
        duration: _pressed ? _kMicroPressDownDuration : _kMicroReleaseDuration,
        curve: _pressed ? Curves.easeOutCubic : Curves.easeOutBack,
        decoration: BoxDecoration(
          color: enabled
              ? background
              : colorScheme.surfaceContainerHighest.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTapDown: enabled ? (_) => _setPressed(true) : null,
            onTapUp: enabled ? (_) => _setPressed(false) : null,
            onTapCancel: enabled ? () => _setPressed(false) : null,
            onTap: enabled
                ? () {
                    _setPressed(false);
                    widget.onPressed?.call();
                  }
                : null,
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: widget.expand ? 10 : 12,
                vertical: 10,
              ),
              child: Row(
                mainAxisSize: widget.expand
                    ? MainAxisSize.max
                    : MainAxisSize.min,
                mainAxisAlignment: widget.expand
                    ? MainAxisAlignment.center
                    : MainAxisAlignment.start,
                children: [
                  Icon(
                    widget.icon,
                    size: widget.expand ? 16 : 17,
                    color: foreground,
                  ),
                  SizedBox(width: widget.expand ? 6 : 8),
                  Flexible(
                    child: Text(
                      widget.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: enabled
                            ? foreground
                            : colorScheme.onSurface.withValues(alpha: 0.38),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionSheetMetadataLink extends StatelessWidget {
  const _ActionSheetMetadataLink({required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return _PressScaleInkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      pressedScale: 0.992,
      hapticOnTapDown: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1),
        child: Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.primary.withValues(alpha: 0.82),
            fontWeight: FontWeight.w600,
            decoration: TextDecoration.underline,
            decorationColor: colorScheme.primary.withValues(alpha: 0.28),
            decorationThickness: 1.2,
          ),
        ),
      ),
    );
  }
}

class _ActionSheetMetadataText extends StatelessWidget {
  const _ActionSheetMetadataText({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      textAlign: TextAlign.center,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
      ),
    );
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _loadEnv();

  final url = supabaseUrl;
  final key = supabasePublishableKey;
  if (url.isEmpty || key.isEmpty) {
    throw Exception(
      'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Update your .env.local file.',
    );
  }

  await Supabase.initialize(
    url: url,
    anonKey: key,
    authOptions: const FlutterAuthClientOptions(detectSessionInUri: false),
  );
  runApp(const MyApp());
}

Future<void> _loadEnv() async {
  try {
    await dotenv.load(fileName: '.env.local');
  } catch (_) {
    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {
      // fall through; missing files will be handled by guard in main()
    }
  }
}

/// Root app with an auth gate: session -> AppShell, else -> LoginPage.
class PendingCanonicalLinkRequest {
  const PendingCanonicalLinkRequest({required this.id, required this.route});

  final int id;
  final GrookaiCanonicalRoute route;
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;
  StreamSubscription<AuthState>? _authSubscription;
  PendingCanonicalLinkRequest? _pendingCanonicalLink;
  int _nextPendingCanonicalLinkId = 0;
  bool _authCallbackInFlight = false;

  @override
  void initState() {
    super.initState();
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((
      event,
    ) {
      _debugGoogleOAuth(
        'auth state event=${event.event.name} '
        'sessionPresent=${event.session != null}',
      );
    });
    unawaited(_attachCanonicalLinkListeners());
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _authSubscription?.cancel();
    super.dispose();
  }

  Future<void> _attachCanonicalLinkListeners() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      _debugGoogleOAuth('initial uri=${_describeUri(initialUri)}');
      await _handleIncomingLink(initialUri);
    } catch (_) {
      // Ignore malformed or unavailable initial links and continue booting
      // normally.
    }

    _linkSubscription = _appLinks.uriLinkStream.listen(
      (uri) => unawaited(_handleIncomingLink(uri)),
      onError: (_) {
        // Ignore transient link stream failures and keep the app usable.
      },
    );
  }

  Future<void> _handleIncomingLink(Uri? uri) async {
    if (uri == null || !mounted) {
      return;
    }

    _debugGoogleOAuth('inbound uri=${_describeUri(uri)}');
    if (await _maybeHandleAuthCallback(uri)) {
      return;
    }

    _queueCanonicalLink(uri);
  }

  Future<bool> _maybeHandleAuthCallback(Uri uri) async {
    if (!_isLoginCallbackUri(uri)) {
      return false;
    }

    _debugGoogleOAuth('callback matched uri=${_describeUri(uri)}');
    if (_authCallbackInFlight) {
      _debugGoogleOAuth(
        'callback ignored because auth callback already in flight',
      );
      return true;
    }

    if (!_hasOAuthPayload(uri)) {
      _debugGoogleOAuth('callback had no auth payload');
      return true;
    }

    _authCallbackInFlight = true;
    try {
      _debugGoogleOAuth('calling getSessionFromUrl');
      await Supabase.instance.client.auth.getSessionFromUrl(uri);
      _debugGoogleOAuth(
        'getSessionFromUrl returned sessionPresent='
        '${Supabase.instance.client.auth.currentSession != null}',
      );
    } catch (error, stackTrace) {
      _debugGoogleOAuth('getSessionFromUrl threw error=$error');
      assert(() {
        debugPrint('[GOOGLE_OAUTH_V1] stackTrace=$stackTrace');
        return true;
      }());
    } finally {
      _authCallbackInFlight = false;
    }

    return true;
  }

  bool _isLoginCallbackUri(Uri uri) {
    return uri.scheme.toLowerCase() == 'grookaivault' &&
        uri.host.toLowerCase() == 'login-callback';
  }

  bool _hasOAuthPayload(Uri uri) {
    if (uri.queryParameters.containsKey('code') ||
        uri.queryParameters.containsKey('error') ||
        uri.queryParameters.containsKey('error_description')) {
      return true;
    }

    final fragment = uri.fragment;
    return fragment.contains('access_token=') ||
        fragment.contains('refresh_token=') ||
        fragment.contains('error_description=');
  }

  String _describeUri(Uri? uri) {
    if (uri == null) {
      return 'null';
    }

    final queryKeys = uri.queryParameters.keys.toList(growable: false);
    final fragment = uri.fragment;
    final fragmentKeys = fragment
        .split('&')
        .map((part) => part.split('=').first.trim())
        .where((part) => part.isNotEmpty)
        .toList(growable: false);

    return '${uri.scheme}://${uri.host}${uri.path}'
        ' queryKeys=$queryKeys fragmentKeys=$fragmentKeys';
  }

  void _debugGoogleOAuth(String message) {
    if (!_kGoogleOAuthDiagnostics) {
      return;
    }
    debugPrint('[GOOGLE_OAUTH_V1] $message');
  }

  void _queueCanonicalLink(Uri? uri) {
    final route = GrookaiWebRouteService.parseCanonicalUri(uri);
    if (!mounted || route == null) {
      return;
    }

    setState(() {
      _pendingCanonicalLink = PendingCanonicalLinkRequest(
        id: ++_nextPendingCanonicalLinkId,
        route: route,
      );
    });
  }

  void _handleCanonicalLinkConsumed(int id) {
    if (!mounted || _pendingCanonicalLink?.id != id) {
      return;
    }

    setState(() {
      _pendingCanonicalLink = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final supabase = Supabase.instance.client;
    final app = MaterialApp(
      title: 'Grookai Vault',
      theme: _buildGrookaiTheme(Brightness.light),
      darkTheme: _buildGrookaiTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: StreamBuilder<AuthState>(
        stream: supabase.auth.onAuthStateChange,
        initialData: AuthState(
          AuthChangeEvent.initialSession,
          supabase.auth.currentSession,
        ),
        builder: (context, _) {
          final session = supabase.auth.currentSession;
          _debugGoogleOAuth(
            'auth gate sessionPresent=${session != null} '
            'pendingCanonicalLink=${_pendingCanonicalLink != null}',
          );
          return session == null
              ? const LoginPage()
              : AppShell(
                  pendingCanonicalLink: _pendingCanonicalLink,
                  onCanonicalLinkHandled: _handleCanonicalLinkConsumed,
                );
        },
      ),
    );
    if (!kDebugTouchLog) return app;
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (e) {
        debugPrint(
          '[TOUCH] down x=${e.position.dx.toStringAsFixed(1)} y=${e.position.dy.toStringAsFixed(1)}',
        );
      },
      child: app,
    );
  }
}

/// ---------------------- HOME PAGE (catalog search) ----------------------
class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  HomePageState createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  final supabase = Supabase.instance.client;
  final _ownershipAdapter = OwnershipResolverAdapter.instance;
  final _searchCtrl = TextEditingController();
  List<CardPrint> _results = const [];
  List<CardPrint> _trending = const [];
  Map<String, OwnershipState> _catalogOwnershipByCardPrintId =
      const <String, OwnershipState>{};
  Map<String, CardSurfacePricingData> _resultPricing = const {};
  Map<String, CardSurfacePricingData> _trendingPricing = const {};
  CardSearchResolverMeta? _resolverMeta;
  bool _loading = false;
  String? _searchError;
  Timer? _debounce;
  int _searchRequestVersion = 0;
  _RarityFilter _rarityFilter = _RarityFilter.all;
  AppCardViewMode _viewMode = AppCardViewMode.grid;
  final Set<String> _addingCardIds = <String>{};

  bool _shouldShowCuratedLanding([String? query]) {
    final trimmed = (query ?? _searchCtrl.text).trim();
    return trimmed.isEmpty && _rarityFilter == _RarityFilter.all;
  }

  void _resetCuratedLandingState() {
    _searchRequestVersion++;
    _debounce?.cancel();
    setState(() {
      _results = const [];
      _resultPricing = const {};
      _resolverMeta = null;
      _searchError = null;
      _loading = false;
    });
  }

  List<_CatalogRow> _buildRows(List<CardPrint> cards) {
    final rows = <_CatalogRow>[];
    String? lastSet;
    for (final card in cards) {
      final setTitle = card.displaySet;
      if (setTitle != lastSet) {
        lastSet = setTitle;
        rows.add(_CatalogHeaderRow(setTitle));
      }
      rows.add(_CatalogCardRow(card));
    }
    return rows;
  }

  Future<Map<String, OwnershipState>> _primeCatalogOwnershipStates(
    Iterable<CardPrint> cards,
  ) async {
    final cardPrintIds = cards
        .map((card) => card.id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (cardPrintIds.isEmpty) {
      return const <String, OwnershipState>{};
    }

    try {
      await _ownershipAdapter.primeBatch(cardPrintIds);
      return _ownershipAdapter.snapshotForIds(cardPrintIds);
    } catch (error) {
      _debugCatalogOwnership('prime failed: $error');
      return const <String, OwnershipState>{};
    }
  }

  OwnershipState? _catalogOwnershipStateForCard(String cardPrintId) {
    final normalized = cardPrintId.trim();
    if (normalized.isEmpty) {
      return null;
    }

    return _catalogOwnershipByCardPrintId[normalized] ??
        _ownershipAdapter.peek(normalized);
  }

  Future<OwnershipState?> _ensureCatalogOwnershipState(
    String cardPrintId,
  ) async {
    final normalized = cardPrintId.trim();
    if (normalized.isEmpty) {
      return null;
    }

    final cached = _catalogOwnershipStateForCard(normalized);
    if (cached != null) {
      return cached;
    }

    try {
      await _ownershipAdapter.primeBatch([normalized]);
      final state = _ownershipAdapter.peek(normalized);
      if (mounted && state != null) {
        setState(() {
          _catalogOwnershipByCardPrintId = <String, OwnershipState>{
            ..._catalogOwnershipByCardPrintId,
            normalized: state,
          };
        });
      }
      return state;
    } catch (error) {
      _debugCatalogOwnership('refresh prime failed: $error');
      return null;
    }
  }

  void _debugCatalogOwnership(String message) {
    if (!_kCatalogOwnershipDiagnostics) {
      return;
    }
    assert(() {
      debugPrint('CATALOG_OWNERSHIP $message');
      return true;
    }());
  }

  Future<OwnershipState?> _refreshCatalogOwnershipState(
    String cardPrintId,
  ) async {
    final state = await _ownershipAdapter.refresh(cardPrintId);
    if (mounted) {
      setState(() {
        _catalogOwnershipByCardPrintId = <String, OwnershipState>{
          ..._catalogOwnershipByCardPrintId,
          cardPrintId.trim(): state,
        };
      });
    }
    return state;
  }

  @override
  void initState() {
    super.initState();
    _loadTrending();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    if (_shouldShowCuratedLanding()) {
      _resetCuratedLandingState();
      return;
    }
    await _runSearch(_searchCtrl.text);
  }

  Future<void> _loadTrending() async {
    final rows = await CardPrintRepository.fetchTrending(client: supabase);
    var pricing = const <String, CardSurfacePricingData>{};
    try {
      pricing = await CardSurfacePricingService.fetchByCardPrintIds(
        client: supabase,
        cardPrintIds: rows.map((card) => card.id),
      );
    } catch (_) {
      pricing = const <String, CardSurfacePricingData>{};
    }
    final ownershipStates = await _primeCatalogOwnershipStates(rows);
    if (!mounted) return;
    setState(() {
      _trending = rows;
      _trendingPricing = pricing;
      _catalogOwnershipByCardPrintId = <String, OwnershipState>{
        ..._catalogOwnershipByCardPrintId,
        ...ownershipStates,
      };
    });
  }

  Widget _buildRarityChip(_RarityFilter filter, String label) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bool selected = _rarityFilter == filter;

    Color bg;
    Color border;
    Color text;

    if (selected) {
      bg = colorScheme.primary.withValues(alpha: 0.10);
      border = colorScheme.primary;
      text = colorScheme.primary;
    } else {
      bg = colorScheme.surfaceContainerHighest.withValues(alpha: 0.28);
      border = Colors.transparent;
      text = colorScheme.onSurface.withValues(alpha: 0.68);
    }

    return ChoiceChip(
      label: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: text,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
      selected: selected,
      onSelected: (_) => _handleRarityFilterChanged(filter),
      selectedColor: bg,
      backgroundColor: bg,
      side: BorderSide(color: border, width: selected ? 1.0 : 0.0),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }

  List<CardPrint> _applyRarityFilter(List<CardPrint> cards) {
    if (_rarityFilter == _RarityFilter.all) return cards;

    bool matchesRarity(String? rarity, _RarityFilter filter) {
      final raw = (rarity ?? '').toLowerCase();
      if (raw.isEmpty) return false;

      switch (filter) {
        case _RarityFilter.common:
          return raw.contains('common');
        case _RarityFilter.uncommon:
          return raw.contains('uncommon');
        case _RarityFilter.rare:
          return raw.contains('rare') &&
              !raw.contains('ultra') &&
              !raw.contains('secret');
        case _RarityFilter.ultra:
          return raw.contains('ultra') || raw.contains('secret');
        case _RarityFilter.all:
          return true;
      }
    }

    return cards
        .where((card) => matchesRarity(card.rarity, _rarityFilter))
        .toList();
  }

  Future<void> _runSearch(String query) async {
    final trimmed = query.trim();
    if (_shouldShowCuratedLanding(trimmed)) {
      _resetCuratedLandingState();
      return;
    }

    final requestVersion = ++_searchRequestVersion;
    setState(() => _loading = true);
    try {
      final resolved = await CardPrintRepository.searchCardPrintsResolved(
        client: supabase,
        options: CardSearchOptions(query: trimmed),
      );
      var pricing = const <String, CardSurfacePricingData>{};
      try {
        pricing = await CardSurfacePricingService.fetchByCardPrintIds(
          client: supabase,
          cardPrintIds: resolved.rows.map((card) => card.id),
        );
      } catch (_) {
        pricing = const <String, CardSurfacePricingData>{};
      }
      final ownershipStates = await _primeCatalogOwnershipStates(resolved.rows);
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      setState(() {
        _results = resolved.rows;
        _resultPricing = pricing;
        _catalogOwnershipByCardPrintId = <String, OwnershipState>{
          ..._catalogOwnershipByCardPrintId,
          ...ownershipStates,
        };
        _resolverMeta = resolved.meta;
        _searchError = null;
      });
    } catch (error) {
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      setState(() {
        _results = const [];
        _resultPricing = const {};
        _resolverMeta = null;
        _searchError = error is Error ? error.toString() : 'Search failed.';
      });
    } finally {
      if (mounted && requestVersion == _searchRequestVersion) {
        setState(() => _loading = false);
      }
    }
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    if (_shouldShowCuratedLanding(value)) {
      _resetCuratedLandingState();
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _runSearch(value.trim());
    });
  }

  void _handleRarityFilterChanged(_RarityFilter filter) {
    if (_rarityFilter == filter) {
      return;
    }

    setState(() {
      _rarityFilter = filter;
    });

    final currentQuery = _searchCtrl.text;
    if (currentQuery.trim().isEmpty && filter == _RarityFilter.all) {
      _resetCuratedLandingState();
      return;
    }

    _runSearch(currentQuery);
  }

  Future<void> _openSetsScreen() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const PublicSetsScreen()));
  }

  Future<void> _openCompareScreen() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const CompareScreen()));
  }

  // SEARCH_FLOW_AUDIT
  // current behavior: search results opened card detail directly, and artwork zoom could steal taps into preview.
  // expected behavior: card-first action hub
  Future<void> _openSearchCardActionHub(CardPrint card) async {
    final pricing = _resultPricing[card.id] ?? _trendingPricing[card.id];
    // PERFORMANCE_P6_MAIN_SYNC_OWNERSHIP_CLOSEOUT
    // Remaining main.dart ownership signals render from precomputed snapshot state only.
    var ownershipState = await _ensureCatalogOwnershipState(card.id);
    var justAdded = false;
    var openingOwnedCopy = false;
    var openingManageCard = false;
    var removingFromVault = false;
    final gvid = (card.gvId ?? '').trim();
    final canonicalCardUri = gvid.isEmpty
        ? null
        : GrookaiWebRouteService.buildUri('/card/${Uri.encodeComponent(gvid)}');
    if (!mounted) {
      return;
    }
    final parentNavigator = Navigator.of(context);
    final parentMessenger = ScaffoldMessenger.of(context);
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      isScrollControlled: true,
      sheetAnimationStyle: const AnimationStyle(
        duration: _kDrawerOpenDuration,
        reverseDuration: _kDrawerCloseDuration,
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) {
          Future<void> handleAdd() async {
            if (_addingCardIds.contains(card.id)) {
              return;
            }

            setSheetState(() {
              justAdded = false;
            });

            final gvviId = await _addToVaultFromSearch(card);
            if (!mounted || gvviId == null || gvviId.isEmpty) {
              return;
            }

            if (!sheetContext.mounted) {
              return;
            }

            HapticFeedback.lightImpact();
            final refreshedOwnershipState = await _refreshCatalogOwnershipState(
              card.id,
            );
            if (!mounted || !sheetContext.mounted) {
              return;
            }
            setSheetState(() {
              justAdded = true;
              ownershipState = refreshedOwnershipState;
            });
            parentMessenger
              ..hideCurrentSnackBar()
              ..showSnackBar(
                const SnackBar(
                  content: Text('Added to your vault'),
                  duration: Duration(milliseconds: 1600),
                ),
              );

            await Future.delayed(_kActionFeedbackDuration);
            if (!mounted || !sheetContext.mounted) {
              return;
            }

            Navigator.of(sheetContext).pop();
            await parentNavigator.push(
              MaterialPageRoute<void>(
                builder: (_) =>
                    VaultGvviScreen(gvviId: gvviId, launchedFromSearch: true),
              ),
            );
          }

          void handleViewCard() {
            Navigator.of(sheetContext).pop();
            _openCardDetail(card);
          }

          // EXPLORE_SET_LINK_V1
          // set route source: CardPrint.setCode from the Explore result model.
          // destination path: PublicSetDetailScreen(setCode: card.setCode).
          Future<void> handleOpenSet() async {
            final setCode = card.setCode.trim();
            if (setCode.isEmpty) {
              parentMessenger
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(
                    content: Text('Unable to open this set right now'),
                    duration: Duration(milliseconds: 1400),
                  ),
                );
              return;
            }

            Navigator.of(sheetContext).pop();
            await parentNavigator.push(
              MaterialPageRoute<void>(
                builder: (_) => PublicSetDetailScreen(setCode: setCode),
              ),
            );
          }

          Future<void> handleCopyGvid() async {
            if (gvid.isEmpty) {
              return;
            }

            await Clipboard.setData(ClipboardData(text: gvid));
            if (!mounted || !sheetContext.mounted) {
              return;
            }

            HapticFeedback.selectionClick();
            parentMessenger
              ..hideCurrentSnackBar()
              ..showSnackBar(
                const SnackBar(
                  content: Text('GVID copied'),
                  duration: Duration(milliseconds: 1200),
                ),
              );
          }

          Future<void> handleShare() async {
            final shareUri = canonicalCardUri;
            if (shareUri == null) {
              parentMessenger
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(
                    content: Text('Unable to share this card right now'),
                    duration: Duration(milliseconds: 1400),
                  ),
                );
              return;
            }

            try {
              await SharePlus.instance.share(
                ShareParams(uri: shareUri, subject: card.name),
              );
            } catch (_) {
              if (!mounted || !sheetContext.mounted) {
                return;
              }
              parentMessenger
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(
                    content: Text('Unable to share this card right now'),
                    duration: Duration(milliseconds: 1400),
                  ),
                );
            }
          }

          Future<void> handleViewYourCopy() async {
            if (openingOwnedCopy || removingFromVault || openingManageCard) {
              return;
            }

            setSheetState(() {
              openingOwnedCopy = true;
            });

            try {
              final directGvviId = (ownershipState?.primaryGvviId ?? '').trim();
              final directVaultItemId =
                  (ownershipState?.primaryVaultItemId ?? '').trim();
              final target = directGvviId.isNotEmpty
                  ? null
                  : await _resolveLatestOwnedCopyTarget(card.id);
              final anchor =
                  directGvviId.isNotEmpty ||
                      directVaultItemId.isNotEmpty ||
                      target != null
                  ? null
                  : await _resolveOwnedCardAnchor(card.id);
              if (!mounted || !sheetContext.mounted) {
                return;
              }

              final resolvedGvviId = directGvviId.isNotEmpty
                  ? directGvviId
                  : target?.gvviId;
              final resolvedVaultItemId = directVaultItemId.isNotEmpty
                  ? directVaultItemId
                  : target?.vaultItemId ?? anchor?.vaultItemId;

              if ((resolvedGvviId ?? '').isEmpty &&
                  (resolvedVaultItemId ?? '').isEmpty) {
                parentMessenger
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    const SnackBar(
                      content: Text('No active owned copy was found.'),
                      duration: Duration(milliseconds: 1400),
                    ),
                  );
                return;
              }

              Navigator.of(sheetContext).pop();
              if ((resolvedGvviId ?? '').isNotEmpty) {
                await parentNavigator.push(
                  MaterialPageRoute<void>(
                    builder: (_) => VaultGvviScreen(gvviId: resolvedGvviId!),
                  ),
                );
              } else {
                await parentNavigator.push(
                  MaterialPageRoute<void>(
                    builder: (_) => VaultManageCardScreen(
                      vaultItemId: resolvedVaultItemId!,
                      cardPrintId: card.id,
                      ownedCount: ownershipState?.ownedCount ?? 1,
                      gvId: (card.gvId ?? '').trim().isEmpty ? null : card.gvId,
                      name: card.name,
                      setName: card.displaySet,
                      number: card.displayNumber,
                      imageUrl: card.displayImage,
                    ),
                  ),
                );
              }

              if (mounted) {
                unawaited(_refreshCatalogOwnershipState(card.id));
              }
            } finally {
              if (sheetContext.mounted) {
                setSheetState(() {
                  openingOwnedCopy = false;
                });
              }
            }
          }

          Future<void> handleManageCard() async {
            if (openingManageCard || removingFromVault || openingOwnedCopy) {
              return;
            }

            setSheetState(() {
              openingManageCard = true;
            });

            try {
              final directVaultItemId =
                  (ownershipState?.primaryVaultItemId ?? '').trim();
              final anchor = directVaultItemId.isNotEmpty
                  ? null
                  : await _resolveOwnedCardAnchor(card.id);
              if (!mounted || !sheetContext.mounted) {
                return;
              }

              final resolvedVaultItemId = directVaultItemId.isNotEmpty
                  ? directVaultItemId
                  : anchor?.vaultItemId;
              if ((resolvedVaultItemId ?? '').isEmpty) {
                parentMessenger
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    const SnackBar(
                      content: Text('Manage Card is not available yet.'),
                      duration: Duration(milliseconds: 1400),
                    ),
                  );
                return;
              }

              Navigator.of(sheetContext).pop();
              await parentNavigator.push(
                MaterialPageRoute<void>(
                  builder: (_) => VaultManageCardScreen(
                    vaultItemId: resolvedVaultItemId!,
                    cardPrintId: card.id,
                    ownedCount: ownershipState?.ownedCount ?? 1,
                    gvId: (card.gvId ?? '').trim().isEmpty ? null : card.gvId,
                    name: card.name,
                    setName: card.displaySet,
                    number: card.displayNumber,
                    imageUrl: card.displayImage,
                  ),
                ),
              );
              if (mounted) {
                unawaited(_refreshCatalogOwnershipState(card.id));
              }
            } finally {
              if (sheetContext.mounted) {
                setSheetState(() {
                  openingManageCard = false;
                });
              }
            }
          }

          Future<void> handlePrimaryAction() async {
            switch (_effectiveOwnershipAction(ownershipState)) {
              case OwnershipAction.viewYourCopy:
                await handleViewYourCopy();
                return;
              case OwnershipAction.openManageCard:
                await handleManageCard();
                return;
              case OwnershipAction.addAnotherCopy:
              case OwnershipAction.addToVault:
              case OwnershipAction.none:
                await handleAdd();
                return;
            }
          }

          Future<void> handleRemoveFromVault() async {
            final ownedCount = ownershipState?.ownedCount ?? 0;
            if (ownedCount <= 0 ||
                removingFromVault ||
                openingOwnedCopy ||
                openingManageCard) {
              return;
            }

            setSheetState(() {
              removingFromVault = true;
            });

            try {
              final target = await _resolveLatestOwnedCopyTarget(card.id);
              final anchor = target == null
                  ? await _resolveOwnedCardAnchor(card.id)
                  : null;
              if (!mounted || !sheetContext.mounted) {
                return;
              }
              if (target == null && anchor == null) {
                final refreshedOwnershipState =
                    await _refreshCatalogOwnershipState(card.id);
                if (!sheetContext.mounted) {
                  return;
                }
                setSheetState(() {
                  ownershipState = refreshedOwnershipState;
                });
                return;
              }

              if (target != null) {
                await VaultGvviService.archiveExactCopy(
                  client: supabase,
                  instanceId: target.instanceId,
                );
              } else {
                final userId = supabase.auth.currentUser?.id;
                if (userId == null || userId.isEmpty) {
                  throw Exception('Sign in required.');
                }
                await VaultCardService.archiveOneVaultItem(
                  client: supabase,
                  userId: userId,
                  vaultItemId: anchor!.vaultItemId,
                  cardId: anchor.cardPrintId,
                );
              }

              if (!mounted || !sheetContext.mounted) {
                return;
              }
              HapticFeedback.selectionClick();
              parentMessenger
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(
                    content: Text('Removed one copy from your vault'),
                    duration: Duration(milliseconds: 1500),
                  ),
                );
              final refreshedOwnershipState =
                  await _refreshCatalogOwnershipState(card.id);
              if (!sheetContext.mounted) {
                return;
              }
              setSheetState(() {
                justAdded = false;
                ownershipState = refreshedOwnershipState;
              });
            } catch (error) {
              if (!mounted || !sheetContext.mounted) {
                return;
              }
              parentMessenger
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  SnackBar(
                    content: Text(
                      error.toString().replaceFirst('Exception: ', ''),
                    ),
                  ),
                );
            } finally {
              if (sheetContext.mounted) {
                setSheetState(() {
                  removingFromVault = false;
                });
              }
            }
          }

          return _SearchResultActionSheet(
            card: card,
            pricing: pricing,
            ownershipState: ownershipState,
            justAdded: justAdded,
            isAdding: _addingCardIds.contains(card.id),
            isOpeningOwnedCopy: openingOwnedCopy,
            isOpeningManageCard: openingManageCard,
            isRemoving: removingFromVault,
            onPrimaryAction: handlePrimaryAction,
            onCopyGvid: handleCopyGvid,
            onOpenSet: handleOpenSet,
            onShare: handleShare,
            onViewCard: handleViewCard,
            onViewYourCopy: handleViewYourCopy,
            onRemoveFromVault: handleRemoveFromVault,
          );
        },
      ),
    );
  }

  Future<String?> _addToVaultFromSearch(CardPrint card) async {
    if (_addingCardIds.contains(card.id)) {
      return null;
    }

    final userId = supabase.auth.currentUser?.id;
    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign in to add cards to your vault.')),
      );
      return null;
    }

    setState(() {
      _addingCardIds.add(card.id);
    });

    try {
      final gvviId = await VaultCardService.addOrIncrementVaultItem(
        client: supabase,
        userId: userId,
        cardId: card.id,
        conditionLabel: 'NM',
        fallbackName: card.name,
        fallbackSetName: card.displaySet.isEmpty ? null : card.displaySet,
        fallbackImageUrl: card.displayImage,
      );

      if (!mounted) {
        return gvviId;
      }

      if (gvviId.isEmpty) {
        throw Exception('Exact copy could not be created.');
      }
      return gvviId;
    } catch (error) {
      if (!mounted) {
        return null;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
      return null;
    } finally {
      if (mounted) {
        setState(() {
          _addingCardIds.remove(card.id);
        });
      }
    }
  }

  // VIEW_YOUR_COPY_RESOLUTION_V1
  // exact-copy resolution order: active vault anchor -> mobile copies wrapper -> collector summary GVVI -> shared primary GVVI -> Manage Card fallback.
  // manage fallback only when: no deterministic GVVI can be proven from current mobile wrappers for the owned card.
  Future<VaultOwnedCopyTarget?> _resolveLatestOwnedCopyTarget(
    String cardPrintId,
  ) {
    return VaultCardService.resolveLatestOwnedCopyTarget(
      client: supabase,
      cardPrintId: cardPrintId,
    );
  }

  Future<VaultOwnedCardAnchor?> _resolveOwnedCardAnchor(String cardPrintId) {
    return VaultCardService.resolveOwnedCardAnchor(
      client: supabase,
      cardPrintId: cardPrintId,
    );
  }

  // REMOVE_FROM_VAULT_AUDIT
  // removal target logic: resolve the same latest active exact copy when possible, otherwise remove one instance from the active vault anchor.

  Future<void> _openCardDetail(CardPrint card) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: card.id,
          gvId: (card.gvId ?? '').isEmpty ? null : card.gvId,
          name: card.name,
          setName: card.displaySet,
          setCode: card.setCode.isEmpty ? null : card.setCode,
          number: card.displayNumber,
          rarity: (card.rarity ?? '').isEmpty ? null : card.rarity,
          imageUrl: card.displayImage,
        ),
      ),
    );
  }

  Widget _buildCatalogCard(CardPrint card) {
    final pricing = _resultPricing[card.id] ?? _trendingPricing[card.id];
    final ownershipState = _catalogOwnershipStateForCard(card.id);
    if (_viewMode == AppCardViewMode.grid) {
      return _CatalogCardGridTile(
        card: card,
        pricing: pricing,
        ownershipState: ownershipState,
        onTap: () => _openSearchCardActionHub(card),
      );
    }

    return _CatalogCardTile(
      card: card,
      pricing: pricing,
      ownershipState: ownershipState,
      viewMode: _viewMode,
      onTap: () => _openSearchCardActionHub(card),
    );
  }

  Widget _buildCatalogResultsSliver(
    List<CardPrint> cards,
    List<_CatalogRow> rows,
  ) {
    if (_viewMode != AppCardViewMode.grid) {
      return SliverList.separated(
        itemCount: rows.length,
        separatorBuilder: (context, index) => const SizedBox(height: 2),
        itemBuilder: (context, index) {
          final row = rows[index];
          if (row is _CatalogHeaderRow) {
            return _CatalogSectionHeader(
              row.title,
              compact: _viewMode == AppCardViewMode.compactList,
            );
          } else if (row is _CatalogCardRow) {
            return _buildCatalogCard(row.card);
          }
          return const SizedBox.shrink();
        },
      );
    }

    const columns = 2;

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(
        _kWallMatchGridOuterPadding,
        6,
        _kWallMatchGridOuterPadding,
        0,
      ),
      sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate(
          (context, index) => _buildCatalogCard(cards[index]),
          childCount: cards.length,
        ),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: _kWallMatchGridSpacing,
          crossAxisSpacing: _kWallMatchGridSpacing,
          childAspectRatio: _kWallMatchGridChildAspectRatio,
        ),
      ),
    );
  }

  Widget _buildCompareWorkspaceEntry(ThemeData theme) {
    return ValueListenableBuilder<List<String>>(
      valueListenable: CompareCardSelectionController.instance.listenable,
      builder: (context, selectedIds, _) {
        final compareCount = selectedIds.length;
        if (compareCount == 0) {
          return const SizedBox.shrink();
        }

        return _ProductSurfaceCard(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  '$compareCount card${compareCount == 1 ? '' : 's'} selected',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.72),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              TextButton(
                onPressed: CompareCardSelectionController.instance.clear,
                child: const Text('Clear'),
              ),
              FilledButton.icon(
                onPressed: _openCompareScreen,
                icon: const Icon(Icons.compare_arrows_rounded),
                label: const Text('Compare'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildResultsLeadIn(
    ThemeData theme, {
    required bool showingCuratedLanding,
    required int resultCount,
    required String trimmed,
  }) {
    final colorScheme = theme.colorScheme;
    final title = showingCuratedLanding
        ? 'Trending now'
        : trimmed.isNotEmpty
        ? 'Search results'
        : 'Cards';
    final subtitle = trimmed.isNotEmpty ? '"$trimmed"' : null;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.1,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.58),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (resultCount > 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.24,
              ),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '$resultCount cards',
              style: theme.textTheme.labelMedium?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.56),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final trimmed = _searchCtrl.text.trim();
    final showingCuratedLanding = _shouldShowCuratedLanding(trimmed);
    final cards = _applyRarityFilter(
      showingCuratedLanding ? _trending : _results,
    );
    final showEmpty = !_loading && cards.isEmpty;
    final theme = Theme.of(context);
    final resultCount = cards.length;
    final rows = _viewMode == AppCardViewMode.grid
        ? const <_CatalogRow>[]
        : _buildRows(cards);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
          child: Column(
            children: [
              _CatalogSearchField(
                controller: _searchCtrl,
                onChanged: _onQueryChanged,
                onSubmitted: _runSearch,
              ),
              if (_searchError != null) ...[
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    _searchError!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.red,
                    ),
                  ),
                ),
              ],
              _ResolverStatusBanner(
                meta: _resolverMeta,
                query: trimmed,
                padding: const EdgeInsets.only(top: 6, bottom: 0),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.tonalIcon(
                      onPressed: _openSetsScreen,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      icon: const Icon(Icons.grid_view_rounded, size: 17),
                      label: const Text('Browse sets'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SharedCardViewModeButton(
                    value: _viewMode,
                    onChanged: (mode) {
                      setState(() {
                        _viewMode = mode;
                      });
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildRarityChip(_RarityFilter.all, 'All'),
                    const SizedBox(width: 6),
                    _buildRarityChip(_RarityFilter.common, 'Common'),
                    const SizedBox(width: 6),
                    _buildRarityChip(_RarityFilter.uncommon, 'Uncommon'),
                    const SizedBox(width: 6),
                    _buildRarityChip(_RarityFilter.rare, 'Rare'),
                    const SizedBox(width: 6),
                    _buildRarityChip(_RarityFilter.ultra, 'Ultra / Secret'),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (_loading) const LinearProgressIndicator(minHeight: 2),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              await Future.wait([reload(), _loadTrending()]);
            },
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              cacheExtent: 960,
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
                    child: _buildResultsLeadIn(
                      theme,
                      showingCuratedLanding: showingCuratedLanding,
                      resultCount: resultCount,
                      trimmed: trimmed,
                    ),
                  ),
                ),
                if (_loading && !showingCuratedLanding && _results.isEmpty)
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => const _CatalogSkeletonTile(),
                      childCount: 6,
                    ),
                  )
                else if (showEmpty)
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      10,
                      16,
                      shellContentBottomPadding(context, extra: 8),
                    ),
                    sliver: SliverToBoxAdapter(
                      child: _ProductEmptyState(
                        title: showingCuratedLanding
                            ? 'No cards in the spotlight yet'
                            : trimmed.isEmpty
                            ? 'No cards surfaced yet'
                            : 'No results yet',
                        body: showingCuratedLanding
                            ? 'Trending cards will surface here when the explore feed loads.'
                            : trimmed.isEmpty
                            ? 'Cards will appear here as the public explore catalog loads.'
                            : 'Try another search term, set code, or collector number.',
                      ),
                    ),
                  )
                else
                  _buildCatalogResultsSliver(cards, rows),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: _buildCompareWorkspaceEntry(theme),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: shellContentBottomPadding(context, extra: 8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
