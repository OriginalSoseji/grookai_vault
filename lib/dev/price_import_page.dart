// lib/dev/price_import_page.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../tools/price_importer.dart';

class PriceImportPage extends StatefulWidget {
  const PriceImportPage({super.key});
  @override
  State<PriceImportPage> createState() => _PriceImportPageState();
}

class _PriceImportPageState extends State<PriceImportPage> {
  final _logs = <String>[];
  bool _busy = false;
  String _source = 'tcgdex'; // or 'cardmarket'
  final _setCtrl = TextEditingController();

  void _append(String m) {
    if (!mounted) return;
    // Ensure we update only when the widget is alive
    setState(() => _logs.add(m));
  }

  Future<void> _runAll() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final importer = PriceImporter(Supabase.instance.client);
      await importer.importAllSets(source: _source, log: _append);
      _append('=== DONE ($_source) ===');
    } catch (e) {
      _append('ERROR: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _runOne() async {
    final code = _setCtrl.text.trim();
    if (code.isEmpty || _busy) return;
    setState(() => _busy = true);
    try {
      final importer = PriceImporter(Supabase.instance.client);
      final total = await importer.importSet(
        code,
        source: _source,
        log: _append,
      );
      _append('-- $code total: $total');
    } catch (e) {
      _append('ERROR: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _setCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Price Importer (Dev)')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _source,
                    items: const [
                      DropdownMenuItem(
                        value: 'tcgdex',
                        child: Text('TCGplayer (USD)'),
                      ),
                      DropdownMenuItem(
                        value: 'cardmarket',
                        child: Text('Cardmarket (EUR)'),
                      ),
                    ],
                    onChanged: _busy
                        ? null
                        : (v) => setState(() => _source = v ?? 'tcgdex'),
                    decoration: const InputDecoration(labelText: 'Source'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _setCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Set code (optional)',
                      hintText: 'e.g., sv6',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _runOne,
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Import One Set'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy ? null : _runAll,
                    icon: const Icon(Icons.all_inclusive),
                    label: const Text('Import ALL Sets'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Logs',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Theme.of(context).dividerColor),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ListView.builder(
                  itemCount: _logs.length,
                  itemBuilder: (_, i) => Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 6,
                    ),
                    child: Text(_logs[i]),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
