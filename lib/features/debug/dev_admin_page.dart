import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:convert';

class DevAdminPage extends StatefulWidget {
  const DevAdminPage({super.key});
  @override
  State<DevAdminPage> createState() => _DevAdminPageState();
}

class _DevAdminPageState extends State<DevAdminPage> {
  final supabase = Supabase.instance.client;
  bool _busy = false;
  bool _dryRun = false;
  String _log = '';

  Future<void> _runCheckSets() async {
    setState(() {
      _busy = true;
      _log = '';
    });
    try {
      final body = {'fix': !_dryRun, 'fixMode': 'both', 'throttleMs': 200};
      final res = await supabase.functions.invoke('check-sets', body: body);
      setState(() {
        _log = const JsonEncoder.withIndent('  ').convert(res.data);
      });
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('check-sets completed')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('check-sets failed: $e')));
    } finally {
      if (mounted)
        setState(() {
          _busy = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dev Admin')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Switch(
                  value: _dryRun,
                  onChanged: (v) => setState(() => _dryRun = v),
                ),
                const SizedBox(width: 8),
                const Text('Dry run (no imports)'),
              ],
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _busy ? null : _runCheckSets,
              icon: const Icon(Icons.build),
              label: Text(_busy ? 'Running…' : 'Run check-sets (fixMode=both)'),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: Text(_log.isEmpty ? 'Logs will appear here.' : _log),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
