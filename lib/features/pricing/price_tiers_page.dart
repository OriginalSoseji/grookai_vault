import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/price_service.dart';

class PriceTiersPage extends StatefulWidget {
  final String setCode;
  final String number;
  final String name;
  const PriceTiersPage({
    super.key,
    required this.setCode,
    required this.number,
    required this.name,
  });

  @override
  State<PriceTiersPage> createState() => _PriceTiersPageState();
}

class _PriceTiersPageState extends State<PriceTiersPage> {
  final svc = PriceService(Supabase.instance.client);
  Map<String, dynamic>? _priceRow;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final row = await svc.latestPrice(
      setCode: widget.setCode,
      number: widget.number,
    );
    if (!mounted) return;
    setState(() {
      _priceRow = row;
      _loading = false;
    });
    if (row == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'No pricing found for ${widget.setCode}/${widget.number}.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(widget.name)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_loading) const Center(child: CircularProgressIndicator()),
            if (!_loading && _priceRow == null)
              const Text('No price found for this print.'),
            if (!_loading && _priceRow != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: DefaultTextStyle(
                    style: theme.textTheme.bodyLarge!,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Latest Price', style: theme.textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text("price_usd: \$"),
                        Text('source    : ${_priceRow!['source']}'),
                        Text(
                          'observed  : ${_priceRow!['observed_at']}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            const Spacer(),
            FilledButton.icon(
              onPressed: (_priceRow != null)
                  ? () async {
                      final user = Supabase.instance.client.auth.currentUser;
                      if (user == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Sign in required')),
                        );
                        return;
                      }
                      try {
                        await Supabase.instance.client
                            .from('user_vault')
                            .insert({
                              'user_id': user.id,
                              'set_code': widget.setCode.toLowerCase(),
                              'number': widget.number,
                              'acquired_price': _priceRow!['price_usd'],
                              'source': 'app',
                            });
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Added to Vault')),
                        );
                      } catch (e) {
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Add failed: $e')),
                        );
                      }
                    }
                  : null,
              icon: const Icon(Icons.add),
              label: const Text('Add to Vault'),
            ),
          ],
        ),
      ),
    );
  }
}
