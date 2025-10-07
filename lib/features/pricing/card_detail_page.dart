import 'package:flutter/material.dart';
import '../../widgets/big_card_image.dart';

class CardDetailPage extends StatelessWidget {
  final Map row;
  const CardDetailPage({super.key, required this.row});

  @override
  Widget build(BuildContext context) {
    final title = row['name'] ?? 'Card Detail';
    final setCode = row['set_code'] ?? '';
    final number = row['number'] ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          title,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Use the shared BigCardImage widget
          BigCardImage(row: row),
          const SizedBox(height: 16),

          Text(
            title,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text('$setCode · $number',
              style: Theme.of(context).textTheme.bodyMedium),

          const SizedBox(height: 24),
          // Placeholders for additional info you may add later
          _InfoTile(label: 'Vault Value', value: '—'),
          const SizedBox(height: 8),
          _InfoTile(label: 'Last Sold', value: '—'),
          const SizedBox(height: 8),
          _InfoTile(label: 'Low / High', value: '— / —'),

          const SizedBox(height: 24),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.4),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Text(value),
        ],
      ),
    );
  }
}


