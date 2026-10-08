import 'package:flutter/material.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';

/// Displays existing terms; the caller owns freshness, review and applying them.
class SalesOfferSummary extends StatelessWidget {
  const SalesOfferSummary({
    super.key,
    required this.suggested,
    required this.agreed,
    required this.negotiated,
    required this.proposal,
  });
  final int suggested;
  final int? agreed;
  final bool negotiated;
  final Map<String, dynamic>? proposal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final unit = negotiated ? 'for this line' : 'per item';
    final noun = negotiated ? 'credit' : 'price';
    final quote = proposal?['status'] == 'available' ? proposal : null;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        type: MaterialType.transparency,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Suggested ${negotiated ? 'credit' : 'offer'}: USD ${saleMoney(suggested)} $unit',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              agreed == null
                  ? 'Enter an agreed $noun.'
                  : 'Agreed $noun: USD ${saleMoney(agreed!)} $unit',
              style: theme.textTheme.bodyLarge,
            ),
            if (agreed != null && agreed != suggested)
              Text(
                'Kept until you apply a suggestion or edit it.',
                style: theme.textTheme.bodySmall,
              ),
            if (quote != null) ...[
              const SizedBox(height: 10),
              Text(
                'Reference USD ${saleMoney(quote['referenceMinor'] as int)} × ${tradeRate(quote['rateBps'] as int)}% per item${negotiated ? ' · ${quote['quantity']} items' : ''}${quote['tierApplied'] == true ? ' · Low-value tier' : ''}',
                style: theme.textTheme.bodyMedium,
              ),
            ],
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: const EdgeInsets.only(bottom: 8),
              title: const Text('Calculation details'),
              children: [
                if (quote != null) ...[
                  Text(
                    '${negotiated ? '${quote['quantity']} item(s) · ' : ''}Calculated USD ${saleMoney(quote['calculatedMinor'] as int)} $unit · round ${quote['rounding']['mode'] == 'down' ? 'down' : 'to nearest'} USD ${saleMoney(quote['rounding']['incrementMinor'] as int)}${quote['tierApplied'] == true ? ' · Low-value tier' : ''}',
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Calculated value is shown to the nearest cent. The offer rounds the full ${negotiated ? 'line ' : ''}percentage result once.',
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  'Changing the reference${negotiated ? ', quantity' : ''} or policy keeps your agreed $noun. Use the suggestion only when you agree to it.',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
