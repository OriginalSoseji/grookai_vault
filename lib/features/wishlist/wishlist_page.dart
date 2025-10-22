import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/services/vault_service.dart';
import 'package:grookai_vault/services/cards_service.dart';
import 'package:grookai_vault/ui/widgets/async_image.dart';
import 'package:grookai_vault/services/image_resolver.dart';
import 'package:grookai_vault/features/search/catalog_picker.dart';

String _fix(String s) { try { return utf8.decode(latin1.encode(s)); } catch (_) { return s; } }

class WishlistPage extends StatefulWidget {
  const WishlistPage({super.key});
  @override
  WishlistPageState createState() => WishlistPageState();
}

class WishlistPageState extends State<WishlistPage> {
  final supabase = Supabase.instance.client;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() {
    super.initState();
    _uid = supabase.auth.currentUser?.id;
    reload();
  }

  Future<void> reload() async {
    if (_uid == null) { setState(() => _items = const []); return; }
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('v_wishlist_items')
          .select()
          .eq('user_id', _uid!)
          .order('created_at', ascending: false);
      setState(() => _items = List<Map<String, dynamic>>.from(data as List));
    } finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> showAddOrEditDialog() async {
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const CatalogPicker(),
    );
    if (picked == null || _uid == null) return;

    final dynamic rawId = picked['id'] ?? picked['card_id'] ?? picked['print_id'];
    final cardId = (rawId ?? '').toString();
    if (cardId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not determine card id. Please try another result.')),
      );
      return;
    }

    await supabase.from('wishlist_items').upsert({
      'user_id': _uid,
      'card_id': cardId,
    }, onConflict: 'user_id,card_id');

    try {
      await Supabase.instance.client.functions.invoke('import-prices', body: {
        'setCode': picked['set_code'], 'page': 1, 'pageSize': 250, 'source': 'tcgdex',
      });
    } catch (_) {}

    await reload();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to Wishlist')));
  }

  Future<void> _moveToVault(Map<String, dynamic> row) async {
    final qtyCtrl = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Move to Vault'),
        content: TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Move')),
        ],
      ),
    );
    if (ok != true) return;
    final qty = int.tryParse(qtyCtrl.text) ?? 1;

    final cardId = (row['card_id'] ?? '').toString();
    if (cardId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Wishlist row missing card id.')));
      return;
    }
    final vs = VaultService(supabase);
    await vs.addOrIncrement(cardId: cardId, deltaQty: qty <= 0 ? 1 : qty, conditionLabel: 'NM');
    await supabase.from('wishlist_items').delete().eq('id', (row['id'] ?? '').toString());

    try {
      await Supabase.instance.client.functions.invoke('import-prices', body: {
        'setCode': (row['set_name'] ?? '').toString(), 'page': 1, 'pageSize': 250, 'source': 'tcgdex',
      });
    } catch (_) {}

    await reload();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Moved to Vault')));
  }

  Future<void> _delete(String id) async { await supabase.from('wishlist_items').delete().eq('id', id); await reload(); }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(GVSpacing.s8),
          child: Row(children: [
            Expanded(
              child: TextField(
                decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search wishlist (client-side)'),
                onChanged: (_) {},
              ),
            ),
            const SizedBox(width: GVSpacing.s8),
            FilledButton.icon(onPressed: showAddOrEditDialog, icon: const Icon(Icons.add), label: const Text('Add')),
          ]),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView.separated(
                  padding: const EdgeInsets.all(GVSpacing.s8),
                  itemCount: _items.length,
                  separatorBuilder: (context, _) => const SizedBox(height: GVSpacing.s8),
                  itemBuilder: (context, index) {
                    final r = _items[index];
                    final title = (r['name'] ?? 'Card').toString();
                    final subtitle = '${(r['set_code'] ?? '').toString()} · ${(r['number'] ?? '').toString()}';
                    final url = imageUrlFromRow(r);
                    return Card(
                      child: ListTile(
                        leading: AsyncImage(url, width: 44, height: 44),
                        title: Text(_fix(title), style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(subtitle),
                        onTap: () async {
                          final out = Map<String, dynamic>.from(r);
                          final current = (out['image_url'] ?? '').toString().trim();
                          if (current.isEmpty && url.isNotEmpty) out['image_url'] = url;

                          var id = (out['id'] ?? out['card_id'] ?? out['print_id'] ?? '').toString();
                          if (id.isEmpty) {
                            try {
                              final sc = (out['set_code'] ?? '').toString();
                              final num = (out['number'] ?? '').toString();
                              if (sc.isNotEmpty && num.isNotEmpty) {
                                final hyd = await CardsService().hydrate(setCode: sc, number: num);
                                final hid = (hyd['id'] ?? hyd['card_id'] ?? hyd['print_id'] ?? '').toString();
                                if (hid.isNotEmpty) { id = hid; out['id'] = id; final himg = (hyd['image_url'] ?? hyd['photo_url'] ?? '').toString(); if (himg.isNotEmpty) out['image_url'] = himg; }
                              }
                            } catch (_) {}
                          }
                          if (id.isEmpty) {
                            try {
                              final sc = (out['set_code'] ?? '').toString();
                              final num = (out['number'] ?? '').toString();
                              if (sc.isNotEmpty && num.isNotEmpty) {
                                final d = await supabase
                                    .from('card_prints')
                                    .select('id,image_url,image_alt_url')
                                    .eq('set_code', sc)
                                    .eq('number', num)
                                    .maybeSingle();
                                final did = (d?['id'] ?? '').toString();
                                if (did.isNotEmpty) { id = did; out['id'] = id; final img = (d?['image_url'] ?? d?['image_alt_url'] ?? '').toString(); if (img.isNotEmpty) out['image_url'] = img; }
                              }
                            } catch (_) {}
                          }
                          if (id.isEmpty) {
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not resolve this card. Try another result.')));
                            return;
                          }
                          if (!context.mounted) return;
                          Navigator.pop(context, out);
                        },
                        trailing: PopupMenuButton<String>(
                          onSelected: (v) { if (v == 'move_vault') _moveToVault(r); if (v == 'delete') _delete((r['id'] ?? '').toString()); },
                          itemBuilder: (_) => const [
                            PopupMenuItem(value: 'move_vault', child: Text('Move to Vault')),
                            PopupMenuItem(value: 'delete', child: Text('Delete')),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}








