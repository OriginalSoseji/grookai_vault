import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/gvvi/vendor_pricing_workspace_service.dart';
import '../../services/sales/sales_card_reference.dart';

class SalesVendorPrice extends StatelessWidget {
  const SalesVendorPrice({super.key, required this.copy});
  final VendorPricingWorkspaceRow copy;

  @override
  Widget build(BuildContext context) => Text(
    copy.askingPrice == null
        ? 'Your price: not set'
        : 'Your price: ${copy.currency} ${copy.askingPrice!.toStringAsFixed(2)}',
    style: Theme.of(context).textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.bold,
      color: Theme.of(context).colorScheme.primary,
    ),
  );
}

class SalesTcgplayerLink extends StatelessWidget {
  const SalesTcgplayerLink({super.key, required this.reference});
  final SalesCardReference reference;

  @override
  Widget build(BuildContext context) => TextButton.icon(
    onPressed: () async {
      try {
        if (await launchUrl(
          reference.uri,
          mode: LaunchMode.externalApplication,
        )) {
          return;
        }
      } catch (_) {
        // Keep the sale draft intact if an external browser is unavailable.
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open TCGplayer. Try again.')),
        );
      }
    },
    icon: const Icon(Icons.open_in_new, size: 16),
    label: Text(reference.label),
  );
}

SalesCardReference salesCopyReference(VendorPricingWorkspaceRow copy) =>
    SalesCardReference(
      name: copy.displayName,
      setName: copy.setName,
      number: copy.number,
      productId: copy.tcgplayerProductId,
    );
