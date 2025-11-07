import 'dart:ui';
import 'package:flutter/material.dart';

class PricePill extends StatelessWidget {
  final String priceText; // numeric like 12.34
  final String condition;
  final String seller;
  final String? mvMidText; // like $27.50
  final String? ageText;   // like observed 2d ago

  const PricePill({
    super.key,
    required this.priceText,
    required this.condition,
    required this.seller,
    this.mvMidText,
    this.ageText,
  });

  @override
  Widget build(BuildContext context) {
    final clr = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: clr.surface.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: clr.outline.withValues(alpha: 0.2)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '\$$priceText',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(width: 8),
                  Text(condition.toUpperCase(), style: const TextStyle(letterSpacing: 1.0)),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      seller,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (mvMidText != null || ageText != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (mvMidText != null)
                        Text('MV mid ${mvMidText ?? ''}', style: TextStyle(fontSize: 11, color: clr.onSurface.withValues(alpha: 0.8))),
                      if (mvMidText != null && ageText != null)
                        Text(' • ', style: TextStyle(fontSize: 11, color: clr.onSurface.withValues(alpha: 0.5))),
                      if (ageText != null)
                        Text(ageText!, style: TextStyle(fontSize: 11, color: clr.onSurface.withValues(alpha: 0.8))),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
