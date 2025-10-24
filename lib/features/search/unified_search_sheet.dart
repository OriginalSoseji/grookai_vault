import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:grookai_vault/services/prices_repository.dart';

import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/widgets/list_cell.dart';
import 'package:grookai_vault/ui/widgets/price_chip.dart';
import 'package:grookai_vault/widgets/fix_card_image.dart';
import 'package:grookai_vault/services/search_gateway.dart';
import 'package:grookai_vault/services/wishlist_service.dart';
import 'package:grookai_vault/services/vault_service.dart';
import 'package:grookai_vault/config/flags.dart';
import 'package:grookai_vault/ui/app/route_names.dart';

class UnifiedSearchSheet extends StatefulWidget {
  final String? initialQuery;
  const UnifiedSearchSheet({super.key, this.initialQuery});

  static Future<void> show(BuildContext context, {String? initialQuery}) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, controller) =>
            UnifiedSearchSheet(initialQuery: initialQuery),
      ),
    );
  }

  @override
  State<UnifiedSearchSheet> createState() => _UnifiedSearchSheetState();
}

class _UnifiedSearchSheetState extends State<UnifiedSearchSheet> {
  final supabase = Supabase.instance.client;
  final _gateway = SearchGateway();
  final _wishlist = WishlistService();
  final _q = TextEditingController();
  Timer? _debounce;
  bool _loading = false;
  List<Map<String, dynamic>> _rows = const [];

  @override
  void initState() {
    super.initState();
    final iq = (widget.initialQuery ?? '').trim();
    if (iq.isNotEmpty) {
      _q.text = iq;
      _issue(iq);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  void _onChanged(String s) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => _issue(s));
  }

  Future<void> _issue(String raw) async {
    final q = raw.trim();
    if (q.isEmpty) {
      setState(() => _rows = const []);
      return;
    }
    setState(() => _loading = true);
    try {
      final r = await _gateway.search(q);
      if (!mounted) return;
      setState(() => _rows = r);
      // If async prices flag is enabled, attach prices without blocking UI.
      final flag = (dotenv.env['GV_PRICES_ASYNC'] ?? '1');
      final useAsync = flag == '1' || flag.toLowerCase() == 'true';
      if (useAsync) {
        // Fire and await internally but UI is already updated above.
        await _attachPricesAsync();
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _attachPricesAsync() async {
    // Collect ids
    final ids = _rows
        .map((r) => (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString())
        .where((s) => s.isNotEmpty)
        .toList();
    if (ids.isEmpty) return;
    // Batch in larger groups to allow incremental UI refreshes
    final client = Supabase.instance.client;
    final repo = PricesRepository(client);
    const groupSize = 60;
    final total = ids.length;
    int done = 0;
    for (var i = 0; i < ids.length; i += groupSize) {
      final group = ids.sublist(
        i,
        i + groupSize > ids.length ? ids.length : i + groupSize,
      );
      // Run repository method over the subset by filtering rows for ids in this group
      final subRows = _rows.where((r) {
        final id = (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString();
        return group.contains(id);
      }).toList();
      final mergedSubset = await repo.attachPricesToRows(subRows);
      if (!mounted) return;
      // Replace only those subset rows in _rows by id
      final byId = {
        for (final r in mergedSubset)
          (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString(): r,
      };
      final merged = _rows.map((r) {
        final id = (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString();
        return byId[id] ?? r;
      }).toList();
      done += group.length;
      if (!mounted) return;
      setState(() => _rows = merged);
      // ignore: avoid_print
      print('[PRICES] attach.progress $done / $total');
      // Yield briefly
      await Future.delayed(const Duration(milliseconds: 1));
    }
    // ignore: avoid_print
    print('[PRICES] attach.done updated=${ids.length} of ${_rows.length}');
  }

  Future<void> _addToVault(Map<String, dynamic> r) async {
    final qtyCtrl = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add to Vault'),
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
    if (ok != true) return;
    final qty = int.tryParse(qtyCtrl.text) ?? 1;
    try {
      final id = (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString();
      if (id.isEmpty) return;
      await VaultService(supabase).addOrIncrement(
        cardId: id,
        deltaQty: qty <= 0 ? 1 : qty,
        conditionLabel: 'NM',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Added to Vault')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Add failed: $e')));
    }
  }

  Future<void> _toggleWishlist(Map<String, dynamic> r) async {
    try {
      final id = (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString();
      if (id.isEmpty) return;
      final added = await _wishlist.toggle(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(added ? 'Added to wishlist' : 'Removed from wishlist'),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Wishlist action failed')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                GVSpacing.s16,
                GVSpacing.s12,
                GVSpacing.s16,
                GVSpacing.s8,
              ),
              child: TextField(
                controller: _q,
                onChanged: _onChanged,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search),
                  hintText: 'Search cards or sets',
                ),
              ),
            ),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Expanded(
              child: ListView.builder(
                itemCount: _rows.length,
                itemBuilder: (context, i) {
                  final r = _rows[i];
                  final title = (r['name'] ?? 'Card').toString();
                  final setCode = (r['set_code'] ?? '').toString();
                  final number = (r['number'] ?? '').toString();
                  final priceMid = (r['price_mid'] ?? '').toString();
                  final currency = (r['currency'] ?? 'USD').toString();
                  final sub = [
                    if (setCode.isNotEmpty) setCode,
                    if (number.isNotEmpty) number,
                  ].join(' · ');
                  return Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: GVSpacing.s8,
                      vertical: GVSpacing.s4,
                    ),
                    child: ListCell(
                      leading: FixCardImage(
                        setCode: setCode,
                        number: number,
                        width: 44,
                        height: 44,
                        fit: BoxFit.cover,
                      ),
                      title: Text(title),
                      subtitle: Text(sub),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (gvEnableWall)
                            PopupMenuButton<String>(
                              tooltip: 'More',
                              itemBuilder: (_) => const [
                                PopupMenuItem(
                                  value: 'wall',
                                  child: Text('Add to Wall'),
                                ),
                              ],
                              onSelected: (v) {
                                if (v == 'wall') {
                                  Navigator.of(context).pop();
                                  Navigator.of(context).pushNamed(
                                    RouteNames.wallCompose,
                                    arguments: r,
                                  );
                                }
                              },
                            ),
                          const SizedBox(width: GVSpacing.s8),
                          if (priceMid.isNotEmpty)
                            PriceChip(
                              label: (currency == 'USD' ? '\$' : '') + priceMid,
                            ),
                          const SizedBox(width: GVSpacing.s8),
                          IconButton(
                            tooltip: 'Wishlist',
                            icon: const Icon(Icons.favorite_border),
                            onPressed: () => _toggleWishlist(r),
                          ),
                          IconButton(
                            tooltip: 'Add to Vault',
                            icon: const Icon(Icons.add_task),
                            onPressed: () => _addToVault(r),
                          ),
                          IconButton(
                            tooltip: 'Details',
                            icon: const Icon(Icons.chevron_right),
                            onPressed: () {
                              Navigator.of(context).pop();
                              Navigator.of(
                                context,
                              ).pushNamed('/card-detail', arguments: r);
                            },
                          ),
                        ],
                      ),
                      onTap: () => Navigator.of(context).pop(r),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
