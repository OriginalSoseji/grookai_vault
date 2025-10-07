import 'package:flutter/material.dart';

class LivePricingPage extends StatelessWidget {
  const LivePricingPage({super.key});

  @override
  Widget build(BuildContext context) {
    // NOTE: Scaffold must NOT be const because AppBar isn't const.
    return Scaffold(
      appBar: AppBar(title: const Text("Live Pricing")),
      body: const Center(child: Text("Live pricing coming soon")),
    );
  }
}


