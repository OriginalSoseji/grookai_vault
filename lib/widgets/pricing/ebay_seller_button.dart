import 'package:flutter/material.dart';
import '../../screens/ebay/ebay_seller_screen.dart';

class EbaySellerButton extends StatelessWidget {
  const EbaySellerButton({super.key, required this.instanceId});
  final String instanceId;
  @override
  Widget build(BuildContext context) {
    if (!RegExp(
      r'^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$',
    ).hasMatch(instanceId)) {
      return const SizedBox.shrink();
    }
    return TextButton.icon(
      onPressed: () => openEbaySeller(context, instanceId: instanceId),
      style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
      icon: const Icon(Icons.sell_outlined, size: 16),
      label: const Text('List on eBay'),
    );
  }
}
