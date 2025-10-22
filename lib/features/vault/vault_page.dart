import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/services/vault_service.dart';
import 'package:grookai_vault/ui/widgets/condition_badge.dart';
import 'package:grookai_vault/services/image_resolver.dart';
import 'package:grookai_vault/ui/widgets/async_image.dart';
import 'package:grookai_vault/features/search/catalog_picker.dart';
import 'package:grookai_vault/features/pricing/card_price_chart_page.dart';

String _fix(String s) {
  try {
    return utf8.decode(latin1.encode(s));
  } catch (_) {
    return s;
  }
}

enum _SortBy { newest, name, qty }

class VaultPage extends StatefulWidget {
  const VaultPage({super.key});
  @override
  VaultPageState createState() => VaultPageState();
}

class VaultPageState extends State<VaultPage> {
  final supabase = Supabase.instance.client;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];
  String _search = '';
  _SortBy _sortBy = _SortBy.newest;

  @override
  void initState() {
    super.initState();
    _uid = supabase.auth.currentUser?.id;
    reload();
  }

  Future<void> reload() async {
    if (_uid == null) {
      setState(() => _items = const []);
      return;
    }
    setState(() => _loading = true);
    try {
      final orderCol = switch (_sortBy) {
        _SortBy.newest => 'created_at',
        _SortBy.name => 'name',
        _SortBy.qty => 'qty',
      };
      final ascending = _sortBy != _SortBy.newest;
      final data = await supabase
          .from('v_vault_items')
          .select(
            'id,card_id,qty,market_price,total,created_at,name,number,set_code,variant,tcgplayer_id,game,image_url,price_source,price_ts',
          )
          .eq('user_id', _uid!)
          .order(orderCol, ascending: ascending);
      setState(() => _items = List<Map<String, dynamic>>.from(data as List));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _incQty(String id, int delta) async {
    final idx = _items.indexWhere((x) => (x['id'] ?? '').toString() == id);
    final current = idx >= 0 ? (_items[idx]['qty'] ?? 0) as int : 0;
    final next = (current + delta).clamp(0, 9999);
    await VaultService(supabase).updateQty(id: id, next: next);
    await reload();
  }

  Future<void> _delete(String id) async {
    await VaultService(supabase).deleteItem(id: id);
    await reload();
  }

  Future<void> showAddOrEditDialog({Map<String, dynamic>? row}) async {
    final rootContext = context;
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const CatalogPicker(),
    );
    if (!rootContext.mounted) return;
    if (picked == null || _uid == null) return;

    final choice = await showDialog<String>(
      context: rootContext,
      builder: (_) => SimpleDialog(
        title: const Text('Add to'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, 'vault'),
            child: const Text('Vault'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, 'wishlist'),
            child: const Text('Wishlist'),
          ),
        ],
      ),
    );
    if (!rootContext.mounted) return;
    if (choice == null) return;

    if (choice == 'vault') {
      final qtyCtrl = TextEditingController(text: '1');
      final ok = await showDialog<bool>(
        context: rootContext,
        builder: (_) => AlertDialog(
          title: const Text('Quantity'),
          content: TextField(
            controller: qtyCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Qty'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Add'),
            ),
          ],
        ),
      );
      if (!rootContext.mounted) return;
      if (ok != true) return;
      final qty = int.tryParse(qtyCtrl.text) ?? 1;

      final dynamic rawId =
          picked['id'] ?? picked['card_id'] ?? picked['print_id'];
      final cardId = (rawId ?? '').toString();
      if (cardId.isEmpty) {
        if (!rootContext.mounted) return;
        ScaffoldMessenger.of(rootContext).showSnackBar(
          const SnackBar(
            content: Text(
              'Could not determine card id. Please try another result.',
            ),
          ),
        );
        return;
      }
      final vs = VaultService(supabase);
      await vs.addOrIncrement(
        cardId: cardId,
        deltaQty: qty <= 0 ? 1 : qty,
        conditionLabel: 'NM',
      );
    } else {
      final dynamic rawId =
          picked['id'] ?? picked['card_id'] ?? picked['print_id'];
      final cardId = (rawId ?? '').toString();
      if (cardId.isEmpty) {
        if (!rootContext.mounted) return;
        ScaffoldMessenger.of(rootContext).showSnackBar(
          const SnackBar(
            content: Text(
              'Could not determine card id. Please try another result.',
            ),
          ),
        );
        return;
      }
      await supabase.from('wishlist_items').upsert({
        'user_id': _uid,
        'card_id': cardId,
      }, onConflict: 'user_id,card_id');
    }

    try {
      await Supabase.instance.client.functions.invoke(
        'import-prices',
        body: {
          'setCode': picked['set_code'],
          'page': 1,
          'pageSize': 250,
          'source': 'tcgdex',
        },
      );
    } catch (_) {}

    await reload();
  }

  Future<void> _moveToWishlist(Map<String, dynamic> row) async {
    await supabase.from('wishlist_items').upsert({
      'user_id': _uid,
      'card_id': (row['card_id'] ?? '').toString(),
    }, onConflict: 'user_id,card_id');
    await supabase
        .from('vault_items')
        .delete()
        .eq('id', (row['id'] ?? '').toString());
    await reload();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _search.isEmpty
        ? _items
        : _items
              .where(
                (r) => (r['name'] ?? '').toString().toLowerCase().contains(
                  _search.toLowerCase(),
                ),
              )
              .toList();
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(GVSpacing.s8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Search in your vault',
                  ),
                  onChanged: (s) => setState(() => _search = s.trim()),
                ),
              ),
              const SizedBox(width: GVSpacing.s8),
              PopupMenuButton<_SortBy>(
                initialValue: _sortBy,
                onSelected: (v) => setState(() => _sortBy = v),
                itemBuilder: (_) => const [
                  PopupMenuItem(value: _SortBy.newest, child: Text('Newest')),
                  PopupMenuItem(value: _SortBy.name, child: Text('Name')),
                  PopupMenuItem(value: _SortBy.qty, child: Text('Qty')),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView.separated(
                  padding: const EdgeInsets.all(GVSpacing.s8),
                  itemCount: filtered.length,
                  separatorBuilder: (context, _) =>
                      const SizedBox(height: GVSpacing.s8),
                  itemBuilder: (context, index) {
                    final row = filtered[index];
                    final id = (row['id'] ?? '').toString();
                    final name = (row['name'] ?? 'Item').toString();
                    final setCode = (row['set_name'] ?? '').toString();
                    final number = (row['number'] ?? '').toString();
                    final qty = (row['qty'] ?? 0) as int;
                    final cond = (row['condition_label'] ?? 'NM').toString();
                    final mp = (row['market_price'] ?? 0) as num;
                    final url = imageUrlFromRow(row);

                    final tile = ListTile(
                      leading: AsyncImage(url, width: 44, height: 44),
                      title: Text(
                        _fix(name),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        children: [
                          if (setCode.isNotEmpty)
                            Builder(
                              builder: (context) {
                                final gv = GVTheme.of(context);
                                return Text(
                                  setCode,
                                  style: TextStyle(
                                    color: gv.colors.textSecondary,
                                  ),
                                );
                              },
                            ),
                          Text('#$number'),
                          ConditionBadge(condition: cond),
                          Text('Qty: $qty'),
                          if (mp > 0) Text('· \$${mp.toStringAsFixed(2)} ea'),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: 'Live',
                            icon: const Icon(Icons.show_chart_rounded),
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => CardPriceChartPage(
                                  setCode: setCode,
                                  number: number,
                                ),
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.remove),
                            onPressed: () => _incQty(id, -1),
                          ),
                          Text(
                            '$qty',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: () => _incQty(id, 1),
                          ),
                          PopupMenuButton<String>(
                            onSelected: (v) {
                              if (v == 'delete') _delete(id);
                              if (v == 'move_wishlist') _moveToWishlist(row);
                            },
                            itemBuilder: (_) => const [
                              PopupMenuItem(
                                value: 'move_wishlist',
                                child: Text('Move to Wishlist'),
                              ),
                              PopupMenuItem(
                                value: 'delete',
                                child: Text('Delete'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );

                    return Dismissible(
                      key: ValueKey(id),
                      background: Container(
                        color: GVTheme.of(context).colors.danger,
                        alignment: Alignment.centerLeft,
                        padding: const EdgeInsets.only(left: 16),
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      secondaryBackground: Container(
                        color: GVTheme.of(context).colors.danger,
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 16),
                        child: const Icon(Icons.delete, color: Colors.white),
                      ),
                      confirmDismiss: (_) async => await _confirmDelete(id),
                      child: Card(child: tile),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Future<bool> _confirmDelete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete item?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) await _delete(id);
    return ok ?? false;
  }
}
