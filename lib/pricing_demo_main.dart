import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'features/pricing/live_pricing.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: 'https://ycdxbpibncqcchqiihfz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg',
  );
  runApp(const _App());
}

class _App extends StatelessWidget {
  const _App({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Grookai Vault — Pricing Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true),
      home: const PricingDemoPage(),
    );
  }
}


