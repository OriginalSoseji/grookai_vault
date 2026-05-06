import 'package:flutter/material.dart';

class ScannerPrimaryCardTile extends StatelessWidget {
  const ScannerPrimaryCardTile({
    super.key,
    required this.candidateId,
    required this.candidateName,
    required this.setCode,
    required this.number,
    required this.locked,
    required this.accent,
  });

  final String? candidateId;
  final String? candidateName;
  final String? setCode;
  final String? number;
  final bool locked;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final title = _displayTitle();
    final meta = [
      setCode,
      number,
    ].where((value) => value != null && value.trim().isNotEmpty).join(' • ');
    final subtitle = meta.isNotEmpty
        ? meta
        : locked
        ? 'Locked match'
        : 'Best visual match';
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: DecoratedBox(
        key: ValueKey('$locked:$title'),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: accent.withValues(alpha: 0.20)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: accent.withValues(alpha: 0.15),
                  border: Border.all(color: accent.withValues(alpha: 0.28)),
                ),
                alignment: Alignment.center,
                child: locked
                    ? Icon(Icons.verified_rounded, color: accent, size: 21)
                    : Icon(
                        Icons.auto_awesome_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _displayTitle() {
    final name = candidateName?.trim() ?? '';
    if (name.isNotEmpty) return name;
    if (candidateId == null || candidateId!.isEmpty) return 'Detecting...';
    return locked ? 'Match locked' : 'Possible match';
  }
}
