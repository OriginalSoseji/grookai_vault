import 'package:flutter/material.dart';

class RecentlyAddedPage extends StatelessWidget {
  const RecentlyAddedPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recently Added'),
        actions: [
          IconButton(
            tooltip: 'Vault (Effective Prices)',
            icon: const Icon(Icons.price_change),
            onPressed: () => Navigator.of(context).pushNamed('/vault-ext'),
          ),
        ],
      ),
      body: const Center(
        child: Text('Your recently added cards will show here.'),
      ),
    );
  }
}
