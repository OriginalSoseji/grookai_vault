import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../models/binders/binder_grid_layout.dart';

class BinderGridSizeSheet extends StatelessWidget {
  const BinderGridSizeSheet({super.key, required this.selected});
  final BinderGridLayout selected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      top: false,
      child: SizedBox(
        height: math.min(MediaQuery.sizeOf(context).height * .8, 550),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 4, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Grid size',
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close grid sizes',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Text(
                'Columns × rows per page. Your card order stays the same.',
                style: theme.textTheme.bodySmall,
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [
                  for (final layout in BinderGridLayout.values) ...[
                    Semantics(
                      selected: selected == layout,
                      child: OutlinedButton(
                        key: ValueKey('binder-grid-${layout.storageKey}'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(80),
                          padding: const EdgeInsets.all(12),
                          side: BorderSide(
                            color: selected == layout
                                ? theme.colorScheme.primary
                                : theme.colorScheme.outlineVariant,
                            width: selected == layout ? 2 : 1,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onPressed: () => Navigator.pop(context, layout),
                        child: Row(
                          children: [
                            ExcludeSemantics(
                              child: SizedBox(
                                width: 44,
                                height: 48,
                                child: Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      for (
                                        var row = 0;
                                        row < layout.rows;
                                        row++
                                      )
                                        Padding(
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 1.5,
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              for (
                                                var column = 0;
                                                column < layout.columns;
                                                column++
                                              )
                                                Container(
                                                  width: 7,
                                                  height: 8,
                                                  margin:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 1.5,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: selected == layout
                                                        ? theme
                                                              .colorScheme
                                                              .primary
                                                        : theme
                                                              .colorScheme
                                                              .onSurfaceVariant,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          1.5,
                                                        ),
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(layout.label),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${layout.pockets} pockets · ${layout.columns} columns, ${layout.rows} rows',
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(
                              selected == layout
                                  ? Icons.check_circle_rounded
                                  : Icons.radio_button_unchecked_rounded,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 9),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
