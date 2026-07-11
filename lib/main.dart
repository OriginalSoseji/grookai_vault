// lib/main.dart
import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:visibility_detector/visibility_detector.dart';

import 'card_detail_screen.dart';
import 'models/card_print.dart';
import 'models/ownership_state.dart';
import 'models/provisional_card.dart';
import 'secrets.dart';
import 'screens/account/account_screen.dart';
import 'screens/compare/compare_screen.dart';
import 'screens/dex/grookai_dex_screen.dart';
import 'screens/network/network_inbox_screen.dart';
import 'screens/network/network_nearby_map_screen.dart';
import 'screens/network/network_nearby_screen.dart';
import 'screens/network/network_screen.dart';
import 'screens/public_collector/public_collector_relationship_screen.dart';
import 'screens/public_collector/public_collector_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'screens/sets/public_sets_screen.dart';
import 'screens/vault/vault_manage_card_screen.dart';
import 'screens/vault/vault_gvvi_screen.dart';
import 'screens/scanner/condition_camera_screen.dart';
import 'screens/scanner/fixed_slot_capture_screen.dart';
import 'screens/scanner/native_scanner_phase0_screen.dart';
import 'screens/scanner/scanner_build_placeholder_screen.dart';
import 'screens/scanner_v5/scan_capture_v5_screen.dart';
import 'services/network/card_engagement_service.dart';
import 'services/network/local_community_feed_service.dart';
import 'services/network/smart_feed_service.dart';
import 'services/onboarding/onboarding_ladder_service.dart';
import 'services/diagnostics/app_boot_timing.dart';
import 'services/notifications/grookai_push_notification_service.dart';
import 'services/public/card_surface_pricing_service.dart';
import 'services/public/compare_service.dart';
import 'services/public/public_collector_service.dart';
import 'services/scanner/scanner_native_camera_guardrail.dart';
import 'services/scanner/native_condition_camera_bridge.dart';
import 'services/scanner/native_scanner_phase0_bridge.dart';
import 'services/navigation/grookai_web_route_service.dart';
import 'services/vault/vault_card_service.dart';
import 'services/vault/vault_gvvi_service.dart';
import 'services/vault/ownership_resolver_adapter.dart';
import 'services/scanner_v4/scanner_v4_debug_action_bus_v1.dart';
import 'screens/scanner/scan_capture_screen.dart';
import 'screens/identity_scan/identity_scan_screen.dart';
import 'services/identity/display_identity.dart';
import 'services/identity/canon_image_url_service.dart';
import 'services/identity/image_presentation.dart';
import 'services/identity/identity_search.dart';
import 'theme/gv_grid_constants.dart';
import 'utils/display_image_contract.dart';
import 'widgets/gv_surface.dart';
import 'widgets/card_surface_artwork.dart';
import 'widgets/card_surface_price.dart';
import 'widgets/card_view_mode.dart';
import 'widgets/gv_chip.dart';
import 'widgets/app_shell_metrics.dart';
import 'widgets/onboarding/onboarding_ladder_sheet.dart';
import 'widgets/provisional/provisional_card_section.dart';

part 'main_shell.dart';
part 'main_vault.dart';

const bool kDebugTouchLog = false;
bool get kNativeScannerPhase0Enabled =>
    ScannerNativeCameraGuardrail.legacyPhase0AllowedForScanCard(
      defaultTargetPlatform,
    );
const bool kFixedSlotCaptureScannerV1Enabled = bool.fromEnvironment(
  'FIXED_SLOT_CAPTURE_SCANNER_V1',
  defaultValue: true,
);
const bool kScannerV5Enabled = bool.fromEnvironment(
  'SCANNER_V5',
  defaultValue: true,
);
const bool kScannerConstructionPlaceholderEnabled = bool.fromEnvironment(
  'SCANNER_CONSTRUCTION_PLACEHOLDER',
  defaultValue: false,
);
const bool kFeedDebugOverlay = true;
const bool _kCatalogOwnershipDiagnostics = false;
const bool _kGoogleOAuthDiagnostics = true;
const Duration _kBootWarmupMinimumDuration = Duration(milliseconds: 520);
const Duration _kMicroPressDownDuration = Duration(milliseconds: 96);
const Duration _kMicroReleaseDuration = Duration(milliseconds: 172);
const Duration _kActionFeedbackDuration = Duration(milliseconds: 320);
const Duration _kDrawerOpenDuration = Duration(milliseconds: 280);
const Duration _kDrawerCloseDuration = Duration(milliseconds: 180);
const int _kSearchInitialBatchSize = 24;
const int _kSearchFollowupBatchSize = 24;
const int _kSearchResolverLimit = 32;
const List<MapEntry<String, String>> _kSearchLanguageScopeOptions =
    <MapEntry<String, String>>[
      MapEntry<String, String>('all', 'All'),
      MapEntry<String, String>('en', 'English'),
      MapEntry<String, String>('ja', 'Japanese'),
    ];
const Duration _kFeedImpressionGateWindow = Duration(minutes: 3);
const Duration _kFeedImpressionSkipLogWindow = Duration(seconds: 12);
const double _kFeedImpressionVisibilityThreshold = 0.55;

String _formatSearchFailure(Object error) {
  debugPrint('Search failed: $error');
  return 'Search is temporarily limited. Showing local results when available.';
}

String _normalizeSearchLanguageScope(String value) {
  final normalized = value.trim().toLowerCase();
  return normalized == 'en' || normalized == 'ja' ? normalized : 'all';
}

String _normalizePublicCollectorSlugInput(String value) {
  var normalized = value.trim().toLowerCase();
  if (normalized.isEmpty) {
    return '';
  }

  final parsed = Uri.tryParse(normalized);
  if (parsed != null && parsed.hasScheme && parsed.pathSegments.isNotEmpty) {
    final segments = parsed.pathSegments
        .map((segment) => segment.trim())
        .where((segment) => segment.isNotEmpty)
        .toList(growable: false);
    final userSegmentIndex = segments.indexWhere((segment) => segment == 'u');
    if (userSegmentIndex >= 0 && userSegmentIndex + 1 < segments.length) {
      normalized = segments[userSegmentIndex + 1];
    } else if (segments.isNotEmpty) {
      normalized = segments.last;
    }
  }

  normalized = normalized.split(RegExp(r'[?#]')).first.trim();
  normalized = normalized.replaceFirst(RegExp(r'^/+'), '');
  if (normalized.startsWith('u/')) {
    normalized = normalized.substring(2);
  }
  if (normalized.startsWith('@')) {
    normalized = normalized.substring(1);
  }
  return normalized
      .trim()
      .replaceAll(RegExp(r'[\s_]+'), '-')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
}

Future<String?> _showPublicCollectorSlugPrompt(BuildContext context) async {
  var draftSlug = '';
  return showDialog<String>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Open Public Collector'),
      content: TextField(
        autofocus: true,
        textInputAction: TextInputAction.go,
        decoration: const InputDecoration(
          labelText: 'Collector slug',
          hintText: 'Enter /u/slug, @slug, or slug',
          prefixIcon: Icon(Icons.alternate_email_rounded),
        ),
        onChanged: (value) {
          draftSlug = value;
        },
        onSubmitted: (value) {
          Navigator.of(dialogContext).pop(value);
        },
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(draftSlug),
          child: const Text('Open'),
        ),
      ],
    ),
  );
}

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
        letterSpacing: 0,
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
    return GvSurface(
      variant: GvSurfaceVariant.grouped,
      borderRadius: 22,
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
                  letterSpacing: 0,
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

class _SearchLanguageScopeSelector extends StatelessWidget {
  const _SearchLanguageScopeSelector({
    required this.value,
    required this.onChanged,
  });

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final normalizedValue = _normalizeSearchLanguageScope(value);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          Text(
            'Language',
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(width: 8),
          for (
            var index = 0;
            index < _kSearchLanguageScopeOptions.length;
            index++
          ) ...[
            if (index > 0) const SizedBox(width: 6),
            _SearchLanguageScopeChip(
              value: _kSearchLanguageScopeOptions[index].key,
              label: _kSearchLanguageScopeOptions[index].value,
              selected:
                  normalizedValue == _kSearchLanguageScopeOptions[index].key,
              onSelected: onChanged,
            ),
          ],
        ],
      ),
    );
  }
}

class _SearchLanguageScopeChip extends StatelessWidget {
  const _SearchLanguageScopeChip({
    required this.value,
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String value;
  final String label;
  final bool selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return GvChip(
      label: label,
      selected: selected,
      onSelected: (_) => onSelected(value),
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
        background = colorScheme.tertiaryContainer.withValues(alpha: 0.28);
        border = colorScheme.tertiary.withValues(alpha: 0.40);
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
  final VoidCallback? onQuickAdd;
  final bool isAdding;
  final VoidCallback? onImpressionCandidate;
  final SmartFeedCandidateDebug? feedDebug;
  final bool showFeedDebugOverlay;
  final AppCardViewMode viewMode;

  const _CatalogCardTile({
    required this.card,
    required this.viewMode,
    required this.ownershipState,
    this.pricing,
    this.onTap,
    this.onQuickAdd,
    this.isAdding = false,
    this.onImpressionCandidate,
    this.feedDebug,
    this.showFeedDebugOverlay = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final compact = viewMode == AppCardViewMode.compactList;
    final displayIdentity = resolveCardPrintDisplayIdentity(card);
    final subtitleParts = <String>[
      if ((displayIdentity.printedName ?? '').isNotEmpty)
        displayIdentity.printedName!,
      ..._catalogMetadataParts(card, compact: compact),
    ];
    final subtitle = subtitleParts.join(' • ');
    final thumbWidth = compact ? 56.0 : 60.0;
    final thumbHeight = compact ? 81.0 : 86.0;

    return _CatalogFeedImpressionObserver(
      cardId: card.id,
      onImpressionCandidate: onImpressionCandidate,
      child: _CatalogFeedDebugOverlay(
        debug: feedDebug,
        enabled: showFeedDebugOverlay,
        compact: compact,
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 10 : 10,
            vertical: compact ? 2 : 3,
          ),
          child: _PressScaleInkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(compact ? 16 : 18),
            pressedScale: compact ? 0.982 : 0.978,
            child: Material(
              color: colorScheme.surface.withValues(alpha: 0.10),
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
                            displayIdentity.displayName,
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
                            CardSurfacePriceText(
                              pricing: pricing,
                              size: compact
                                  ? CardSurfacePriceSize.dense
                                  : CardSurfacePriceSize.list,
                            ),
                          ],
                          _CatalogOwnershipSummaryLine(
                            ownershipState: ownershipState,
                          ),
                        ],
                      ),
                    ),
                    if (onQuickAdd != null) ...[
                      SizedBox(width: compact ? 7 : 8),
                      _CatalogQuickAddButton(
                        onPressed: isAdding ? null : onQuickAdd,
                        isBusy: isAdding,
                        compact: compact,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _thumb(String? url, double width, double height) {
    final displayIdentity = resolveCardPrintDisplayIdentity(card);
    final imagePresentation = _cardPrintImagePresentation(card);
    return CardSurfaceArtwork(
      label: displayIdentity.displayName,
      imageUrl: url,
      width: width,
      height: height,
      borderRadius: 10,
      padding: const EdgeInsets.all(3),
      enableTapToZoom: false,
      imageTruthLabel: imagePresentation.compactBadgeLabel,
      imageTruthStrong: imagePresentation.isCollisionRepresentative,
    );
  }
}

class _CatalogFeedImpressionObserver extends StatelessWidget {
  const _CatalogFeedImpressionObserver({
    required this.cardId,
    required this.child,
    this.onImpressionCandidate,
  });

  final String cardId;
  final Widget child;
  final VoidCallback? onImpressionCandidate;

  @override
  Widget build(BuildContext context) {
    final callback = onImpressionCandidate;
    final normalizedCardId = cardId.trim();
    if (callback == null || normalizedCardId.isEmpty) {
      return child;
    }

    return VisibilityDetector(
      key: ValueKey<String>('catalog-feed-impression-$normalizedCardId'),
      onVisibilityChanged: (info) {
        if (info.visibleFraction >= _kFeedImpressionVisibilityThreshold) {
          callback();
        }
      },
      child: child,
    );
  }
}

class _CatalogFeedDebugOverlay extends StatelessWidget {
  const _CatalogFeedDebugOverlay({
    required this.child,
    this.debug,
    this.enabled = false,
    this.compact = false,
  });

  final Widget child;
  final SmartFeedCandidateDebug? debug;
  final bool enabled;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode || !kFeedDebugOverlay || !enabled || debug == null) {
      return child;
    }

    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;
    final overlayTextStyle =
        (compact ? textTheme.labelSmall : textTheme.bodySmall)?.copyWith(
          color: Colors.white,
          fontSize: compact ? 9.2 : 9.6,
          fontWeight: FontWeight.w600,
          height: 1.12,
        ) ??
        TextStyle(
          color: Colors.white,
          fontSize: compact ? 9.2 : 9.6,
          fontWeight: FontWeight.w600,
          height: 1.12,
        );

    Widget overlayText(String text, {int maxLines = 2}) {
      return Text(text, maxLines: maxLines, overflow: TextOverflow.ellipsis);
    }

    return Stack(
      children: [
        child,
        Positioned(
          top: compact ? 7 : 8,
          left: compact ? 14 : 10,
          right: compact ? 14 : 10,
          child: IgnorePointer(
            child: Align(
              alignment: Alignment.topLeft,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 220),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: colorScheme.shadow.withValues(alpha: 0.76),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 5,
                    ),
                    child: DefaultTextStyle(
                      style: overlayTextStyle,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          overlayText(
                            'score ${debug!.score.toStringAsFixed(1)} | ${debug!.source}',
                            maxLines: 1,
                          ),
                          if (debug!.boosts.isNotEmpty)
                            overlayText('+ ${debug!.boosts.join(', ')}'),
                          if (debug!.suppressions.isNotEmpty)
                            overlayText('- ${debug!.suppressions.join(', ')}'),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CatalogCardGridTile extends StatelessWidget {
  const _CatalogCardGridTile({
    required this.card,
    required this.onTap,
    required this.ownershipState,
    this.onQuickAdd,
    this.isAdding = false,
    this.pricing,
    this.onImpressionCandidate,
    this.feedDebug,
    this.showFeedDebugOverlay = false,
  });

  final CardPrint card;
  final VoidCallback onTap;
  final CardSurfacePricingData? pricing;
  final OwnershipState? ownershipState;
  final VoidCallback? onQuickAdd;
  final bool isAdding;
  final VoidCallback? onImpressionCandidate;
  final SmartFeedCandidateDebug? feedDebug;
  final bool showFeedDebugOverlay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final displayIdentity = resolveCardPrintDisplayIdentity(card);
    final subtitleParts = <String>[
      if ((displayIdentity.printedName ?? '').isNotEmpty)
        displayIdentity.printedName!,
      ..._catalogMetadataParts(card, compact: false, includeRarity: false),
    ];
    final subtitle = subtitleParts.join(' • ');

    return _CatalogFeedImpressionObserver(
      cardId: card.id,
      onImpressionCandidate: onImpressionCandidate,
      child: _CatalogFeedDebugOverlay(
        debug: feedDebug,
        enabled: showFeedDebugOverlay,
        child: Material(
          color: Colors.transparent,
          child: _PressScaleInkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
            pressedScale: 0.972,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AspectRatio(
                  aspectRatio: GvGridConstants.artworkAspectRatio,
                  child: _CatalogGridArtwork(card: card),
                ),
                const SizedBox(height: GvGridConstants.imageToTitleGap),
                SizedBox(
                  height: GvGridConstants.titleSlotHeight,
                  child: Text(
                    displayIdentity.displayName,
                    maxLines: GvGridConstants.titleMaxLines,
                    overflow: TextOverflow.ellipsis,
                    style: gvGridTitleStyle(theme),
                  ),
                ),
                const SizedBox(height: GvGridConstants.titleToSubtitleGap),
                SizedBox(
                  height: GvGridConstants.subtitleSlotHeight,
                  child: Text(
                    subtitle.isEmpty ? 'Card' : subtitle,
                    maxLines: GvGridConstants.subtitleMaxLines,
                    overflow: TextOverflow.ellipsis,
                    style: gvGridSubtitleStyle(theme, colorScheme),
                  ),
                ),
                const SizedBox(height: GvGridConstants.subtitleToPriceGap),
                SizedBox(
                  height: GvGridConstants.priceSlotHeight,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: pricing?.hasVisibleValue == true
                        ? CardSurfacePriceText(
                            pricing: pricing,
                            size: CardSurfacePriceSize.grid,
                            textAlign: TextAlign.left,
                          )
                        : Text(
                            'Grookai Value',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.44,
                              ),
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0,
                            ),
                          ),
                  ),
                ),
                SizedBox(
                  height: GvGridConstants.ownershipSlotHeight,
                  child: Row(
                    children: [
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: _CatalogOwnershipSummaryLine(
                            ownershipState: ownershipState,
                            grid: true,
                          ),
                        ),
                      ),
                      if (onQuickAdd != null)
                        _CatalogQuickAddButton(
                          onPressed: isAdding ? null : onQuickAdd,
                          isBusy: isAdding,
                          compact: true,
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
}

class _CatalogQuickAddButton extends StatelessWidget {
  const _CatalogQuickAddButton({
    required this.onPressed,
    required this.isBusy,
    required this.compact,
  });

  final VoidCallback? onPressed;
  final bool isBusy;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final enabled = onPressed != null && !isBusy;
    final background = enabled
        ? colorScheme.primary.withValues(alpha: 0.92)
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.24);
    final foreground = enabled
        ? colorScheme.onPrimary
        : colorScheme.onSurface.withValues(alpha: 0.46);

    return Semantics(
      button: true,
      label: isBusy ? 'Adding to vault' : 'Add to Vault',
      child: Material(
        color: background,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: enabled ? onPressed : null,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: compact ? 9 : 11,
                vertical: compact ? 7 : 8,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (isBusy)
                    SizedBox(
                      width: compact ? 13 : 14,
                      height: compact ? 13 : 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: foreground,
                      ),
                    )
                  else
                    Icon(
                      Icons.add_rounded,
                      size: compact ? 16 : 18,
                      color: foreground,
                    ),
                  if (!compact) ...[
                    const SizedBox(width: 5),
                    Text(
                      isBusy ? 'Adding' : 'Add',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: foreground,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

ResolvedImagePresentation _cardPrintImagePresentation(CardPrint card) {
  return resolveImagePresentationFromFields(
    imageUrl: card.imageUrl,
    representativeImageUrl: card.representativeImageUrl,
    displayImageUrl: card.displayImageUrl,
    displayImageKind: card.displayImageKind,
    imageStatus: card.imageStatus,
    imageNote: card.imageNote,
  );
}

class _CatalogGridArtwork extends StatelessWidget {
  const _CatalogGridArtwork({required this.card});

  final CardPrint card;

  @override
  Widget build(BuildContext context) {
    final displayIdentity = resolveCardPrintDisplayIdentity(card);
    final imagePresentation = _cardPrintImagePresentation(card);

    return CardSurfaceArtwork(
      label: displayIdentity.displayName,
      imageUrl: card.displayImage,
      borderRadius: GvGridConstants.imageRadius,
      padding: EdgeInsets.zero,
      enableTapToZoom: false,
      showShadow: false,
      filterQuality: FilterQuality.none,
      imageTruthLabel: imagePresentation.compactBadgeLabel,
      imageTruthStrong: imagePresentation.isCollisionRepresentative,
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

String _searchContextLabel(CardPrint card) {
  final label = (card.displayDiscriminator ?? card.finishLabel ?? '').trim();
  return label;
}

List<String> _catalogMetadataParts(
  CardPrint card, {
  required bool compact,
  bool includeRarity = true,
}) {
  final parts = <String>[];
  if (compact) {
    final compactSet = card.setCode.isNotEmpty
        ? card.setCode.toUpperCase()
        : card.displaySet;
    if (compactSet.isNotEmpty) {
      parts.add(compactSet);
    }
  } else if (card.displaySet.isNotEmpty) {
    parts.add(card.displaySet);
  } else if (card.setCode.isNotEmpty) {
    parts.add(card.setCode.toUpperCase());
  }
  if (card.displayNumber.isNotEmpty) {
    parts.add('#${card.displayNumber}');
  }
  final searchContext = _searchContextLabel(card);
  if (searchContext.isNotEmpty) {
    parts.add(searchContext);
  }
  if (includeRarity && !compact && (card.rarity ?? '').isNotEmpty) {
    parts.add(card.rarity!);
  }
  return parts;
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
    final displayIdentity = resolveCardPrintDisplayIdentity(card);
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
    final metadataParts = _catalogMetadataParts(card, compact: false);
    final hasSubtitle = metadataParts.isNotEmpty;
    final imagePresentation = _cardPrintImagePresentation(card);

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
                    label: displayIdentity.displayName,
                    imageUrl: card.displayImage,
                    borderRadius: 24,
                    padding: const EdgeInsets.all(6),
                    imageTruthLabel: imagePresentation.compactBadgeLabel,
                    imageTruthStrong:
                        imagePresentation.isCollisionRepresentative,
                    onViewDetails: interactionLocked ? null : onViewCard,
                    detailsLabel: 'View card',
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              displayIdentity.displayName,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            if ((displayIdentity.printedName ?? '').isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                displayIdentity.printedName!,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
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
                    if (_searchContextLabel(card).isNotEmpty)
                      _ActionSheetMetadataText(
                        label: _searchContextLabel(card),
                      ),
                    if ((card.rarity ?? '').isNotEmpty)
                      _ActionSheetMetadataText(label: card.rarity!),
                  ],
                ),
              ),
            ],
            if (pricing?.hasVisibleValue == true) ...[
              const SizedBox(height: 9),
              Center(
                child: CardSurfacePriceText(
                  pricing: pricing,
                  size: CardSurfacePriceSize.list,
                  textAlign: TextAlign.center,
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
  _configureAppImageCache();
  AppBootTiming.mark('main_start');
  PlatformDispatcher.instance.onError = (error, stackTrace) {
    if (_isInvalidRefreshTokenRecoveryError(error)) {
      debugPrint(
        '[AUTH_STARTUP_V1] clearing invalid persisted session after failed recovery',
      );
      unawaited(_clearInvalidPersistedSession());
      return true;
    }
    return false;
  };
  AppBootTiming.mark('platform_error_handler_ready');
  await _loadEnv();
  AppBootTiming.mark('env_loaded');

  final url = supabaseUrl;
  final key = supabasePublishableKey;
  if (url.isEmpty || key.isEmpty) {
    throw Exception(
      'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Pass release values with --dart-define or use local dotenv only for development.',
    );
  }

  AppBootTiming.mark('supabase_initialize_start');
  await Supabase.initialize(
    url: url,
    publishableKey: key,
    authOptions: const FlutterAuthClientOptions(detectSessionInUri: false),
  );
  AppBootTiming.mark('supabase_initialize_complete');
  AppBootTiming.mark('runApp');
  runApp(const MyApp());
}

void _configureAppImageCache() {
  final cache = PaintingBinding.instance.imageCache;
  cache.maximumSize = 1600;
  cache.maximumSizeBytes = 192 << 20;
}

bool _isInvalidRefreshTokenRecoveryError(Object error) {
  return error is AuthApiException && error.code == 'refresh_token_not_found';
}

Future<void> _clearInvalidPersistedSession() async {
  try {
    await Supabase.instance.client.auth.signOut();
  } catch (_) {
    // The auth client is already in a failed recovery path. Best effort is
    // enough here because the root auth gate also treats expired sessions as
    // unresolved until recovery finishes.
  }
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

class PendingDebugActionRequest {
  const PendingDebugActionRequest({required this.id, required this.action});

  final int id;
  final String action;
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class GrookaiAppFrame extends StatelessWidget {
  const GrookaiAppFrame({super.key, required this.home});

  final Widget home;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Grookai Vault',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F172A)),
        useMaterial3: true,
      ),
      home: home,
    );
  }
}

class _GrookaiBootWarmupScreen extends StatelessWidget {
  const _GrookaiBootWarmupScreen();

  static const String _logoAsset =
      'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png';

  @override
  Widget build(BuildContext context) {
    AppBootTiming.markOnce('boot_warmup_build');
    final colorScheme = Theme.of(context).colorScheme;

    return ColoredBox(
      color: colorScheme.surface,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 104,
              height: 104,
              child: Image(image: AssetImage(_logoAsset)),
            ),
            const SizedBox(height: 22),
            const Text(
              'Grookai Vault',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: 0,
                decoration: TextDecoration.none,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MyAppState extends State<MyApp> {
  static const MethodChannel _debugIntentChannel = MethodChannel(
    'grookai/debug_intents_v1',
  );
  static const String _scannerV4AutoTestAction = 'scanner_v4_auto_test';
  static const String _themeModePreferenceKey = 'grookai_theme_mode_v1';

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;
  StreamSubscription<AuthState>? _authSubscription;
  PendingCanonicalLinkRequest? _pendingCanonicalLink;
  PendingDebugActionRequest? _pendingDebugAction;
  int _nextPendingCanonicalLinkId = 0;
  int _nextPendingDebugActionId = 0;
  bool _authCallbackInFlight = false;
  Session? _authSession;
  bool _authRecoveryPending = false;
  bool _bootWarmupVisible = true;
  ThemeMode _themeMode = ThemeMode.system;

  @override
  void initState() {
    super.initState();
    AppBootTiming.mark('my_app_init_state_start');
    unawaited(_loadThemeModePreference());
    final initialSession = Supabase.instance.client.auth.currentSession;
    _authSession = initialSession;
    _authRecoveryPending = initialSession?.isExpired ?? false;
    AppBootTiming.mark(
      'auth_session_read present=${initialSession != null} '
      'expired=${initialSession?.isExpired ?? false}',
    );
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen(
      (event) {
        AppBootTiming.markOnce('auth_event_${event.event.name}');
        _debugGoogleOAuth(
          'auth state event=${event.event.name} '
          'sessionPresent=${event.session != null}',
        );
        if (!mounted) {
          return;
        }
        final nextSession = Supabase.instance.client.auth.currentSession;
        setState(() {
          _authSession = nextSession;
          _authRecoveryPending =
              event.event == AuthChangeEvent.initialSession &&
              (nextSession?.isExpired ?? false);
        });
        if (nextSession != null && !nextSession.isExpired) {
          unawaited(
            GrookaiPushNotificationService.instance.registerForCurrentUser(
              reason: 'auth_${event.event.name}',
            ),
          );
        }
      },
      onError: (error, stackTrace) {
        _debugGoogleOAuth('auth state error=$error');
        if (!mounted) {
          return;
        }
        setState(() {
          _authSession = Supabase.instance.client.auth.currentSession;
          _authRecoveryPending = false;
        });
      },
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AppBootTiming.markOnce('root_first_post_frame');
      unawaited(_completeBootWarmup());
      unawaited(_attachCanonicalLinkListeners());
      unawaited(_startPushNotifications());
      if (kDebugMode) {
        unawaited(_attachDebugIntentBridge());
      }
    });
    AppBootTiming.mark('my_app_init_state_complete');
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _authSubscription?.cancel();
    unawaited(GrookaiPushNotificationService.instance.dispose());
    super.dispose();
  }

  Future<void> _startPushNotifications() async {
    await GrookaiPushNotificationService.instance.start(
      onRoute: _queueCanonicalRoute,
    );
  }

  Future<void> _loadThemeModePreference() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedMode = prefs.getString(_themeModePreferenceKey);
      final mode = _themeModeFromPreference(storedMode);
      if (!mounted || mode == _themeMode) {
        return;
      }
      setState(() {
        _themeMode = mode;
      });
    } catch (_) {
      // The app can still follow system appearance if local prefs are unavailable.
    }
  }

  Future<void> _setThemeMode(ThemeMode mode) async {
    if (mode == _themeMode) {
      return;
    }
    setState(() {
      _themeMode = mode;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _themeModePreferenceKey,
        _themeModePreferenceValue(mode),
      );
    } catch (_) {
      // Keep the in-memory choice for this run even if persistence fails.
    }
  }

  ThemeMode _themeModeFromPreference(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  String _themeModePreferenceValue(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  Future<void> _attachDebugIntentBridge() async {
    AppBootTiming.mark('debug_intent_bridge_start');
    _debugIntentChannel.setMethodCallHandler(_handleDebugIntentMethodCall);
    try {
      final action = await _debugIntentChannel.invokeMethod<String>(
        'getInitialDebugAction',
      );
      _queueDebugAction(action);
    } catch (error) {
      debugPrint(
        '[scanner_v4_auto_test] debug_intent_bridge_unavailable=$error',
      );
    }
    AppBootTiming.mark('debug_intent_bridge_complete');
  }

  Future<void> _handleDebugIntentMethodCall(MethodCall call) async {
    if (!kDebugMode) return;
    switch (call.method) {
      case 'debugIntentAction':
        _queueDebugAction(call.arguments?.toString());
        return;
      default:
        return;
    }
  }

  Future<void> _attachCanonicalLinkListeners() async {
    AppBootTiming.mark('canonical_link_listeners_start');
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
    AppBootTiming.mark('canonical_link_listeners_ready');
  }

  Future<void> _completeBootWarmup() async {
    AppBootTiming.mark('boot_warmup_hold_start');
    await Future<void>.delayed(_kBootWarmupMinimumDuration);
    if (!mounted) {
      return;
    }
    setState(() {
      _bootWarmupVisible = false;
    });
    AppBootTiming.mark('boot_warmup_complete');
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
    _queueCanonicalRoute(route);
  }

  void _queueCanonicalRoute(GrookaiCanonicalRoute? route) {
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

  void _queueDebugAction(String? action) {
    if (!kDebugMode || !mounted) return;
    final normalized = (action ?? '').trim();
    if (normalized != _scannerV4AutoTestAction) return;
    debugPrint(
      '[scanner_v4_auto_test] debug_action_received '
      'active_scanner=${ScannerV4DebugActionBusV1.hasActiveScanner}',
    );
    if (ScannerV4DebugActionBusV1.hasActiveScanner) {
      ScannerV4DebugActionBusV1.dispatch(normalized);
      return;
    }
    setState(() {
      _pendingDebugAction = PendingDebugActionRequest(
        id: ++_nextPendingDebugActionId,
        action: normalized,
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

  void _handleDebugActionConsumed(int id) {
    if (!mounted || _pendingDebugAction?.id != id) {
      return;
    }

    setState(() {
      _pendingDebugAction = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final app = MaterialApp(
      title: 'Grookai Vault',
      debugShowCheckedModeBanner: false,
      theme: _buildGrookaiTheme(Brightness.light),
      darkTheme: _buildGrookaiTheme(Brightness.dark),
      themeMode: _themeMode,
      home: Builder(
        builder: (context) {
          final session = _authSession;
          final shellReady =
              session != null && !_authRecoveryPending && !session.isExpired;
          final pendingDebugAction = _pendingDebugAction;
          _debugGoogleOAuth(
            'auth gate sessionPresent=${session != null} '
            'sessionExpired=${session?.isExpired ?? false} '
            'recoveryPending=$_authRecoveryPending '
            'pendingCanonicalLink=${_pendingCanonicalLink != null}',
          );
          if (_bootWarmupVisible) {
            AppBootTiming.markOnce('first_route_warmup');
            return const _GrookaiBootWarmupScreen();
          }
          if (_authRecoveryPending) {
            AppBootTiming.markOnce('first_route_auth_recovery');
            return const Scaffold(
              body: Center(child: CircularProgressIndicator.adaptive()),
            );
          }
          if (kDebugMode &&
              !shellReady &&
              pendingDebugAction?.action == _scannerV4AutoTestAction) {
            return const ConditionCameraScreen(
              title: 'Scan Card',
              hintText: 'Align card inside the frame',
              autoStartScannerV4DiagnosticTest: true,
            );
          }
          return shellReady
              ? () {
                  AppBootTiming.markOnce('first_route_shell');
                  return AppShell(
                    pendingCanonicalLink: _pendingCanonicalLink,
                    onCanonicalLinkHandled: _handleCanonicalLinkConsumed,
                    pendingDebugAction: _pendingDebugAction,
                    onDebugActionHandled: _handleDebugActionConsumed,
                    themeMode: _themeMode,
                    onThemeModeChanged: _setThemeMode,
                  );
                }()
              : () {
                  AppBootTiming.markOnce('first_route_login');
                  return const LoginPage();
                }();
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
  List<CardPrint> _visibleResults = const [];
  List<CardPrint> _trending = const [];
  List<PublicProvisionalCard> _provisionalResults =
      const <PublicProvisionalCard>[];
  Map<String, OwnershipState> _catalogOwnershipByCardPrintId =
      const <String, OwnershipState>{};
  Map<String, CardSurfacePricingData> _resultPricing = const {};
  Map<String, CardSurfacePricingData> _trendingPricing = const {};
  Map<String, SmartFeedCandidateDebug> _trendingDebugByCardId =
      const <String, SmartFeedCandidateDebug>{};
  CardSearchResolverMeta? _resolverMeta;
  final Map<String, DateTime> _feedImpressionWriteGateByCardId =
      <String, DateTime>{};
  final Map<String, DateTime> _feedImpressionSkipLogByCardId =
      <String, DateTime>{};
  bool _loading = false;
  bool _loadingCuratedLanding = false;
  bool _hasMoreVisibleResults = false;
  String? _searchError;
  Timer? _debounce;
  int _searchRequestVersion = 0;
  _RarityFilter _rarityFilter = _RarityFilter.all;
  String _identityFilter = kIdentityFilterAll;
  String _languageScope = 'all';
  AppCardViewMode _viewMode = AppCardViewMode.grid;
  final Set<String> _addingCardIds = <String>{};
  bool _showFeedDebugOverlay = kDebugMode && kFeedDebugOverlay;

  List<CardPrint> _takeSearchResultBatch(List<CardPrint> cards, int limit) {
    if (cards.length <= limit) {
      return List<CardPrint>.of(cards, growable: false);
    }
    return cards.sublist(0, limit);
  }

  bool _shouldShowCuratedLanding([String? query]) {
    final trimmed = (query ?? _searchCtrl.text).trim();
    return trimmed.isEmpty &&
        _rarityFilter == _RarityFilter.all &&
        !isIdentityFilterActive(_identityFilter) &&
        _languageScope == 'all';
  }

  void _resetCuratedLandingState() {
    _searchRequestVersion++;
    _debounce?.cancel();
    setState(() {
      _results = const [];
      _visibleResults = const [];
      _provisionalResults = const <PublicProvisionalCard>[];
      _resultPricing = const {};
      _resolverMeta = null;
      _hasMoreVisibleResults = false;
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
    if (mounted) {
      setState(() {
        _loadingCuratedLanding = true;
      });
    }
    try {
      final feed = await SmartFeedService.load(client: supabase);
      final rows = feed.cards;
      final debugByCardId = kDebugMode && kFeedDebugOverlay
          ? <String, SmartFeedCandidateDebug>{
              for (final candidate in feed.candidates)
                if (candidate.debug != null)
                  candidate.card.id.trim(): candidate.debug!,
            }
          : const <String, SmartFeedCandidateDebug>{};
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
        _trendingDebugByCardId = debugByCardId;
        _catalogOwnershipByCardPrintId = <String, OwnershipState>{
          ..._catalogOwnershipByCardPrintId,
          ...ownershipStates,
        };
        _loadingCuratedLanding = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingCuratedLanding = false;
      });
    }
  }

  int get _activeSearchFilterCount {
    var count = 0;
    if (_normalizeSearchLanguageScope(_languageScope) != 'all') {
      count += 1;
    }
    if (isIdentityFilterActive(_identityFilter)) {
      count += 1;
    }
    if (_rarityFilter != _RarityFilter.all) {
      count += 1;
    }
    return count;
  }

  List<IdentityFilterOption> _visibleIdentityFilterOptions(
    Map<String, int> identityFilterCounts,
  ) {
    return kIdentityFilterOptions
        .where((option) {
          if (option.key == kIdentityFilterAll) {
            return true;
          }
          return (identityFilterCounts[option.key] ?? 0) > 0 ||
              option.key == _identityFilter;
        })
        .toList(growable: false);
  }

  Widget _buildSearchFilterButton({
    required ThemeData theme,
    required Map<String, int> identityFilterCounts,
    required List<IdentityFilterOption> visibleIdentityFilters,
  }) {
    final colorScheme = theme.colorScheme;
    final activeCount = _activeSearchFilterCount;
    return OutlinedButton.icon(
      onPressed: () => _openSearchFiltersSheet(
        identityFilterCounts: identityFilterCounts,
        visibleIdentityFilters: visibleIdentityFilters,
      ),
      icon: const Icon(Icons.tune_rounded, size: 18),
      label: Text(activeCount == 0 ? 'Filters' : 'Filters · $activeCount'),
      style: OutlinedButton.styleFrom(
        visualDensity: VisualDensity.compact,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        foregroundColor: colorScheme.onSurface.withValues(alpha: 0.84),
        side: BorderSide(
          color: activeCount == 0
              ? colorScheme.outline.withValues(alpha: 0.26)
              : colorScheme.primary.withValues(alpha: 0.7),
        ),
        backgroundColor: activeCount == 0
            ? colorScheme.surfaceContainerHighest.withValues(alpha: 0.24)
            : colorScheme.primary.withValues(alpha: 0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        textStyle: theme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Future<void> _openSearchFiltersSheet({
    required Map<String, int> identityFilterCounts,
    required List<IdentityFilterOption> visibleIdentityFilters,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final theme = Theme.of(context);
            final colorScheme = theme.colorScheme;
            final bottomInset = MediaQuery.viewPaddingOf(context).bottom;

            void refreshSheet(VoidCallback action) {
              action();
              setSheetState(() {});
            }

            return Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 20 + bottomInset),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Filters',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Refine by language, identity, and rarity.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.64),
                      ),
                    ),
                    const SizedBox(height: 18),
                    _SearchLanguageScopeSelector(
                      value: _languageScope,
                      onChanged: (value) => refreshSheet(
                        () => _handleLanguageScopeChanged(value),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Identity',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final option in visibleIdentityFilters)
                          GvChip(
                            label: option.label,
                            count: identityFilterCounts[option.key] ?? 0,
                            selected: _identityFilter == option.key,
                            onSelected: (_) => refreshSheet(
                              () => _handleIdentityFilterChanged(option.key),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Rarity',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        GvChip(
                          label: 'All',
                          selected: _rarityFilter == _RarityFilter.all,
                          onSelected: (_) => refreshSheet(
                            () => _handleRarityFilterChanged(_RarityFilter.all),
                          ),
                        ),
                        GvChip(
                          label: 'Common',
                          selected: _rarityFilter == _RarityFilter.common,
                          onSelected: (_) => refreshSheet(
                            () => _handleRarityFilterChanged(
                              _RarityFilter.common,
                            ),
                          ),
                        ),
                        GvChip(
                          label: 'Uncommon',
                          selected: _rarityFilter == _RarityFilter.uncommon,
                          onSelected: (_) => refreshSheet(
                            () => _handleRarityFilterChanged(
                              _RarityFilter.uncommon,
                            ),
                          ),
                        ),
                        GvChip(
                          label: 'Rare',
                          selected: _rarityFilter == _RarityFilter.rare,
                          onSelected: (_) => refreshSheet(
                            () =>
                                _handleRarityFilterChanged(_RarityFilter.rare),
                          ),
                        ),
                        GvChip(
                          label: 'Ultra / Secret',
                          selected: _rarityFilter == _RarityFilter.ultra,
                          onSelected: (_) => refreshSheet(
                            () =>
                                _handleRarityFilterChanged(_RarityFilter.ultra),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  List<CardPrint> _applyRarityFilter(
    List<CardPrint> cards, {
    _RarityFilter? filter,
  }) {
    final activeFilter = filter ?? _rarityFilter;
    if (activeFilter == _RarityFilter.all) return cards;

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
        .where((card) => matchesRarity(card.rarity, activeFilter))
        .toList();
  }

  List<CardPrint> _applyCatalogFilters(
    List<CardPrint> cards, {
    _RarityFilter? rarityFilter,
    String? identityFilter,
  }) {
    final activeIdentityFilter = normalizeIdentityFilterKey(
      identityFilter ?? _identityFilter,
    );
    final identityFiltered = activeIdentityFilter == kIdentityFilterAll
        ? cards
        : cards
              .where(
                (card) => matchesIdentityFilter(card, activeIdentityFilter),
              )
              .toList(growable: false);

    return _applyRarityFilter(identityFiltered, filter: rarityFilter);
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
        options: CardSearchOptions(
          query: trimmed,
          limit: _kSearchResolverLimit,
          identityFilter: _identityFilter,
          languageScope: _languageScope,
        ),
      );
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      final filteredResults = _applyCatalogFilters(resolved.rows);
      final initialVisibleResults = _takeSearchResultBatch(
        filteredResults,
        _kSearchInitialBatchSize,
      );
      final hasMoreVisibleResults =
          filteredResults.length > initialVisibleResults.length;
      setState(() {
        _results = resolved.rows;
        _visibleResults = initialVisibleResults;
        _provisionalResults = resolved.provisionalRows;
        _resultPricing = const <String, CardSurfacePricingData>{};
        _resolverMeta = resolved.meta;
        _hasMoreVisibleResults = hasMoreVisibleResults;
        _searchError = null;
        _loading = false;
      });
      var pricing = const <String, CardSurfacePricingData>{};
      try {
        pricing = await CardSurfacePricingService.fetchByCardPrintIds(
          client: supabase,
          cardPrintIds: resolved.rows.map((card) => card.id),
        );
      } catch (_) {
        pricing = const <String, CardSurfacePricingData>{};
      }
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      final ownershipStates = await _primeCatalogOwnershipStates(resolved.rows);
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      setState(() {
        _resultPricing = pricing;
        _catalogOwnershipByCardPrintId = <String, OwnershipState>{
          ..._catalogOwnershipByCardPrintId,
          ...ownershipStates,
        };
      });
    } catch (error) {
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      setState(() {
        _results = const [];
        _visibleResults = const [];
        _provisionalResults = const <PublicProvisionalCard>[];
        _resultPricing = const {};
        _resolverMeta = null;
        _hasMoreVisibleResults = false;
        _searchError = _formatSearchFailure(error);
        _loading = false;
      });
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

    final currentQuery = _searchCtrl.text;
    final filteredCurrentResults = _applyCatalogFilters(
      _results,
      rarityFilter: filter,
    );
    final nextVisibleResults = _takeSearchResultBatch(
      filteredCurrentResults,
      _kSearchInitialBatchSize,
    );
    setState(() {
      _rarityFilter = filter;
      _visibleResults = nextVisibleResults;
      _hasMoreVisibleResults =
          filteredCurrentResults.length > nextVisibleResults.length;
    });

    if (currentQuery.trim().isEmpty &&
        filter == _RarityFilter.all &&
        _identityFilter == kIdentityFilterAll &&
        _languageScope == 'all') {
      _resetCuratedLandingState();
      return;
    }

    _runSearch(currentQuery);
  }

  void _handleIdentityFilterChanged(String filterKey) {
    final normalizedFilter = normalizeIdentityFilterKey(filterKey);
    if (_identityFilter == normalizedFilter) {
      return;
    }

    final currentQuery = _searchCtrl.text;
    final filteredCurrentResults = _applyCatalogFilters(
      _results,
      identityFilter: normalizedFilter,
    );
    final nextVisibleResults = _takeSearchResultBatch(
      filteredCurrentResults,
      _kSearchInitialBatchSize,
    );

    setState(() {
      _identityFilter = normalizedFilter;
      _visibleResults = nextVisibleResults;
      _hasMoreVisibleResults =
          filteredCurrentResults.length > nextVisibleResults.length;
    });

    if (currentQuery.trim().isEmpty &&
        normalizedFilter == kIdentityFilterAll &&
        _rarityFilter == _RarityFilter.all &&
        _languageScope == 'all') {
      _resetCuratedLandingState();
      return;
    }

    _runSearch(currentQuery);
  }

  void _handleLanguageScopeChanged(String scope) {
    final normalizedScope = _normalizeSearchLanguageScope(scope);
    if (_languageScope == normalizedScope) {
      return;
    }

    setState(() {
      _languageScope = normalizedScope;
      _results = const [];
      _visibleResults = const [];
      _provisionalResults = const <PublicProvisionalCard>[];
      _resultPricing = const {};
      _resolverMeta = null;
      _hasMoreVisibleResults = false;
      _searchError = null;
    });
    _runSearch(_searchCtrl.text);
  }

  void _loadMoreSearchResults() {
    final filteredResults = _applyCatalogFilters(_results);
    final nextVisibleResults = _takeSearchResultBatch(
      filteredResults,
      _visibleResults.length + _kSearchFollowupBatchSize,
    );

    setState(() {
      _visibleResults = nextVisibleResults;
      _hasMoreVisibleResults =
          filteredResults.length > nextVisibleResults.length;
    });
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

            try {
              await CardEngagementService.recordFeedEvent(
                client: supabase,
                cardPrintId: card.id,
                eventType: 'add_to_vault',
                surface: 'search_action_hub',
                metadata: <String, dynamic>{
                  if (gvid.isNotEmpty) 'gv_id': gvid,
                  'destination': 'vault',
                },
              );
            } catch (_) {}

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

          Future<void> handleViewCard() async {
            Navigator.of(sheetContext).pop();
            await Future<void>.delayed(_kDrawerCloseDuration);
            if (!mounted) {
              return;
            }
            await _openCardDetail(card, navigator: parentNavigator);
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
                ShareParams(
                  uri: shareUri,
                  subject: resolveCardPrintDisplayIdentity(card).displayName,
                ),
              );
              await CardEngagementService.recordFeedEvent(
                client: supabase,
                cardPrintId: card.id,
                eventType: 'share',
                surface: 'search_action_hub',
                metadata: <String, dynamic>{
                  if (gvid.isNotEmpty) 'gv_id': gvid,
                  'destination': 'system_share',
                },
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
      unawaited(
        OnboardingLadderService.recordOwnedBestEffort(
          client: supabase,
          cardPrintId: card.id,
          source: 'search',
        ),
      );
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

  Future<void> _quickAddSearchResultToVault(CardPrint card) async {
    if (_addingCardIds.contains(card.id)) {
      return;
    }

    final gvviId = await _addToVaultFromSearch(card);
    if (!mounted || gvviId == null || gvviId.isEmpty) {
      return;
    }

    try {
      await CardEngagementService.recordFeedEvent(
        client: supabase,
        cardPrintId: card.id,
        eventType: 'add_to_vault',
        surface: 'search_result_tile',
        metadata: <String, dynamic>{
          if ((card.gvId ?? '').trim().isNotEmpty)
            'gv_id': (card.gvId ?? '').trim(),
          'destination': 'vault',
        },
      );
    } catch (_) {}

    final refreshedOwnershipState = await _refreshCatalogOwnershipState(
      card.id,
    );
    if (!mounted) {
      return;
    }

    final displayName = resolveCardPrintDisplayIdentity(card).displayName;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Added $displayName to your vault.'),
          action: SnackBarAction(
            label: 'View copy',
            onPressed: () {
              unawaited(
                Navigator.of(context)
                    .push(
                      MaterialPageRoute<void>(
                        builder: (_) => VaultGvviScreen(
                          gvviId: gvviId,
                          launchedFromSearch: true,
                        ),
                      ),
                    )
                    .then((_) {
                      if (mounted) {
                        unawaited(_refreshCatalogOwnershipState(card.id));
                      }
                    }),
              );
            },
          ),
        ),
      );

    if (refreshedOwnershipState == null) {
      unawaited(_refreshCatalogOwnershipState(card.id));
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

  Future<void> _openCardDetail(
    CardPrint card, {
    NavigatorState? navigator,
  }) async {
    await (navigator ?? Navigator.of(context)).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: card.id,
          entrySurface: 'search',
          gvId: (card.gvId ?? '').isEmpty ? null : card.gvId,
          name: card.name,
          setName: card.displaySet,
          setCode: card.setCode.isEmpty ? null : card.setCode,
          number: card.displayNumber,
          rarity: (card.rarity ?? '').isEmpty ? null : card.rarity,
          imageUrl: card.displayImage,
          selectedPrintingGvId:
              (card.selectedPrintingGvId ?? card.printingGvId ?? '')
                  .trim()
                  .isEmpty
              ? null
              : (card.selectedPrintingGvId ?? card.printingGvId),
          selectedFinishLabel:
              (card.displayDiscriminator ?? card.finishLabel ?? '')
                  .trim()
                  .isEmpty
              ? null
              : (card.displayDiscriminator ?? card.finishLabel),
        ),
      ),
    );
  }

  Widget _buildCatalogCardWithContext(
    CardPrint card, {
    bool enableFeedImpressionTracking = false,
    int? feedPosition,
    SmartFeedCandidateDebug? feedDebug,
    bool showFeedDebugOverlay = false,
  }) {
    final pricing = _resultPricing[card.id] ?? _trendingPricing[card.id];
    final ownershipState = _catalogOwnershipStateForCard(card.id);
    final showQuickAdd = !(ownershipState?.owned ?? false);
    final isAdding = _addingCardIds.contains(card.id);
    final onImpressionCandidate =
        enableFeedImpressionTracking && feedPosition != null
        ? () => _recordFeedImpressionIfEligible(
            card: card,
            position: feedPosition,
          )
        : null;
    if (_viewMode == AppCardViewMode.grid) {
      return _CatalogCardGridTile(
        card: card,
        pricing: pricing,
        ownershipState: ownershipState,
        onTap: () => _openSearchCardActionHub(card),
        onQuickAdd: showQuickAdd
            ? () => _quickAddSearchResultToVault(card)
            : null,
        isAdding: isAdding,
        onImpressionCandidate: onImpressionCandidate,
        feedDebug: feedDebug,
        showFeedDebugOverlay: showFeedDebugOverlay,
      );
    }

    return _CatalogCardTile(
      card: card,
      pricing: pricing,
      ownershipState: ownershipState,
      viewMode: _viewMode,
      onTap: () => _openSearchCardActionHub(card),
      onQuickAdd: showQuickAdd
          ? () => _quickAddSearchResultToVault(card)
          : null,
      isAdding: isAdding,
      onImpressionCandidate: onImpressionCandidate,
      feedDebug: feedDebug,
      showFeedDebugOverlay: showFeedDebugOverlay,
    );
  }

  Widget _buildCatalogResultsSliver(
    List<CardPrint> cards,
    List<_CatalogRow> rows, {
    bool trackFeedImpressions = false,
    bool showFeedDebugOverlay = false,
  }) {
    final feedPositionByCardId = trackFeedImpressions
        ? <String, int>{
            for (var index = 0; index < cards.length; index++)
              cards[index].id.trim(): index,
          }
        : const <String, int>{};
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
            return _buildCatalogCardWithContext(
              row.card,
              enableFeedImpressionTracking: trackFeedImpressions,
              feedPosition: feedPositionByCardId[row.card.id.trim()],
              feedDebug: _trendingDebugByCardId[row.card.id.trim()],
              showFeedDebugOverlay: showFeedDebugOverlay,
            );
          }
          return const SizedBox.shrink();
        },
      );
    }

    const columns = 2;

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(
        GvGridConstants.gridOuterPadding,
        6,
        GvGridConstants.gridOuterPadding,
        0,
      ),
      sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate(
          (context, index) => _buildCatalogCardWithContext(
            cards[index],
            enableFeedImpressionTracking: trackFeedImpressions,
            feedPosition: index,
            feedDebug: _trendingDebugByCardId[cards[index].id.trim()],
            showFeedDebugOverlay: showFeedDebugOverlay,
          ),
          childCount: cards.length,
          addAutomaticKeepAlives: false,
        ),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: GvGridConstants.gridSpacing,
          crossAxisSpacing: GvGridConstants.gridSpacing,
          childAspectRatio: GvGridConstants.gridChildAspectRatio,
        ),
      ),
    );
  }

  void _pruneFeedImpressionGates(DateTime now) {
    _feedImpressionWriteGateByCardId.removeWhere(
      (_, value) => now.difference(value) >= _kFeedImpressionGateWindow,
    );
    _feedImpressionSkipLogByCardId.removeWhere(
      (_, value) => now.difference(value) >= _kFeedImpressionGateWindow,
    );
  }

  void _debugFeedImpression(String message) {
    if (!kDebugMode) {
      return;
    }
    debugPrint('[feed-impression] $message');
  }

  void _recordFeedImpressionIfEligible({
    required CardPrint card,
    required int position,
  }) {
    final normalizedCardId = card.id.trim();
    if (normalizedCardId.isEmpty) {
      return;
    }

    final now = DateTime.now();
    _pruneFeedImpressionGates(now);

    final lastWrittenAt = _feedImpressionWriteGateByCardId[normalizedCardId];
    if (lastWrittenAt != null) {
      final age = now.difference(lastWrittenAt);
      if (age < _kFeedImpressionGateWindow) {
        final lastSkipLogAt = _feedImpressionSkipLogByCardId[normalizedCardId];
        if (lastSkipLogAt == null ||
            now.difference(lastSkipLogAt) >= _kFeedImpressionSkipLogWindow) {
          _feedImpressionSkipLogByCardId[normalizedCardId] = now;
          _debugFeedImpression(
            'skip id=$normalizedCardId name="${card.name}" pos=$position age=${age.inSeconds}s',
          );
        }
        return;
      }
    }

    _feedImpressionWriteGateByCardId[normalizedCardId] = now;
    _debugFeedImpression(
      'write id=$normalizedCardId name="${card.name}" pos=$position',
    );
    unawaited(
      CardEngagementService.recordImpression(
        client: supabase,
        cardPrintId: normalizedCardId,
        surface: 'feed',
        position: position,
      ).catchError((error) {
        _debugFeedImpression(
          'error id=$normalizedCardId pos=$position error=$error',
        );
      }),
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

        return Align(
          alignment: Alignment.bottomCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 390),
            child: GvSurface(
              variant: GvSurfaceVariant.glass,
              borderRadius: 28,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '$compareCount card${compareCount == 1 ? '' : 's'} selected',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.72,
                        ),
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
            ),
          ),
        );
      },
    );
  }

  Widget _buildResultsLeadIn(
    ThemeData theme, {
    required bool showingCuratedLanding,
    required int resultCount,
    required int visibleCount,
    required String trimmed,
    required bool showFeedDebugToggle,
    required bool showFeedDebugOverlay,
  }) {
    final colorScheme = theme.colorScheme;
    final title = showingCuratedLanding
        ? 'Trending now'
        : trimmed.isNotEmpty
        ? 'Search results'
        : 'Cards';
    final subtitle = trimmed.isNotEmpty ? '"$trimmed"' : null;
    final progressLabel =
        !showingCuratedLanding && visibleCount > 0 && visibleCount < resultCount
        ? 'Showing $visibleCount of $resultCount'
        : null;

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
                  letterSpacing: 0,
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
              if (progressLabel != null) ...[
                const SizedBox(height: 2),
                Text(
                  progressLabel,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.52),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (resultCount > 0 || showFeedDebugToggle)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (resultCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 5,
                  ),
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
              if (showFeedDebugToggle) ...[
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  tooltip: showFeedDebugOverlay
                      ? 'Hide feed debug overlay'
                      : 'Show feed debug overlay',
                  onPressed: () {
                    setState(() {
                      _showFeedDebugOverlay = !_showFeedDebugOverlay;
                    });
                  },
                  icon: Icon(
                    showFeedDebugOverlay
                        ? Icons.bug_report_rounded
                        : Icons.bug_report_outlined,
                    size: 18,
                  ),
                  style: IconButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.all(8),
                    minimumSize: const Size(34, 34),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    backgroundColor: showFeedDebugOverlay
                        ? colorScheme.primary.withValues(alpha: 0.18)
                        : colorScheme.surfaceContainerHighest.withValues(
                            alpha: 0.32,
                          ),
                    foregroundColor: showFeedDebugOverlay
                        ? colorScheme.primary
                        : colorScheme.onSurface.withValues(alpha: 0.64),
                  ),
                ),
              ],
            ],
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final trimmed = _searchCtrl.text.trim();
    final showingCuratedLanding = _shouldShowCuratedLanding(trimmed);
    final isCatalogLoading = _loading || _loadingCuratedLanding;
    final totalSearchResults = _applyCatalogFilters(_results);
    final visibleSearchResults = _visibleResults;
    final cards = showingCuratedLanding
        ? _applyCatalogFilters(_trending)
        : visibleSearchResults;
    final totalResultCount = showingCuratedLanding
        ? cards.length
        : totalSearchResults.length;
    final visibleResultCount = cards.length;
    final hasProvisionalResults =
        !showingCuratedLanding && _provisionalResults.isNotEmpty;
    final showEmpty =
        !isCatalogLoading && totalResultCount == 0 && !hasProvisionalResults;
    final theme = Theme.of(context);
    final identityFilterCounts = buildIdentityFilterCounts(
      showingCuratedLanding ? _trending : _results,
    );
    final visibleIdentityFilters = _visibleIdentityFilterOptions(
      identityFilterCounts,
    );
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
                      color: theme.colorScheme.error,
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
              LayoutBuilder(
                builder: (context, constraints) {
                  final utilityControls = Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildSearchFilterButton(
                        theme: theme,
                        identityFilterCounts: identityFilterCounts,
                        visibleIdentityFilters: visibleIdentityFilters,
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
                  );

                  if (constraints.maxWidth < 430) {
                    return Align(
                      alignment: Alignment.centerLeft,
                      child: utilityControls,
                    );
                  }

                  return Row(
                    children: [
                      const Spacer(),
                      const SizedBox(width: 8),
                      utilityControls,
                    ],
                  );
                },
              ),
            ],
          ),
        ),
        if (isCatalogLoading) const LinearProgressIndicator(minHeight: 2),
        Expanded(
          child: Stack(
            children: [
              RefreshIndicator(
                onRefresh: () async {
                  await Future.wait([reload(), _loadTrending()]);
                },
                child: CustomScrollView(
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  // ignore: deprecated_member_use
                  cacheExtent: showingCuratedLanding ? 960 : 520,
                  slivers: [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
                        child: _buildResultsLeadIn(
                          theme,
                          showingCuratedLanding: showingCuratedLanding,
                          resultCount: totalResultCount,
                          visibleCount: visibleResultCount,
                          trimmed: trimmed,
                          showFeedDebugToggle:
                              showingCuratedLanding &&
                              kDebugMode &&
                              kFeedDebugOverlay,
                          showFeedDebugOverlay:
                              showingCuratedLanding &&
                              kDebugMode &&
                              kFeedDebugOverlay &&
                              _showFeedDebugOverlay,
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
                                ? 'Nothing trending yet'
                                : trimmed.isEmpty
                                ? 'No cards yet'
                                : 'No results yet',
                            body: showingCuratedLanding
                                ? 'Check back soon.'
                                : trimmed.isEmpty
                                ? 'Cards will appear here when the catalog loads.'
                                : 'Try a set code or card number.',
                          ),
                        ),
                      )
                    else
                      _buildCatalogResultsSliver(
                        cards,
                        rows,
                        trackFeedImpressions: showingCuratedLanding,
                        showFeedDebugOverlay:
                            showingCuratedLanding &&
                            kDebugMode &&
                            kFeedDebugOverlay &&
                            _showFeedDebugOverlay,
                      ),
                    if (!showingCuratedLanding && _hasMoreVisibleResults)
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                        sliver: SliverToBoxAdapter(
                          child: Center(
                            child: OutlinedButton.icon(
                              onPressed: _loadMoreSearchResults,
                              icon: const Icon(
                                Icons.expand_more_rounded,
                                size: 18,
                              ),
                              label: const Text('Load more'),
                            ),
                          ),
                        ),
                      ),
                    if (hasProvisionalResults)
                      SliverToBoxAdapter(
                        child: ProvisionalCardSection(
                          cards: _provisionalResults,
                          compact: true,
                        ),
                      ),
                    SliverToBoxAdapter(
                      child: ValueListenableBuilder<List<String>>(
                        valueListenable:
                            CompareCardSelectionController.instance.listenable,
                        builder: (context, selectedIds, _) => SizedBox(
                          height: shellContentBottomPadding(
                            context,
                            extra: selectedIds.isEmpty ? 8 : 92,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 18,
                child: _buildCompareWorkspaceEntry(theme),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
