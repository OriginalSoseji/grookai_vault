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
import 'screens/compare/compare_screen.dart';
import 'screens/network/network_screen.dart';
import 'screens/public_collector/public_collector_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'screens/sets/public_sets_screen.dart';
import 'services/public/compare_service.dart';
import 'services/public/public_collector_service.dart';
import 'services/public/public_sets_service.dart';
import 'services/vault/vault_card_service.dart';
import 'screens/scanner/scan_capture_screen.dart';
import 'screens/scanner/condition_camera_screen.dart';
import 'screens/identity_scan/identity_scan_screen.dart';

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
      centerTitle: false,
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      titleTextStyle: base.textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: colorScheme.onSurface,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: colorScheme.surface,
      indicatorColor: colorScheme.primary.withOpacity(0.12),
      height: 68,
      labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return IconThemeData(color: colorScheme.primary);
        }
        return IconThemeData(color: colorScheme.onSurface.withOpacity(0.7));
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final style = base.textTheme.labelMedium;
        if (states.contains(WidgetState.selected)) {
          return style?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
          );
        }
        return style?.copyWith(color: colorScheme.onSurface.withOpacity(0.7));
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

class _SetIconBadge extends StatelessWidget {
  final CardPrint card;

  const _SetIconBadge({required this.card, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final setCode = card.setCode.toUpperCase();
    final setLabel = setCode.isNotEmpty
        ? setCode
        : (card.displaySet.isNotEmpty ? card.displaySet : 'SET');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: colorScheme.primary.withOpacity(0.5),
          width: 0.7,
        ),
      ),
      child: Text(
        setLabel,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
          color: colorScheme.primary.withOpacity(0.9),
        ),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

class _RarityIconBadge extends StatelessWidget {
  final String? rarity;

  const _RarityIconBadge({required this.rarity, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final raw = (rarity ?? '').trim();
    if (raw.isEmpty) {
      return const SizedBox.shrink();
    }

    final lower = raw.toLowerCase();

    Color bg;
    Color border;
    String label;

    if (lower.contains('secret')) {
      bg = Colors.amber.withOpacity(0.14);
      border = Colors.amber.withOpacity(0.7);
      label = 'SR';
    } else if (lower.contains('ultra')) {
      bg = Colors.deepPurple.withOpacity(0.14);
      border = Colors.deepPurple.withOpacity(0.7);
      label = 'UR';
    } else if (lower.contains('rare')) {
      bg = Colors.blue.withOpacity(0.14);
      border = Colors.blue.withOpacity(0.7);
      label = 'R';
    } else if (lower.contains('uncommon')) {
      bg = Colors.green.withOpacity(0.14);
      border = Colors.green.withOpacity(0.7);
      label = 'U';
    } else if (lower.contains('common')) {
      bg = Colors.grey.withOpacity(0.16);
      border = Colors.grey.withOpacity(0.7);
      label = 'C';
    } else {
      bg = colorScheme.secondary.withOpacity(0.14);
      border = colorScheme.secondary.withOpacity(0.7);
      label = raw.length > 3
          ? raw.substring(0, 3).toUpperCase()
          : raw.toUpperCase();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border, width: 0.7),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

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

class _VaultItemTile extends StatelessWidget {
  final Map<String, dynamic> row;
  final VoidCallback? onIncrement;
  final VoidCallback? onDecrement;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;
  final VoidCallback? onScan;

  const _VaultItemTile({
    required this.row,
    this.onIncrement,
    this.onDecrement,
    this.onDelete,
    this.onTap,
    this.onScan,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final id = (row['id'] ?? '').toString();
    final name = (row['name'] ?? 'Item').toString();
    final set = (row['set_name'] ?? '').toString();
    final ownedCount = _ownedCountForRow(row);
    final cond = (row['condition_label'] ?? 'NM').toString();
    final gvId = (row['gv_id'] ?? '').toString();
    final cardPrintId = (row['card_id'] ?? '').toString();
    final number = (row['number'] ?? '').toString();
    final imgUrl = (row['photo_url'] ?? row['image_url']).toString();

    final subtitleParts = <String>[];
    if (set.isNotEmpty) subtitleParts.add(set);
    if (number.isNotEmpty) subtitleParts.add('#$number');
    final subtitle = subtitleParts.join(' - ');

    Color condColor;
    switch (cond) {
      case 'NM':
        condColor = Colors.green;
        break;
      case 'LP':
        condColor = Colors.lightGreen;
        break;
      case 'MP':
        condColor = Colors.orange;
        break;
      case 'HP':
        condColor = Colors.deepOrange;
        break;
      case 'DMG':
        condColor = Colors.red;
        break;
      default:
        condColor = Colors.grey;
    }

    Widget _thumb() {
      final u = imgUrl.toString();
      if (u.isEmpty) {
        return const CircleAvatar(radius: 22, child: Icon(Icons.style));
      }
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          u,
          width: 44,
          height: 44,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              const CircleAvatar(radius: 22, child: Icon(Icons.broken_image)),
        ),
      );
    }

    Widget _condChip() {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: condColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: condColor.withOpacity(0.8), width: 0.7),
        ),
        child: Text(
          cond,
          style: theme.textTheme.labelSmall?.copyWith(
            color: condColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Dismissible(
        key: ValueKey(id),
        background: Container(
          color: Colors.red,
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.only(left: 16),
          child: const Icon(Icons.delete, color: Colors.white),
        ),
        secondaryBackground: Container(
          color: Colors.red,
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 16),
          child: const Icon(Icons.delete, color: Colors.white),
        ),
        confirmDismiss: (_) async {
          if (onDelete == null) return false;
          await Future.sync(onDelete!);
          return false;
        },
        child: Material(
          color: colorScheme.surfaceVariant.withOpacity(0.7),
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: cardPrintId.isEmpty ? null : onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              child: Row(
                children: [
                  _thumb(),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (subtitle.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            subtitle,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withOpacity(0.7),
                            ),
                          ),
                        ],
                        if (gvId.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            gvId,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.primary,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            _condChip(),
                            Text(
                              'Qty: $ownedCount',
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.camera_alt, size: 20),
                        onPressed: onScan,
                        tooltip: 'Scan (Condition + Fingerprint)',
                      ),
                      IconButton(
                        icon: const Icon(Icons.add, size: 20),
                        onPressed: onIncrement,
                        tooltip: 'Increase quantity',
                      ),
                      IconButton(
                        icon: const Icon(Icons.remove, size: 20),
                        onPressed: onDecrement,
                        tooltip: 'Decrease quantity',
                      ),
                    ],
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

  const _CatalogSectionHeader(this.title, {super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme.onSurface.withOpacity(0.6);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
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
  final VoidCallback? onTap;

  const _CatalogCardTile({required this.card, this.onTap, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final subtitleParts = <String>[];
    if (card.displaySet.isNotEmpty) {
      subtitleParts.add(card.displaySet);
    }
    if (card.displayNumber.isNotEmpty) {
      subtitleParts.add('#${card.displayNumber}');
    }
    if ((card.rarity ?? '').isNotEmpty) {
      subtitleParts.add(card.rarity!);
    }
    final subtitle = subtitleParts.join(' | ');

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: colorScheme.surfaceVariant.withOpacity(0.7),
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            HapticFeedback.lightImpact();
            if (onTap != null) onTap!();
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                _thumb(card.displayImage),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        card.name,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _SetIconBadge(card: card),
                            _RarityIconBadge(rarity: card.rarity),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                _CompareToggleIconButton(gvId: card.gvId),
                const Icon(Icons.chevron_right, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _thumb(String? url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) {
      return const CircleAvatar(radius: 22, child: Icon(Icons.style));
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(radius: 22, child: Icon(Icons.broken_image)),
      ),
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
          icon: Icon(
            isSelected
                ? Icons.check_circle_rounded
                : Icons.add_circle_outline_rounded,
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

/// ---------------------- APP SHELL (Home + Vault) ----------------------
class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final supabase = Supabase.instance.client;
  int _index =
      0; // 0 = Explore, 1 = Wall, 3 = Network, 4 = Vault; 2 reserved for Scan
  final GlobalKey<HomePageState> _homeKey = GlobalKey();
  final GlobalKey<_MyWallTabState> _wallKey = GlobalKey();
  final GlobalKey<NetworkScreenState> _networkKey = GlobalKey();
  final GlobalKey<VaultPageState> _vaultKey = GlobalKey();

  Future<void> _signOut() async => supabase.auth.signOut();

  Future<void> _openSets() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const PublicSetsScreen()));
  }

  Future<void> _openCompare() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const CompareScreen()));
  }

  void _refreshCurrent() {
    if (_index == 0) {
      _homeKey.currentState?.reload();
    } else if (_index == 1) {
      _wallKey.currentState?.reload();
    } else if (_index == 3) {
      _networkKey.currentState?.reload();
    } else if (_index == 4) {
      _vaultKey.currentState?.reload();
    }
  }

  Future<String?> _showPublicCollectorSlugPrompt() async {
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
            hintText: 'Enter /u/slug',
          ),
          onChanged: (value) {
            draftSlug = value;
          },
          onSubmitted: (value) {
            Navigator.of(dialogContext).pop(value.trim());
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(draftSlug.trim()),
            child: const Text('Open'),
          ),
        ],
      ),
    );
  }

  Future<void> _openPublicCollectorPrompt() async {
    final navigator = Navigator.of(context);
    final slug = await _showPublicCollectorSlugPrompt();

    if (!context.mounted) {
      return;
    }

    if (slug == null || slug.trim().isEmpty) {
      return;
    }

    final normalizedSlug = slug.trim().toLowerCase();
    await Future<void>.delayed(Duration.zero);
    if (!context.mounted) {
      return;
    }

    navigator.push(
      MaterialPageRoute(
        builder: (_) => PublicCollectorScreen(slug: normalizedSlug),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bodyIndex = switch (_index) {
      0 => 0,
      1 => 1,
      3 => 2,
      4 => 3,
      _ => 0,
    };
    final currentTitle = switch (_index) {
      0 => 'Explore',
      1 => 'My Wall',
      3 => 'Network',
      4 => 'Vault',
      _ => 'Explore',
    };
    return Scaffold(
      appBar: AppBar(
        title: Text(
          currentTitle,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        actions: [
          if (_index == 0)
            IconButton(
              icon: const Icon(Icons.grid_view_rounded),
              tooltip: 'Browse sets',
              onPressed: _openSets,
            ),
          if (_index == 0)
            ValueListenableBuilder<List<String>>(
              valueListenable:
                  CompareCardSelectionController.instance.listenable,
              builder: (context, selectedIds, _) {
                final compareCount = selectedIds.length;

                return IconButton(
                  tooltip: compareCount > 0
                      ? 'Open compare ($compareCount selected)'
                      : 'Open compare',
                  onPressed: _openCompare,
                  icon: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(Icons.compare_arrows_rounded),
                      if (compareCount > 0)
                        Positioned(
                          right: -8,
                          top: -6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 5,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '$compareCount',
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onPrimary,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          if (_index == 1)
            IconButton(
              icon: const Icon(Icons.public),
              tooltip: 'Open public collector',
              onPressed: _openPublicCollectorPrompt,
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshCurrent,
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: _signOut),
        ],
      ),
      body: IndexedStack(
        index: bodyIndex,
        children: [
          HomePage(key: _homeKey),
          _MyWallTab(key: _wallKey, onOpenBySlug: _openPublicCollectorPrompt),
          NetworkScreen(key: _networkKey),
          VaultPage(key: _vaultKey),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        height: 68,
        selectedIndex: _index,
        onDestinationSelected: (i) {
          if (i == 2) {
            Navigator.of(context)
                .push<XFile?>(
                  MaterialPageRoute<XFile?>(
                    builder: (_) => const ConditionCameraScreen(
                      title: 'Scan Card',
                      hintText: 'Align card inside the frame',
                    ),
                  ),
                )
                .then((XFile? file) {
                  if (file != null) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            IdentityScanScreen(initialFrontFile: file),
                      ),
                    );
                  }
                });
          } else {
            setState(() => _index = i);
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.search),
            selectedIcon: Icon(Icons.search),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(Icons.public_outlined),
            selectedIcon: Icon(Icons.public),
            label: 'Wall',
          ),
          NavigationDestination(
            icon: Icon(Icons.camera_alt_outlined),
            selectedIcon: Icon(Icons.camera_alt),
            label: 'Scan',
          ),
          NavigationDestination(
            icon: Icon(Icons.hub_outlined),
            selectedIcon: Icon(Icons.hub),
            label: 'Network',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Vault',
          ),
        ],
      ),
    );
  }
}

/// ---------------------- LOGIN PAGE ----------------------
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;

  SupabaseClient get supabase => Supabase.instance.client;

  Future<void> _signIn() async {
    setState(() => _loading = true);
    try {
      await supabase.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on AuthException catch (e) {
      _snack('Login failed: ${e.message}');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signUp() async {
    setState(() => _loading = true);
    try {
      await supabase.auth.signUp(
        email: _email.text.trim(),
        password: _password.text,
      );
      _snack('Account created. Verify email if enabled.');
    } on AuthException catch (e) {
      _snack('Sign up failed: ${e.message}');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Welcome to Grookai Vault',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Sign in to manage your collection, track prices, and build your vault.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _loading ? null : _signIn,
                  child: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign in'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _loading ? null : _signUp,
                  child: const Text('Create account'),
                ),
              ],
            ),
          ),
        ),
      ),
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
  List<PublicSetSummary> _featuredSets = const [];
  CardSearchResolverMeta? _resolverMeta;
  bool _loading = false;
  bool _setsLoading = false;
  String? _searchError;
  String? _setsError;
  Timer? _debounce;
  _RarityFilter _rarityFilter = _RarityFilter.all;

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
    reload();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    await _runSearch(_searchCtrl.text);
  }

  Future<void> _loadTrending() async {
    final rows = await CardPrintRepository.fetchTrending(client: supabase);
    if (!mounted) return;
    setState(() {
      _trending = rows;
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
      onSelected: (_) {
        setState(() {
          _rarityFilter = filter;
        });
      },
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
    setState(() => _loading = true);
    try {
      final resolved = await CardPrintRepository.searchCardPrintsResolved(
        client: supabase,
        options: CardSearchOptions(query: query),
      );
      setState(() {
        _results = resolved.rows;
        _resolverMeta = resolved.meta;
        _searchError = null;
      });
    } catch (error) {
      setState(() {
        _results = const [];
        _resolverMeta = null;
        _searchError = error is Error ? error.toString() : 'Search failed.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _runSearch(value.trim());
    });
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
    final showingTrending =
        trimmed.isEmpty && _trending.isNotEmpty && _results.isEmpty;
    final cards = _applyRarityFilter(showingTrending ? _trending : _results);
    final showEmpty = !_loading && cards.isEmpty;
    final rows = _buildRows(cards);
    final theme = Theme.of(context);
    final resultCount = rows.whereType<_CatalogCardRow>().length;
    final resultsTitle = showingTrending
        ? 'Trending now'
        : trimmed.isEmpty
        ? 'Catalog'
        : 'Results';

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
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
              await Future.wait([
                reload(),
                _loadTrending(),
                _loadFeaturedSets(),
              ]);
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
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
                if (_loading && _results.isEmpty && _trending.isEmpty)
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => const _CatalogSkeletonTile(),
                      childCount: 6,
                    ),
                  )
                else if (showEmpty)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                    sliver: SliverToBoxAdapter(
                      child: _ProductEmptyState(
                        title: trimmed.isEmpty
                            ? 'No cards surfaced yet'
                            : 'No results yet',
                        body: trimmed.isEmpty
                            ? 'Cards will appear here as the public explore catalog loads.'
                            : 'Try another search term, set code, or collector number.',
                      ),
                    ),
                  )
                else
                  SliverList.separated(
                    itemCount: rows.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 2),
                    itemBuilder: (context, index) {
                      final row = rows[index];
                      if (row is _CatalogHeaderRow) {
                        return _CatalogSectionHeader(row.title);
                      } else if (row is _CatalogCardRow) {
                        final card = row.card;
                        return _CatalogCardTile(
                          card: card,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => CardDetailScreen(
                                  cardPrintId: card.id,
                                  gvId: (card.gvId ?? '').isEmpty
                                      ? null
                                      : card.gvId,
                                  name: card.name,
                                  setName: card.displaySet,
                                  setCode: card.setCode.isEmpty
                                      ? null
                                      : card.setCode,
                                  number: card.displayNumber,
                                  rarity: (card.rarity ?? '').isEmpty
                                      ? null
                                      : card.rarity,
                                  imageUrl: card.displayImage,
                                ),
                              ),
                            );
                          },
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: _buildCompareWorkspaceEntry(theme),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                  sliver: SliverToBoxAdapter(
                    child: _buildFeaturedSetsSurface(theme),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _thumb(String? url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) return const CircleAvatar(child: Icon(Icons.style));
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(child: Icon(Icons.broken_image)),
      ),
    );
  }
}

class _MyWallTab extends StatefulWidget {
  const _MyWallTab({required this.onOpenBySlug, super.key});

  final Future<void> Function() onOpenBySlug;

  @override
  State<_MyWallTab> createState() => _MyWallTabState();
}

class _MyWallTabState extends State<_MyWallTab> {
  final SupabaseClient _client = Supabase.instance.client;
  bool _loading = true;
  bool _loadFailed = false;
  PublicCollectorEntryState _entryState =
      PublicCollectorEntryState.missingProfile;
  String? _slug;
  int _contentVersion = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    final userId = _client.auth.currentUser?.id ?? '';
    if (mounted) {
      setState(() {
        _loading = true;
        _loadFailed = false;
      });
    }

    try {
      final entry = await PublicCollectorService.resolveOwnEntry(
        client: _client,
        userId: userId,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _entryState = entry.state;
        _slug = entry.slug;
        _loading = false;
        _loadFailed = false;
        _contentVersion++;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _loadFailed = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_loadFailed) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          _ProductEmptyState(
            title: 'Unable to load My Wall',
            body: 'Try again in a moment.',
          ),
        ],
      );
    }

    if (_entryState == PublicCollectorEntryState.ready &&
        _slug != null &&
        _slug!.isNotEmpty) {
      return PublicCollectorScreen(
        key: ValueKey('my-wall-${_slug!}-$_contentVersion'),
        slug: _slug!,
        showAppBar: false,
      );
    }

    final unavailableTitle =
        _entryState == PublicCollectorEntryState.unavailable
        ? 'My Wall is not public right now'
        : 'My Wall is not ready yet';
    final unavailableBody = _entryState == PublicCollectorEntryState.unavailable
        ? 'Your public profile or vault sharing is turned off, so the public wall cannot be shown here.'
        : 'Your account does not have a public collector slug yet.';

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          _ProductSurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  unavailableTitle,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  unavailableBody,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withOpacity(0.72),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton(
                    onPressed: widget.onOpenBySlug,
                    child: const Text('Open by slug'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// ---------------------- VAULT PAGE (uses view + catalog picker) ----------------------
class VaultPage extends StatefulWidget {
  const VaultPage({super.key});

  @override
  VaultPageState createState() => VaultPageState();
}

class VaultPageState extends State<VaultPage> {
  final supabase = Supabase.instance.client;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];
  String _search = '';
  _SortBy _sortBy = _SortBy.newest;
  _VaultStructuralView _view = _VaultStructuralView.all;

  @override
  void initState() {
    super.initState();
    _uid = supabase.auth.currentUser?.id;
    reload();
  }

  Future<void> reload() async {
    if (_uid == null) {
      setState(() => _items = const []);
      return;
    }
    setState(() => _loading = true);
    try {
      final rows = await VaultCardService.getCanonicalCollectorRows(
        client: supabase,
      );

      if (_sortBy == _SortBy.name) {
        rows.sort(
          (a, b) => (a['name'] ?? '').toString().compareTo(
            (b['name'] ?? '').toString(),
          ),
        );
      } else {
        rows.sort((a, b) {
          final aTs = DateTime.tryParse(
            (a['created_at'] ?? '').toString(),
          )?.millisecondsSinceEpoch;
          final bTs = DateTime.tryParse(
            (b['created_at'] ?? '').toString(),
          )?.millisecondsSinceEpoch;
          return (bTs ?? -1).compareTo(aTs ?? -1);
        });
      }

      setState(() => _items = rows);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _incQty(Map<String, dynamic> row, int delta) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardId = (row['card_id'] ?? '').toString();
    if (_uid == null || vaultItemId.isEmpty || cardId.isEmpty) return;

    if (delta > 0) {
      await VaultCardService.addOrIncrementVaultItem(
        client: supabase,
        userId: _uid!,
        cardId: cardId,
        deltaQty: delta,
        conditionLabel: (row['condition_label'] ?? 'NM').toString(),
        fallbackName: (row['name'] ?? '').toString(),
        fallbackSetName: (row['set_name'] ?? '').toString(),
        fallbackImageUrl: (row['photo_url'] ?? row['image_url'])?.toString(),
      );
    } else {
      await VaultCardService.archiveOneVaultItem(
        client: supabase,
        userId: _uid!,
        vaultItemId: vaultItemId,
        cardId: cardId,
      );
    }

    await reload();
  }

  Future<void> _delete(Map<String, dynamic> row) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardId = (row['card_id'] ?? '').toString();
    if (_uid == null || vaultItemId.isEmpty || cardId.isEmpty) return;

    await VaultCardService.archiveAllVaultItems(
      client: supabase,
      userId: _uid!,
      vaultItemId: vaultItemId,
      cardId: cardId,
    );

    await reload();
  }

  void startIdentityScanFlow() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const IdentityScanScreen()));
  }

  /// NEW: Add uses the internal catalog picker
  Future<void> showAddOrEditDialog({Map<String, dynamic>? row}) async {
    if (row == null) {
      await _showCatalogPickerAndInsert();
    } else {
      // (Optional) could open an edit dialog; for now, keep qty/cond editing inline
      // or reuse your previous edit dialog if you prefer.
    }
  }

  Future<void> _showCatalogPickerAndInsert() async {
    final picked = await showModalBottomSheet<CardPrint>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CatalogPicker(),
    );
    if (picked == null || _uid == null) return;

    final qtyCtrl = TextEditingController(text: '1');
    final subtitleParts = <String>[];
    if (picked.displaySet.isNotEmpty) subtitleParts.add(picked.displaySet);
    if (picked.displayNumber.isNotEmpty)
      subtitleParts.add('#${picked.displayNumber}');
    final subtitle = subtitleParts.join(' - ');

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add to Vault'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: _thumb(picked.displayImage),
              title: Text(picked.name),
              subtitle: Text(subtitle.isEmpty ? picked.displaySet : subtitle),
            ),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    final qty = int.tryParse(qtyCtrl.text) ?? 1;

    await VaultCardService.addOrIncrementVaultItem(
      client: supabase,
      userId: _uid!,
      cardId: picked.id,
      deltaQty: qty,
      conditionLabel: 'NM',
      fallbackName: picked.name,
      fallbackSetName: picked.displaySet,
      fallbackImageUrl: picked.displayImage,
    );

    await reload();
  }

  List<Map<String, dynamic>> _sortedRows(List<Map<String, dynamic>> rows) {
    final sorted = [...rows];

    if (_sortBy == _SortBy.name) {
      sorted.sort(
        (a, b) => (a['name'] ?? '').toString().compareTo(
          (b['name'] ?? '').toString(),
        ),
      );
      return sorted;
    }

    if (_sortBy == _SortBy.qty) {
      sorted.sort(
        (a, b) => _ownedCountForRow(a).compareTo(_ownedCountForRow(b)),
      );
      return sorted;
    }

    sorted.sort((a, b) {
      final aTs = DateTime.tryParse(
        (a['created_at'] ?? '').toString(),
      )?.millisecondsSinceEpoch;
      final bTs = DateTime.tryParse(
        (b['created_at'] ?? '').toString(),
      )?.millisecondsSinceEpoch;
      return (bTs ?? -1).compareTo(aTs ?? -1);
    });
    return sorted;
  }

  List<Map<String, dynamic>> _applySearch(List<Map<String, dynamic>> rows) {
    final query = _search.trim().toLowerCase();
    if (query.isEmpty) {
      return rows;
    }

    return rows.where((row) {
      final name = (row['name'] ?? '').toString().toLowerCase();
      final setName = (row['set_name'] ?? '').toString().toLowerCase();
      final setCode = (row['set_code'] ?? '').toString().toLowerCase();
      final number = (row['number'] ?? '').toString().toLowerCase();
      return name.contains(query) ||
          setName.contains(query) ||
          setCode.contains(query) ||
          number.contains(query);
    }).toList();
  }

  String _lastAddedLabel(List<Map<String, dynamic>> rows) {
    final latest = rows
        .map((row) => DateTime.tryParse((row['created_at'] ?? '').toString()))
        .whereType<DateTime>()
        .fold<DateTime?>(null, (current, value) {
          if (current == null || value.isAfter(current)) {
            return value;
          }
          return current;
        });

    if (latest == null) {
      return 'No cards yet';
    }

    final age = DateTime.now().difference(latest);
    if (age.inMinutes < 1) {
      return 'just now';
    }
    if (age.inMinutes < 60) {
      return '${age.inMinutes}m ago';
    }
    if (age.inHours < 24) {
      return '${age.inHours}h ago';
    }
    if (age.inDays < 7) {
      return '${age.inDays}d ago';
    }

    return '${latest.month}/${latest.day}/${latest.year}';
  }

  List<_VaultSetGroup> _groupRowsBySet(List<Map<String, dynamic>> rows) {
    final buckets = <String, List<Map<String, dynamic>>>{};

    for (final row in rows) {
      final title = ((row['set_name'] ?? row['set_code']) ?? '')
          .toString()
          .trim();
      final key = title.isEmpty ? 'Unknown set' : title;
      buckets.putIfAbsent(key, () => <Map<String, dynamic>>[]).add(row);
    }

    return buckets.entries
        .map((entry) => _VaultSetGroup(title: entry.key, rows: entry.value))
        .toList()
      ..sort((a, b) => a.title.compareTo(b.title));
  }

  Widget _buildVaultList(List<Map<String, dynamic>> rows) {
    if (rows.isEmpty) {
      return _ProductEmptyState(
        title: 'No cards found in your vault',
        body: _search.trim().isEmpty
            ? 'Your structural vault shell is in place. Add cards or switch views to keep building it out.'
            : 'Try a different search term or clear the current query.',
      );
    }

    return Column(
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          _buildVaultTile(rows[index]),
          if (index < rows.length - 1) const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _buildVaultBySet(List<_VaultSetGroup> groups) {
    if (groups.isEmpty) {
      return const _ProductEmptyState(
        title: 'No set groups yet',
        body:
            'Set grouping will appear here once matching rows are available for this view.',
      );
    }

    return Column(
      children: [
        for (var index = 0; index < groups.length; index++) ...[
          _ProductSurfaceCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ProductSectionHeading(
                  title: groups[index].title,
                  description: 'Grouped vault rows for this set.',
                  trailing: Text(
                    '${groups[index].rows.length}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _buildVaultList(groups[index].rows),
              ],
            ),
          ),
          if (index < groups.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _buildVaultTile(Map<String, dynamic> row) {
    final vaultItemId = _vaultItemIdForRow(row);
    final name = (row['name'] ?? 'Item').toString();
    final set = (row['set_name'] ?? '').toString();
    final ownedCount = _ownedCountForRow(row);
    final cond = (row['condition_label'] ?? 'NM').toString();
    final gvId = (row['gv_id'] ?? '').toString();
    final cardPrintId = (row['card_id'] ?? '').toString();

    return _VaultItemTile(
      row: row,
      onScan: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                ScanCaptureScreen(vaultItemId: vaultItemId, cardName: name),
          ),
        );
      },
      onIncrement: () => _incQty(row, 1),
      onDecrement: () => _incQty(row, -1),
      onDelete: () async {
        final ok = await _confirmDelete(row);
        if (ok) await reload();
      },
      onTap: cardPrintId.isEmpty
          ? null
          : () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CardDetailScreen(
                    cardPrintId: cardPrintId,
                    gvId: gvId.isEmpty ? null : gvId,
                    name: name,
                    setName: set,
                    number: (row['number'] ?? '').toString(),
                    imageUrl: (row['photo_url'] ?? row['image_url']).toString(),
                    quantity: ownedCount,
                    condition: cond,
                  ),
                ),
              );
            },
    );
  }

  Widget _buildRecentVaultStrip(List<Map<String, dynamic>> rows) {
    if (rows.isEmpty) {
      return const _ProductEmptyState(
        title: 'No recently added items yet',
        body: 'New additions will appear here after you scan or add cards.',
      );
    }

    final recentRows = [...rows];
    recentRows.sort((a, b) {
      final aTs = DateTime.tryParse(
        (a['created_at'] ?? '').toString(),
      )?.millisecondsSinceEpoch;
      final bTs = DateTime.tryParse(
        (b['created_at'] ?? '').toString(),
      )?.millisecondsSinceEpoch;
      return (bTs ?? -1).compareTo(aTs ?? -1);
    });

    return SizedBox(
      height: 170,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: recentRows.length.clamp(0, 10) as int,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final row = recentRows[index];
          final cardPrintId = (row['card_id'] ?? '').toString();
          final gvId = (row['gv_id'] ?? '').toString();
          final name = (row['name'] ?? 'Item').toString();
          final setName = ((row['set_name'] ?? row['set_code']) ?? '')
              .toString()
              .trim();
          final imageUrl = (row['photo_url'] ?? row['image_url']).toString();

          return SizedBox(
            width: 140,
            child: Material(
              color: Theme.of(
                context,
              ).colorScheme.surfaceContainerHighest.withOpacity(0.45),
              borderRadius: BorderRadius.circular(20),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: cardPrintId.isEmpty
                    ? null
                    : () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CardDetailScreen(
                              cardPrintId: cardPrintId,
                              gvId: gvId.isEmpty ? null : gvId,
                              name: name,
                              setName: setName,
                              number: (row['number'] ?? '').toString(),
                              imageUrl: imageUrl,
                              quantity: _ownedCountForRow(row),
                              condition: (row['condition_label'] ?? 'NM')
                                  .toString(),
                            ),
                          ),
                        );
                      },
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: imageUrl.isEmpty
                              ? Container(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.surfaceContainerHighest,
                                  child: const Center(child: Icon(Icons.style)),
                                )
                              : Image.network(
                                  imageUrl,
                                  fit: BoxFit.cover,
                                  width: double.infinity,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.surfaceContainerHighest,
                                    child: const Center(
                                      child: Icon(Icons.broken_image),
                                    ),
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        setName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withOpacity(0.68),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildVaultViewChip(_VaultStructuralView view, String label) {
    return ChoiceChip(
      label: Text(label),
      selected: _view == view,
      onSelected: (_) {
        setState(() {
          _view = view;
        });
      },
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sortedRows = _sortedRows(_items);
    final searchedRows = _applySearch(sortedRows);
    final duplicateRows = searchedRows
        .where((row) => _ownedCountForRow(row) > 1)
        .toList();
    final recentRows = [...searchedRows]
      ..sort((a, b) {
        final aTs = DateTime.tryParse(
          (a['created_at'] ?? '').toString(),
        )?.millisecondsSinceEpoch;
        final bTs = DateTime.tryParse(
          (b['created_at'] ?? '').toString(),
        )?.millisecondsSinceEpoch;
        return (bTs ?? -1).compareTo(aTs ?? -1);
      });
    final bySetGroups = _groupRowsBySet(searchedRows);
    final totalCards = _items.fold<int>(
      0,
      (sum, row) => sum + _ownedCountForRow(row),
    );
    final setCount = _items
        .map(
          (row) =>
              ((row['set_name'] ?? row['set_code']) ?? '').toString().trim(),
        )
        .where((value) => value.isNotEmpty)
        .toSet()
        .length;

    late final Widget vaultContent;
    switch (_view) {
      case _VaultStructuralView.all:
        vaultContent = _loading
            ? const Center(child: CircularProgressIndicator())
            : _buildVaultList(searchedRows);
        break;
      case _VaultStructuralView.duplicates:
        vaultContent = _loading
            ? const Center(child: CircularProgressIndicator())
            : _buildVaultList(duplicateRows);
        break;
      case _VaultStructuralView.recent:
        vaultContent = _loading
            ? const Center(child: CircularProgressIndicator())
            : _buildVaultList(recentRows);
        break;
      case _VaultStructuralView.bySet:
        vaultContent = _loading
            ? const Center(child: CircularProgressIndicator())
            : _buildVaultBySet(bySetGroups);
        break;
      case _VaultStructuralView.onWall:
        vaultContent = const _ProductEmptyState(
          title: 'No wall rows in Flutter yet',
          body:
              'The On Wall segment is part of the web vault structure and stays present here until later data wiring lands.',
        );
        break;
      case _VaultStructuralView.pokemon:
        vaultContent = const _ProductEmptyState(
          title: 'Pokemon grouping is not wired yet',
          body:
              'The Pokemon vault segment is part of the web baseline and will be filled in after later Flutter data wiring.',
        );
        break;
    }

    return RefreshIndicator(
      onRefresh: reload,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(label: Text('$totalCards cards')),
              Chip(label: Text('${_items.length} unique')),
              Chip(label: Text('$setCount sets')),
              Chip(label: Text('Last added ${_lastAddedLabel(_items)}')),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search your vault...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (value) => setState(() => _search = value),
                ),
              ),
              const SizedBox(width: 10),
              PopupMenuButton<_SortBy>(
                icon: const Icon(Icons.sort),
                onSelected: (value) {
                  setState(() => _sortBy = value);
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: _SortBy.newest, child: Text('Newest')),
                  PopupMenuItem(value: _SortBy.name, child: Text('Name (A-Z)')),
                  PopupMenuItem(
                    value: _SortBy.qty,
                    child: Text('Qty (low-high)'),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildVaultViewChip(_VaultStructuralView.all, 'All Cards'),
                const SizedBox(width: 8),
                _buildVaultViewChip(_VaultStructuralView.onWall, 'On Wall'),
                const SizedBox(width: 8),
                _buildVaultViewChip(
                  _VaultStructuralView.duplicates,
                  'Duplicates',
                ),
                const SizedBox(width: 8),
                _buildVaultViewChip(_VaultStructuralView.recent, 'Recent'),
                const SizedBox(width: 8),
                _buildVaultViewChip(_VaultStructuralView.bySet, 'By Set'),
                const SizedBox(width: 8),
                _buildVaultViewChip(_VaultStructuralView.pokemon, 'Pokemon'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          vaultContent,
          const SizedBox(height: 18),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Recently Added',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              _buildRecentVaultStrip(_items),
            ],
          ),
        ],
      ),
    );
  }

  Future<bool> _confirmDelete(Map<String, dynamic> row) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete item?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) await _delete(row);
    return ok ?? false;
  }

  Widget _chip(String cond) {
    final color = switch (cond) {
      'NM' => Colors.green,
      'LP' => Colors.lightGreen,
      'MP' => Colors.orange,
      'HP' => Colors.deepOrange,
      'DMG' => Colors.red,
      _ => Colors.grey,
    };
    return Chip(
      label: Text(cond),
      visualDensity: VisualDensity.compact,
      backgroundColor: color.withOpacity(.15),
      side: BorderSide(color: color.withOpacity(.6)),
    );
  }

  Widget _thumb(dynamic url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) return const CircleAvatar(child: Icon(Icons.style));
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(child: Icon(Icons.broken_image)),
      ),
    );
  }
}

enum _SortBy { newest, name, qty }

enum _VaultStructuralView { all, onWall, duplicates, recent, bySet, pokemon }

class _VaultSetGroup {
  const _VaultSetGroup({required this.title, required this.rows});

  final String title;
  final List<Map<String, dynamic>> rows;
}

int _ownedCountForRow(Map<String, dynamic> row) {
  final ownedCount = _intValue(row['owned_count']);
  return ownedCount ?? 0;
}

String _vaultItemIdForRow(Map<String, dynamic> row) {
  final vaultItemId = (row['vault_item_id'] ?? '').toString();
  if (vaultItemId.isNotEmpty) {
    return vaultItemId;
  }

  return (row['id'] ?? '').toString();
}

int? _intValue(dynamic value) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  if (value == null) {
    return null;
  }

  return int.tryParse(value.toString());
}

/// ---------------------- Catalog Picker (bottom sheet) ----------------------
class _CatalogPicker extends StatefulWidget {
  @override
  State<_CatalogPicker> createState() => _CatalogPickerState();
}

class _CatalogPickerState extends State<_CatalogPicker> {
  final supabase = Supabase.instance.client;
  final _q = TextEditingController();
  List<CardPrint> _rows = const [];
  CardSearchResolverMeta? _resolverMeta;
  bool _loading = false;
  String? _searchError;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _fetch('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  Future<void> _fetch(String query) async {
    setState(() => _loading = true);
    try {
      final resolved = await CardPrintRepository.searchCardPrintsResolved(
        client: supabase,
        options: CardSearchOptions(query: query),
      );
      setState(() {
        _rows = resolved.rows;
        _resolverMeta = resolved.meta;
        _searchError = null;
      });
    } catch (error) {
      setState(() {
        _rows = const [];
        _resolverMeta = null;
        _searchError = error is Error ? error.toString() : 'Search failed.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onChanged(String s) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _fetch(s.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets;
    final grouped = <_CatalogRow>[];
    String? lastSet;
    for (final card in _rows) {
      final setTitle = card.displaySet;
      if (setTitle != lastSet) {
        lastSet = setTitle;
        grouped.add(_CatalogHeaderRow(setTitle));
      }
      grouped.add(_CatalogCardRow(card));
    }

    return Padding(
      padding: EdgeInsets.only(bottom: padding.bottom),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              height: 4,
              width: 36,
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: _CatalogSearchField(
                controller: _q,
                onChanged: _onChanged,
                onSubmitted: _fetch,
              ),
            ),
            if (_searchError != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    _searchError!,
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: Colors.red),
                  ),
                ),
              ),
            _ResolverStatusBanner(meta: _resolverMeta, query: _q.text),
            const SizedBox(height: 8),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.all(8),
                itemCount: grouped.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (context, i) {
                  final row = grouped[i];
                  if (row is _CatalogHeaderRow) {
                    return _CatalogSectionHeader(row.title);
                  }
                  final card = (row as _CatalogCardRow).card;
                  return _CatalogCardTile(
                    card: card,
                    onTap: () => Navigator.pop(context, card),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _thumb(String? url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) return const CircleAvatar(child: Icon(Icons.style));
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(child: Icon(Icons.broken_image)),
      ),
    );
  }
}
