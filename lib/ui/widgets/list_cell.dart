// lib/ui/widgets/list_cell.dart
import 'package:flutter/material.dart';
import '../tokens/spacing.dart';
import '../tokens/radius.dart';
import '../app/theme.dart';

class ListCell extends StatelessWidget {
  final Widget? leading;
  final Widget title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  const ListCell({super.key, this.leading, required this.title, this.subtitle, this.trailing, this.onTap});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Material(
      color: gv.colors.card,
      borderRadius: GVRadius.br12,
      child: InkWell(
        borderRadius: GVRadius.br12,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(GVSpacing.s12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (leading != null) ...[
                ClipRRect(borderRadius: GVRadius.br12, child: leading!),
                const SizedBox(width: GVSpacing.s12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DefaultTextStyle.merge(
                      style: gv.typography.body.copyWith(
                        fontWeight: FontWeight.w600,
                        color: gv.colors.textPrimary,
                      ),
                      child: title,
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: GVSpacing.s4),
                      DefaultTextStyle.merge(
                        style: gv.typography.footnote.copyWith(color: gv.colors.textSecondary),
                        child: subtitle!,
                      ),
                    ],
                  ],
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: GVSpacing.s12),
                trailing!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

