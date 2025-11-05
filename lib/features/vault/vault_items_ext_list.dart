import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/features/pricing/price_tiers_page.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/widgets/list_cell.dart';
import 'package:grookai_vault/services/listings_api.dart';

class VaultItemsExtList extends StatefulWidget {
  const VaultItemsExtList({super.key});

  @override
  State<VaultItemsExtList> createState() => _VaultItemsExtListState();
}

class _VaultItemsExtListState extends State<VaultItemsExtList> {
  final supa = Supabase.instance.client;

  // Keep it simple so we compile & run. You can wire your real data later.
  List<Map<String, dynamic>> _rows = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    // Optional: comment out if your view isn't ready yet
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      // Replace this query with your real source if needed
      final data = await supa
          .from('v_recently_added') // TODO: change to your real view/table
          .select('name,set_code,number,created_at')
          .order('created_at', ascending: false)
          .limit(25);
      _rows = List<Map<String, dynamic>>.from(data as List);
    } catch (_) {
      _rows = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showTiers(Map<String, dynamic> r) async {
    final name = (r['name'] ?? 'Card').toString();
    final setCode = (r['set_code'] ?? '').toString();
    final number = (r['number'] ?? '').toString();

    // Async navigation OUTSIDE setState (fixes your crash)
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            PriceTiersPage(name: name, setCode: setCode, number: number),
      ),
    );

    if (!mounted) return;
    setState(() {
      // Refresh if you want to reload the list after returning
      // _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    debugPrint(
      '[UI] VaultItemsExtList build (rows=${_rows.length}, loading=$_loading)',
    );
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_rows.isEmpty) {
      return const Center(child: Text('No items yet'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(GVSpacing.s8),
      itemCount: _rows.length,
      separatorBuilder: (context, _) => const SizedBox(height: GVSpacing.s8),
      itemBuilder: (context, i) {
        final r = _rows[i];
        final title = (r['name'] ?? 'Card').toString();
        final sub = (r['set_code'] ?? '').toString();
        final vaultItemId = (r['vault_item_id'] ?? '').toString();
        return ListCell(
          title: Text(title),
          subtitle: Text(sub),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (vaultItemId.isNotEmpty)
                IconButton(
                  tooltip: 'Post to Wall',
                  icon: const Icon(Icons.campaign_outlined),
                  onPressed: () => _showQuickPostSheet(context, r),
                ),
              if (vaultItemId.isNotEmpty)
                IconButton(
                  tooltip: 'Create Listing',
                  icon: const Icon(Icons.add_photo_alternate_outlined),
                  onPressed: () {
                    Navigator.of(context).pushNamed(
                      RouteNames.createListing,
                      arguments: {
                        'vaultItemId': vaultItemId,
                        'cardName': title,
                      },
                    );
                  },
                ),
              const Icon(Icons.chevron_right),
            ],
          ),
          onTap: () => _showTiers(r),
        );
      },
    );
  }

  void _showQuickPostSheet(BuildContext context, Map<String, dynamic> row) {
    final vaultItemId = (row['vault_item_id'] ?? '').toString();
    if (vaultItemId.isEmpty) return;
    final qtyCtl = TextEditingController(text: '1');
    final priceCtl = TextEditingController();
    final noteCtl = TextEditingController();
    bool useVaultImage = true;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Post to Public Wall', style: Theme.of(ctx).textTheme.titleMedium),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: TextField(controller: priceCtl, decoration: const InputDecoration(labelText: 'Price (cents)'), keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                SizedBox(width: 96, child: TextField(controller: qtyCtl, decoration: const InputDecoration(labelText: 'Qty'), keyboardType: TextInputType.number)),
              ]),
              const SizedBox(height: 8),
              TextField(controller: noteCtl, decoration: const InputDecoration(labelText: 'Note (optional)')),
              const SizedBox(height: 8),
              StatefulBuilder(builder: (ctx2, setSt) {
                return CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: useVaultImage,
                  onChanged: (v) => setSt(() => useVaultImage = v ?? true),
                  title: const Text('Use vault image'),
                );
              }),
              const SizedBox(height: 8),
              Row(
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Cancel'),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () async {
                      final qty = int.tryParse(qtyCtl.text.trim());
                      final price = int.tryParse(priceCtl.text.trim());
                      if (qty == null || qty <= 0 || price == null || price < 0) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid price and quantity')));
                        return;
                      }
                      try {
                        final api = GVListingsApi();
                        await api.postFromVault(
                          vaultItemId,
                          priceCents: price,
                          quantity: qty,
                          note: noteCtl.text,
                          useVaultImage: useVaultImage,
                        );
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Posted to Wall')));
                        Navigator.of(ctx).pop();
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Post failed: $e')));
                      }
                    },
                    child: const Text('Post'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
