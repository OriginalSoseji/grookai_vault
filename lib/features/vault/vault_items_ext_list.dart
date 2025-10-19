import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/features/pricing/price_tiers_page.dart';

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
    final name    = (r['name'] ?? 'Card').toString();
    final setCode = (r['set_code'] ?? '').toString();
    final number  = (r['number'] ?? '').toString();

    // Async navigation OUTSIDE setState (fixes your crash)
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PriceTiersPage(
          name: name,
          setCode: setCode,
          number: number,
          defaultVariant: 'normal',
        ),
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
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_rows.isEmpty) {
      return const Center(child: Text('No items yet'));
    }
    return ListView.separated(
      itemCount: _rows.length,
      separatorBuilder: (context, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        final r = _rows[i];
        final title = (r['name'] ?? 'Card').toString();
        final sub   = '${(r['set_code'] ?? '').toString()} | ${(r['number'] ?? '').toString()}';
        return ListTile(
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(sub),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _showTiers(r),
        );
      },
    );
  }
}
