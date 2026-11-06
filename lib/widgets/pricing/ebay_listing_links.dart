import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/pricing/ebay_sold_search_uri.dart';

class EbayListingLinks extends StatelessWidget {
  const EbayListingLinks({
    super.key,
    required this.cardName,
    this.setName,
    this.collectorNumber,
    this.finish,
    this.outlined = false,
  });
  final String cardName;
  final String? setName, collectorNumber, finish;
  final bool outlined;

  Future<void> _open(BuildContext context, bool sold) async {
    final uri = buildEbaySearchUri(
      cardName: cardName,
      setName: setName,
      collectorNumber: collectorNumber,
      finish: finish,
      sold: sold,
    );
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw StateError('launch failed');
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open eBay. Try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (cardName.trim().isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 9,
      runSpacing: 4,
      children: [
        for (final sold in [true, false])
          if (outlined)
            OutlinedButton.icon(
              onPressed: () => _open(context, sold),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(140, 48),
                foregroundColor: Theme.of(context).colorScheme.onSurface,
              ),
              icon: const Icon(Icons.open_in_new_rounded, size: 16),
              label: Text(sold ? 'eBay sold listings' : 'Active listings'),
            )
          else
            TextButton.icon(
              onPressed: () => _open(context, sold),
              style: TextButton.styleFrom(
                minimumSize: const Size(44, 44),
                foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              icon: const Icon(Icons.open_in_new_rounded, size: 15),
              label: Text(
                sold ? 'eBay sold listings' : 'Active listings',
                style: const TextStyle(fontSize: 12),
              ),
            ),
      ],
    );
  }
}
