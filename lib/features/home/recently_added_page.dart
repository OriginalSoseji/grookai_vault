import 'package:flutter/material.dart';

class RecentlyAddedPage extends StatelessWidget {
  const RecentlyAddedPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recently Added'),
        actions: [
          // NEW: opens the effective pricing list
          IconButton(
            tooltip: 'Vault (Effective Prices)',
            icon: const Icon(Icons.price_change),
            onPressed: () => Navigator.of(context).pushNamed('/vault-ext'),
          ),
        ],
      ),
      // Replace this with your real list if you already had one.
      body: const Center(child: Text('Recently added list goes here')),
    );
  }
}
