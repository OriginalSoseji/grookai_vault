import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';

class ScanHistoryPage extends StatefulWidget {
  const ScanHistoryPage({super.key});
  @override
  State<ScanHistoryPage> createState() => _ScanHistoryPageState();
}

class _ScanHistoryPageState extends State<ScanHistoryPage> {
  final supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      // If scan_events exists, fetch recent rows
      final data = await supabase
          .from('scan_events')
          .select('ts, meta')
          .order('ts', ascending: false)
          .limit(50);
      final list = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      setState(() => _rows = list);
    } catch (_) {
      setState(() => _rows = const []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan History')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(GVSpacing.s12),
              itemCount: _rows.length,
              separatorBuilder: (_, __) => const SizedBox(height: GVSpacing.s8),
              itemBuilder: (context, i) {
                final r = _rows[i];
                final meta = Map<String, dynamic>.from(r['meta'] ?? {});
                final conf = (meta['best_confidence'] ?? 0).toString();
                final type = (meta['type'] ?? '').toString();
                final usedServer = (meta['used_server'] ?? false) == true;
                final usedLazy = (meta['used_lazy'] ?? false) == true;
                final ts = (r['ts'] ?? '').toString();
                return ListTile(
                  title: Text('Confidence $conf'),
                  subtitle: Text(
                    'type=$type server=${usedServer ? 'Y' : 'N'} lazy=${usedLazy ? 'Y' : 'N'}\n$ts',
                  ),
                );
              },
            ),
    );
  }
}
