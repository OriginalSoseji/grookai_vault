import 'package:flutter/material.dart';

class VaultQuickAction {
  const VaultQuickAction({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool destructive;
}

Future<void> showVaultQuickActionSheet({
  required BuildContext context,
  required String title,
  String? subtitle,
  required List<VaultQuickAction> actions,
}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (sheetContext) {
      final theme = Theme.of(sheetContext);
      final colorScheme = theme.colorScheme;
      final mediaQuery = MediaQuery.of(sheetContext);

      return SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: mediaQuery.size.height * 0.86),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (subtitle != null && subtitle.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle.trim(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.64),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                for (final action in actions)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      action.icon,
                      color: action.destructive
                          ? colorScheme.error
                          : colorScheme.onSurface,
                    ),
                    title: Text(
                      action.label,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: action.destructive
                            ? colorScheme.error
                            : colorScheme.onSurface,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    enabled: action.onPressed != null,
                    onTap: action.onPressed == null
                        ? null
                        : () {
                            Navigator.of(sheetContext).pop();
                            action.onPressed!();
                          },
                  ),
              ],
            ),
          ),
        ),
      );
    },
  );
}
