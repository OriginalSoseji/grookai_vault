import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/core/telemetry.dart';
import 'package:grookai_vault/ui/app/theme.dart';

class DevOverlay extends StatelessWidget {
  final Widget child;
  final bool show;
  const DevOverlay({super.key, required this.child, this.show = true});

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode || !show) return child;
    return Stack(
      children: [
        child,
        Positioned(
          left: 8,
          bottom: 8,
          child: Builder(builder: (context) {
            final gv = GVTheme.of(context);
            return Material(
              color: gv.colors.card.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: ValueListenableBuilder<List<String>>(
                  valueListenable: Telemetry.events,
                  builder: (_, list, ignored) {
                    final last = list.reversed.take(3).toList();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Events',
                            style: gv.typography.caption
                                .copyWith(color: gv.colors.textSecondary)),
                        for (final e in last)
                          Text(e,
                              style: gv.typography.body.copyWith(
                                  fontSize: 11,
                                  color: gv.colors.textPrimary)),
                      ],
                    );
                  },
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
