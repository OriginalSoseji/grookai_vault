import 'package:flutter/material.dart';
import '../../widgets/big_card_image.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/tokens/radius.dart';
import 'package:grookai_vault/ui/widgets/condition_badge.dart';

class CardDetailPage extends StatelessWidget {
  final Map row;
  const CardDetailPage({super.key, required this.row});

  @override
  Widget build(BuildContext context) {
    final title = row['name'] ?? 'Card Detail';
    final setCode = row['set_code'] ?? '';
    final number = row['number'] ?? '';

    return Scaffold(
      appBar: AppBar(title: Text(title, overflow: TextOverflow.ellipsis)),
      body: ListView(
        padding: const EdgeInsets.all(GVSpacing.s16),
        children: [
          // Use the shared BigCardImage widget
          BigCardImage(row: row),
          const SizedBox(height: GVSpacing.s16),

          Builder(
            builder: (context) {
              final gv = GVTheme.of(context);
              return Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: gv.typography.title.copyWith(
                        fontWeight: FontWeight.w700,
                        color: gv.colors.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: GVSpacing.s8),
                  if ((row['condition_label'] ?? '').toString().isNotEmpty)
                    ConditionBadge(
                      condition: (row['condition_label'] ?? '').toString(),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: GVSpacing.s8),
          Text(
            '$setCode - $number',
            style: Theme.of(context).textTheme.bodyMedium,
          ),

          const SizedBox(height: GVSpacing.s24),
          // Placeholders for additional info you may add later
          _InfoTile(label: 'Vault Value', value: '-'),
          const SizedBox(height: GVSpacing.s8),
          _InfoTile(label: 'Last Sold', value: '-'),
          const SizedBox(height: GVSpacing.s8),
          _InfoTile(label: 'Low / High', value: '- / -'),

          const SizedBox(height: GVSpacing.s24),
          FilledButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Add to Vault coming soon')),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Add to Vault'),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label;
  final String value;
  const _InfoTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: GVSpacing.s12,
        vertical: GVSpacing.s12,
      ),
      decoration: BoxDecoration(
        borderRadius: GVRadius.br12,
        color: Theme.of(
          context,
        ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: gv.typography.body.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          Text(value),
        ],
      ),
    );
  }
}
