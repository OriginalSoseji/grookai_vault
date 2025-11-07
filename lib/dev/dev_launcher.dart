import 'package:flutter/material.dart';
import 'scanner_dev_page.dart';

class DevLauncher extends StatelessWidget {
  const DevLauncher({super.key});
  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.build),
      onPressed: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const ScannerDevPage()),
        );
      },
    );
  }
}
