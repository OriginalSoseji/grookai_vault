// lib/main.dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import 'card_detail_screen.dart';
import 'models/card_print.dart';
import 'secrets.dart';
import 'screens/account/account_screen.dart';
import 'screens/compare/compare_screen.dart';
import 'screens/network/network_inbox_screen.dart';
import 'screens/network/network_screen.dart';
import 'screens/public_collector/public_collector_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'screens/sets/public_sets_screen.dart';
import 'screens/vault/vault_manage_card_screen.dart';
import 'services/public/card_surface_pricing_service.dart';
import 'services/public/compare_service.dart';
import 'services/public/public_collector_service.dart';
import 'services/public/public_sets_service.dart';
import 'services/vault/vault_card_service.dart';
import 'screens/scanner/scan_capture_screen.dart';
import 'screens/identity_scan/identity_scan_screen.dart';
import 'widgets/card_surface_artwork.dart';
import 'widgets/card_surface_price.dart';
import 'widgets/card_view_mode.dart';
import 'widgets/app_shell_metrics.dart';

part 'main_shell.dart';
part 'main_vault.dart';

const bool kDebugTouchLog = false;

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
      color: colorScheme.surfaceVariant.withOpacity(0.8),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: base.inputDecorationTheme.copyWith(
      filled: false,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: colorScheme.outline.withOpacity(0.4),
          width: 1,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: colorScheme.outline.withOpacity(0.4),
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
    this.emphasize = false,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: colorScheme.outline.withOpacity(emphasize ? 0.24 : 0.14),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(emphasize ? 0.08 : 0.05),
            blurRadius: emphasize ? 22 : 14,
            offset: Offset(0, emphasize ? 10 : 6),
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
    super.key,
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
                    color: colorScheme.onSurface.withOpacity(0.72),
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
  const _ProductEmptyState({
    required this.title,
    required this.body,
    super.key,
  });

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
        color: colorScheme.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withOpacity(0.14)),
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
              color: colorScheme.onSurface.withOpacity(0.72),
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
  const _CatalogSkeletonTile({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final base = colorScheme.surfaceVariant.withOpacity(0.7);
    final highlight = colorScheme.surfaceVariant.withOpacity(0.4);

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
  final EdgeInsetsGeometry padding;

  const _CatalogSearchField({
    required this.controller,
    required this.onChanged,
    this.onSubmitted,
    this.padding = EdgeInsets.zero,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: padding,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surfaceVariant.withOpacity(0.7),
          borderRadius: BorderRadius.circular(16),
        ),
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          textInputAction: TextInputAction.search,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            hintText: 'Search by name, set, or number',
            border: InputBorder.none,
            isDense: true,
            contentPadding: EdgeInsets.symmetric(vertical: 12, horizontal: 12),
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
    super.key,
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
        background = Colors.amber.withOpacity(0.12);
        border = Colors.amber.withOpacity(0.6);
        title = 'Multiple plausible matches';
        body =
            'This query is still ambiguous. Review the ranked cards instead of treating the top result as certain.';
        break;
      case ResolverSearchState.weakMatch:
        background = colorScheme.surfaceVariant.withOpacity(0.7);
        border = colorScheme.outline.withOpacity(0.35);
        title = 'Weak match';
        body =
            'These results are approximate. Add a set code, collector number, or promo code to strengthen the match.';
        break;
      case ResolverSearchState.noMatch:
        background = colorScheme.surfaceVariant.withOpacity(0.7);
        border = colorScheme.outline.withOpacity(0.35);
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
                color: colorScheme.onSurface.withOpacity(0.75),
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

  const _CatalogSectionHeader(this.title, {this.compact = false, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme.onSurface.withOpacity(0.6);
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

class _CatalogCardTile extends StatelessWidget {
  final CardPrint card;
  final CardSurfacePricingData? pricing;
  final VoidCallback? onTap;
  final AppCardViewMode viewMode;

  const _CatalogCardTile({
    required this.card,
    required this.viewMode,
    this.pricing,
    this.onTap,
    super.key,
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
    final subtitle = subtitleParts.join(' | ');
    final thumbWidth = compact ? 40.0 : 46.0;
    final thumbHeight = compact ? 56.0 : 64.0;

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 10 : 10,
        vertical: compact ? 0.5 : 1,
      ),
      child: Material(
        color: colorScheme.surfaceVariant.withOpacity(0.7),
        borderRadius: BorderRadius.circular(compact ? 12 : 14),
        child: InkWell(
          borderRadius: BorderRadius.circular(compact ? 12 : 14),
          onTap: () {
            HapticFeedback.lightImpact();
            if (onTap != null) onTap!();
          },
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 8 : 8,
              vertical: compact ? 5 : 7,
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
                                  fontWeight: FontWeight.w600,
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
                            color: colorScheme.onSurface.withOpacity(0.7),
                            fontSize: compact ? 11.5 : null,
                          ),
                        ),
                      ],
                      if (pricing?.hasVisibleValue == true) ...[
                        SizedBox(height: compact ? 4 : 5),
                        CardSurfacePricePill(
                          pricing: pricing,
                          size: compact
                              ? CardSurfacePriceSize.dense
                              : CardSurfacePriceSize.list,
                        ),
                      ],
                    ],
                  ),
                ),
                SizedBox(width: compact ? 2 : 4),
                _CompareToggleIconButton(gvId: card.gvId),
                Icon(Icons.chevron_right, size: compact ? 16 : 18),
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
    );
  }
}

class _CatalogCardGridTile extends StatelessWidget {
  const _CatalogCardGridTile({
    required this.card,
    required this.onTap,
    this.pricing,
  });

  final CardPrint card;
  final VoidCallback onTap;
  final CardSurfacePricingData? pricing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final subtitleParts = <String>[
      if (card.setCode.isNotEmpty) card.setCode.toUpperCase(),
      if (card.displayNumber.isNotEmpty) '#${card.displayNumber}',
    ];
    final subtitle = subtitleParts.join(' • ');

    return Material(
      color: colorScheme.surfaceContainerHighest.withOpacity(0.38),
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        borderRadius: BorderRadius.circular(15),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(7, 7, 7, 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: _CatalogGridArtwork(card: card),
                      ),
                    ),
                    Positioned(
                      right: 4,
                      top: 4,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: colorScheme.surface.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: _CompareToggleIconButton(gvId: card.gvId),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Text(
                card.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.05,
                ),
              ),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withOpacity(0.68),
                    fontSize: 10.4,
                  ),
                ),
              ],
              if (pricing?.hasVisibleValue == true) ...[
                const SizedBox(height: 4),
                CardSurfacePricePill(
                  pricing: pricing,
                  size: CardSurfacePriceSize.grid,
                ),
              ],
            ],
          ),
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
    return CardSurfaceArtwork(
      label: card.name,
      imageUrl: card.displayImage,
      borderRadius: 12,
      padding: const EdgeInsets.all(2.5),
    );
  }
}

class _CompareToggleIconButton extends StatelessWidget {
  const _CompareToggleIconButton({required this.gvId});

  final String? gvId;

  @override
  Widget build(BuildContext context) {
    final normalizedGvId = normalizeCompareCardId(gvId ?? '');
    if (normalizedGvId.isEmpty) {
      return const SizedBox.shrink();
    }

    return ValueListenableBuilder<List<String>>(
      valueListenable: CompareCardSelectionController.instance.listenable,
      builder: (context, selectedIds, _) {
        final isSelected = selectedIds.contains(normalizedGvId);

        return IconButton(
          tooltip: isSelected ? 'Remove from compare' : 'Add to compare',
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints.tightFor(width: 24, height: 24),
          visualDensity: VisualDensity.compact,
          icon: Icon(
            isSelected
                ? Icons.check_circle_rounded
                : Icons.add_circle_outline_rounded,
            size: 17,
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
          ),
          onPressed: () {
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

            CompareCardSelectionController.instance.toggle(normalizedGvId);
          },
        );
      },
    );
  }
}

class _ExploreSetRailTile extends StatelessWidget {
  const _ExploreSetRailTile({required this.setInfo, required this.onTap});

  final PublicSetSummary setInfo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metaParts = <String>[
      if (setInfo.releaseYear != null) '${setInfo.releaseYear}',
      if (setInfo.printedTotal != null) '${setInfo.printedTotal} cards',
    ];

    return SizedBox(
      width: 164,
      child: Material(
        color: colorScheme.surfaceContainerHighest.withOpacity(0.5),
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    setInfo.code,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  setInfo.name,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1.15,
                  ),
                ),
                const Spacer(),
                Text(
                  metaParts.isEmpty
                      ? '${setInfo.cardCount} cards'
                      : metaParts.join(' • '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withOpacity(0.68),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Open set',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: colorScheme.primary,
                    fontWeight: FontWeight.w700,
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

  print('[gv] supabase_url=$url');
  await Supabase.initialize(url: url, anonKey: key);
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
class MyApp extends StatelessWidget {
  const MyApp({super.key});
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
          return session == null ? const LoginPage() : const AppShell();
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
  final _searchCtrl = TextEditingController();
  List<CardPrint> _results = const [];
  List<CardPrint> _trending = const [];
  Map<String, CardSurfacePricingData> _resultPricing = const {};
  Map<String, CardSurfacePricingData> _trendingPricing = const {};
  List<PublicSetSummary> _featuredSets = const [];
  CardSearchResolverMeta? _resolverMeta;
  bool _loading = false;
  bool _setsLoading = false;
  String? _searchError;
  String? _setsError;
  Timer? _debounce;
  int _searchRequestVersion = 0;
  _RarityFilter _rarityFilter = _RarityFilter.all;
  AppCardViewMode _viewMode = AppCardViewMode.grid;

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

  @override
  void initState() {
    super.initState();
    _loadTrending();
    _loadFeaturedSets();
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
    if (!mounted) return;
    setState(() {
      _trending = rows;
      _trendingPricing = pricing;
    });
  }

  Future<void> _loadFeaturedSets() async {
    setState(() {
      _setsLoading = true;
      _setsError = null;
    });

    try {
      final sets = await PublicSetsService.fetchFeaturedSets(client: supabase);
      if (!mounted) {
        return;
      }

      setState(() {
        _featuredSets = sets;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _setsError = error is Error ? error.toString() : 'Unable to load sets.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _setsLoading = false;
        });
      }
    }
  }

  Widget _buildRarityChip(_RarityFilter filter, String label) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bool selected = _rarityFilter == filter;

    Color bg;
    Color border;
    Color text;

    if (selected) {
      bg = colorScheme.primary.withOpacity(0.12);
      border = colorScheme.primary;
      text = colorScheme.primary;
    } else {
      bg = colorScheme.surfaceVariant.withOpacity(0.5);
      border = Colors.transparent;
      text = colorScheme.onSurface.withOpacity(0.75);
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
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      setState(() {
        _results = resolved.rows;
        _resultPricing = pricing;
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
    if (_viewMode == AppCardViewMode.grid) {
      return _CatalogCardGridTile(
        card: card,
        pricing: pricing,
        onTap: () => _openCardDetail(card),
      );
    }

    return _CatalogCardTile(
      card: card,
      pricing: pricing,
      viewMode: _viewMode,
      onTap: () => _openCardDetail(card),
    );
  }

  Widget _buildCatalogResultsSliver(
    List<CardPrint> cards,
    List<_CatalogRow> rows,
  ) {
    if (_viewMode != AppCardViewMode.grid) {
      return SliverList.separated(
        itemCount: rows.length,
        separatorBuilder: (_, __) => const SizedBox(height: 2),
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

    final columns = resolveSharedCardGridColumns(
      context,
      horizontalPadding: 32,
      minTileWidth: 102,
    );

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate(
          (context, index) => _buildCatalogCard(cards[index]),
          childCount: cards.length,
        ),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 0.67,
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
                    color: theme.colorScheme.onSurface.withOpacity(0.72),
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

  Widget _buildFeaturedSetsSurface(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Sets',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: _openSetsScreen,
              child: const Text('View all'),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_setsLoading)
          const _ProductEmptyState(
            title: 'Loading sets',
            body: 'Fetching the current public set browse surface.',
          )
        else if (_setsError != null)
          _ProductEmptyState(title: 'Unable to load sets', body: _setsError!)
        else if (_featuredSets.isEmpty)
          const _ProductEmptyState(
            title: 'No sets surfaced yet',
            body: 'Public sets will appear here when the read returns results.',
          )
        else
          SizedBox(
            height: 156,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _featuredSets.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final setInfo = _featuredSets[index];
                return _ExploreSetRailTile(
                  setInfo: setInfo,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            PublicSetDetailScreen(setCode: setInfo.code),
                      ),
                    );
                  },
                );
              },
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
    final resultsTitle = showingCuratedLanding
        ? 'Curated cards'
        : trimmed.isEmpty
        ? 'Catalog'
        : 'Results';
    final rows = _viewMode == AppCardViewMode.grid
        ? const <_CatalogRow>[]
        : _buildRows(cards);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
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
                padding: const EdgeInsets.only(top: 8, bottom: 0),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _openSetsScreen,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
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
              const SizedBox(height: 6),
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
              await Future.wait([
                reload(),
                _loadTrending(),
                _loadFeaturedSets(),
              ]);
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (showingCuratedLanding)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                    sliver: SliverToBoxAdapter(
                      child: _buildFeaturedSetsSurface(theme),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      showingCuratedLanding ? 14 : 10,
                      16,
                      0,
                    ),
                    child: Row(
                      children: [
                        Text(
                          resultsTitle,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const Spacer(),
                        if (resultCount > 0)
                          Text(
                            '$resultCount cards',
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(
                                0.58,
                              ),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
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
                            ? 'No curated cards yet'
                            : trimmed.isEmpty
                            ? 'No cards surfaced yet'
                            : 'No results yet',
                        body: showingCuratedLanding
                            ? 'Curated cards will appear here when the public explore feed loads.'
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
                if (!showingCuratedLanding)
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      14,
                      16,
                      shellContentBottomPadding(context, extra: 8),
                    ),
                    sliver: SliverToBoxAdapter(
                      child: _buildFeaturedSetsSurface(theme),
                    ),
                  )
                else
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
