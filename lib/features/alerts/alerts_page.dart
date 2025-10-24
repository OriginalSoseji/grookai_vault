import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AlertsPage extends StatefulWidget {
  const AlertsPage({super.key});
  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

class _AlertsPageState extends State<AlertsPage> {
  final _client = Supabase.instance.client;
  bool _devFallback = false;
  List<Map<String, dynamic>> _rows = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return;
      final data = await _client
          .from('alerts')
          .select('id, card_id, query, price_threshold, enabled, created_at')
          .eq('user_id', uid)
          .order('created_at');
      setState(() {
        _rows = List<Map<String, dynamic>>.from((data as List?) ?? const []);
        _devFallback = false;
      });
    } catch (_) {
      // View/table missing: dev fallback
      setState(() {
        _devFallback = true;
      });
    }
  }

  Future<void> _createAlert() async {
    final queryCtrl = TextEditingController();
    final thrCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Create Alert'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: queryCtrl,
              decoration: const InputDecoration(labelText: 'Card / Search'),
            ),
            TextField(
              controller: thrCtrl,
              decoration: const InputDecoration(labelText: 'Price threshold'),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final query = queryCtrl.text.trim();
    final thr = double.tryParse(thrCtrl.text.trim());
    if (query.isEmpty || thr == null) return;
    if (_devFallback) {
      setState(() {
        _rows.add({
          'id': 'dev_${DateTime.now().millisecondsSinceEpoch}',
          'query': query,
          'price_threshold': thr,
          'enabled': true,
          'dev': true,
        });
      });
      return;
    }
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return;
      await _client.from('alerts').insert({
        'user_id': uid,
        'query': query,
        'price_threshold': thr,
        'enabled': true,
      });
      await _load();
    } catch (_) {
      if (!context.mounted) return;
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Failed to create alert')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Alerts${_devFallback ? ' [DEV]' : ''}')),
      floatingActionButton: FloatingActionButton(
        onPressed: _createAlert,
        child: const Icon(Icons.add_alert),
      ),
      body: ListView.separated(
        itemCount: _rows.length,
        separatorBuilder: (_, i) => const Divider(height: 1),
        itemBuilder: (_, i) {
          final r = _rows[i];
          final q = (r['query'] ?? '').toString();
          final thr = (r['price_threshold'] ?? '').toString();
          final en = (r['enabled'] ?? true) == true;
          return ListTile(
            leading: const Icon(Icons.notifications),
            title: Text(q.isEmpty ? (r['card_id'] ?? 'Card').toString() : q),
            subtitle: Text('Threshold: $thr'),
            trailing: Switch(
              value: en,
              onChanged: (v) async {
                if (_devFallback) {
                  setState(() {
                    _rows[i]['enabled'] = v;
                  });
                  return;
                }
                try {
                  await _client
                      .from('alerts')
                      .update({'enabled': v})
                      .eq('id', r['id']);
                  setState(() {
                    _rows[i]['enabled'] = v;
                  });
                } catch (_) {}
              },
            ),
          );
        },
      ),
    );
  }
}
