import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class DevHealthPage extends StatefulWidget {
  const DevHealthPage({super.key});
  @override
  State<DevHealthPage> createState() => _DevHealthPageState();
}

class _DevHealthPageState extends State<DevHealthPage> {
  bool _loading = true;
  Map<String, dynamic>? _status;
  List<Map<String, dynamic>> _errors = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final client = Supabase.instance.client;
    setState(() => _loading = true);
    try {
      Map<String, dynamic>? status;
      try {
        final r = await client.functions.invoke('prices_status');
        if (r.data is Map<String, dynamic>)
          status = (r.data as Map<String, dynamic>);
      } catch (_) {}
      List<Map<String, dynamic>> errors = const [];
      try {
        final data = await client
            .from('price_error_log')
            .select('set_code,number,lang,error_text,observed_at')
            .order('observed_at', ascending: false)
            .limit(10);
        errors = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      } catch (_) {}
      setState(() {
        _status = status;
        _errors = errors;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode)
      return const Scaffold(
        body: Center(
          child: Text('Dev Health is available in debug builds only.'),
        ),
      );
    final envs = {
      'GV_SEARCH_SOURCE': dotenv.env['GV_SEARCH_SOURCE'] ?? 'db',
      'GV_LAZY_OVERLAY': dotenv.env['GV_LAZY_OVERLAY'] ?? 'true',
      'GV_USE_LAZY_SEARCH': dotenv.env['GV_USE_LAZY_SEARCH'] ?? 'true',
    };
    return Scaffold(
      appBar: AppBar(title: const Text('Dev Health')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Price API Status',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    (_status?['ok'] == true ? 'OK' : 'Not OK') +
                        ' • reachable=${_status?['reachable']} status=${_status?['status'] ?? '-'}',
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Scheduler',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const Text(
                    'update_prices scheduled every 12h (see schedule.json)',
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Last 10 Pricing Errors',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  ..._errors.map(
                    (e) => Text(
                      '${e['observed_at']}: ${e['set_code']}/${e['number']} [${e['lang']}] ${e['error_text']}',
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Env Flags',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  ...envs.entries.map((e) => Text('${e.key}=${e.value}')),
                ],
              ),
            ),
    );
  }
}
