import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/vault_service.dart';

class CardDetailPage extends StatefulWidget {
  final Map<String, dynamic> row;
  const CardDetailPage({super.key, required this.row});
  @override
  State<CardDetailPage> createState() => _CardDetailPageState();
}

class _CardDetailPageState extends State<CardDetailPage> {
  final _client = Supabase.instance.client;
  Map<String, dynamic>? _row;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final cardId = (widget.row['cardId'] ?? widget.row['id'] ?? '').toString();
    if (cardId.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    try {
      final data = await _client.from('v_card_search').select('*').eq('id', cardId).maybeSingle();
      if (!mounted) return;
      setState(() {
        _row = (data is Map<String, dynamic>) ? data : null;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = _row ?? widget.row;
    final img = (r['image_url'] ?? '').toString();
    final name = (r['name'] ?? 'Card').toString();
    final set = (r['set_code'] ?? '').toString();
    final num = (r['number_raw'] ?? '').toString();
    final price = (r['latest_price'] ?? '').toString();
    final cardId = (r['id'] ?? r['cardId'] ?? '').toString();
    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (img.isNotEmpty)
                  AspectRatio(
                    aspectRatio: 3 / 4,
                    child: Image.network(img, fit: BoxFit.cover),
                  ),
                const SizedBox(height: 12),
                Text('$set • $num', style: Theme.of(context).textTheme.titleMedium),
                if (price.isNotEmpty) Text('Last price: $price'),
              ],
            ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: cardId.isEmpty
                    ? null
                    : () async {
                        try {
                          final vs = VaultService(_client);
                          await vs.addToVault(cardId: cardId, condition: 'NM', qty: 1);
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to Vault')));
                        } catch (e) {
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Add failed: $e')));
                        }
                      },
                child: const Text('Add to Vault'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: cardId.isEmpty
                    ? null
                    : () => Navigator.of(context).pushNamed('/create-listing', arguments: {'cardId': cardId}),
                child: const Text('Create Listing'),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

