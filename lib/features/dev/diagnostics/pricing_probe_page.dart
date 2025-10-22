// DEV-ONLY: Pricing probe page
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class PricingProbePage extends StatefulWidget {
  const PricingProbePage({super.key});
  @override
  State<PricingProbePage> createState() => _PricingProbePageState();
}

class _PricingProbePageState extends State<PricingProbePage> {
  bool _loading = true;
  String _status = '';
  int _viewCount = 0;
  List<Map<String, dynamic>> _viewSample = const [];
  Map<String, dynamic>? _pricesStatus;

  @override
  void initState() {
    super.initState();
    _runProbe();
  }

  Future<void> _runProbe() async {
    setState(() { _loading = true; });
    final sb = Supabase.instance.client;
    // a) Env indicators (partial)
    final url = (dotenv.env['SUPABASE_URL'] ?? '').toString();
    final key = (dotenv.env['SUPABASE_ANON_KEY'] ?? '').toString();
    if (kDebugMode) {
      debugPrint('[PRICES] probe.env url=${url.isEmpty ? '-' : url.substring(0, (url.length>12?12:url.length))}…');
      debugPrint('[PRICES] probe.env key=${key.isEmpty ? '-' : key.substring(0, (key.length>8?8:key.length))}…');
    }

    // b) prices_status function
    try {
      final r = await sb.functions.invoke('prices_status');
      if (r.data is Map<String, dynamic>) {
        _pricesStatus = (r.data as Map<String, dynamic>);
        if (kDebugMode) debugPrint('[PRICES] probe.status ${_pricesStatus}');
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[PRICES] probe.status.error $e');
    }

    // c) Query latest_card_prices_v
    try {
      final sample = await sb.from('latest_card_prices_v').select('*').limit(5);
      _viewSample = List<Map<String, dynamic>>.from((sample as List?) ?? const []);
      _viewCount = _viewSample.length;
      if (kDebugMode) debugPrint('[PRICES] probe.view count~$_viewCount sample=${_viewSample.length}');
    } catch (e) {
      if (kDebugMode) debugPrint('[PRICES] probe.view.error $e');
    }

    setState(() { _loading = false; });
  }

  Future<void> _runUpdatePrices() async {
    final sb = Supabase.instance.client;
    try {
      final r = await sb.functions.invoke('update_prices', body: {'limit': 5});
      if (kDebugMode) debugPrint('[PRICES] update.summary ${r.data}');
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('update_prices invoked')));
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('update_prices failed')));
    }
  }

  Future<void> _enqueueOne() async {
    final sb = Supabase.instance.client;
    try {
      // Known test: adjust to a predictable set/number in your project
      final r = await sb.functions.invoke('enqueue_import', body: {
        'set_code': 'sv6', 'number': '001', 'lang': 'en'
      });
      if (kDebugMode) debugPrint('[IMPORTQ] enqueue.test ${r.data}');
      await Future.delayed(const Duration(seconds: 3));
      await _runProbe();
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('enqueue_import failed')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const Scaffold(body: Center(child: Text('Diagnostics available in debug builds only.')));
    return Scaffold(
      appBar: AppBar(title: const Text('Pricing Probe (DEV)')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _runProbe,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('Env Indicators', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text('prices_status: ${_pricesStatus ?? '-'}'),
                  const SizedBox(height: 12),
                  const Text('Latest Prices View', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text('Rows (sampled): ${_viewSample.length}'),
                  ..._viewSample.map((e) => Text('card_id=${e['card_id']} mid=${e['price_mid']} at=${e['observed_at']}')),
                  const SizedBox(height: 12),
                  const Text('Actions', style: TextStyle(fontWeight: FontWeight.bold)),
                  Wrap(spacing: 8, children: [
                    ElevatedButton(onPressed: _runUpdatePrices, child: const Text('Run update_prices (5)')),
                    ElevatedButton(onPressed: _enqueueOne, child: const Text('Import test (sv6/001)')),
                  ]),
                ],
              ),
            ),
    );
  }
}
