import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/telemetry/telemetry.dart';
import 'package:grookai_vault/telemetry/export.dart' as texport;
import 'package:grookai_vault/config/flags.dart';
import 'package:grookai_vault/ui/widgets/glow_button.dart';
import '../../services/health_service.dart';

class DiagnosticsPage extends StatefulWidget {
  const DiagnosticsPage({super.key});
  @override
  State<DiagnosticsPage> createState() => _DiagnosticsPageState();
}

class _DiagnosticsPageState extends State<DiagnosticsPage> {
  final EdgeHealth _health = EdgeHealth();
  int? wallCode, ipPost;
  bool _checking = false;

  Future<void> _runHealth() async {
    setState(() => _checking = true);
    try {
      final w = await _health.pingWallFeed();
      final p = await _health.pingImportPricesPost();
      setState(() { wallCode = w; ipPost = p; });
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _runHealth();
  }

  @override
  Widget build(BuildContext context) {
    assert(kDebugMode || kProfileMode);
    final t = AppTelemetry.I;
    final snap = t.snapshot();
    final allCodes = [wallCode, ipPost];
    final allOk = allCodes.every((c) => c == 200);
    final color = allOk ? Colors.green : (allCodes.any((c) => c == null) ? Colors.orange : Colors.red);

    return Scaffold(
      appBar: AppBar(title: const Text('Diagnostics')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Chip(label: Text('Edge: ${allOk ? 'GREEN' : (_checking ? '…' : 'AMBER/RED')}'), backgroundColor: color.withOpacity(0.2)),
              const SizedBox(width: 8),
              Text('wall_feed=${wallCode ?? '…'} import-prices(ping)=${ipPost ?? '…'}'),
              const Spacer(),
              IconButton(onPressed: _checking ? null : _runHealth, icon: const Icon(Icons.refresh)),
            ]),
            const SizedBox(height: 8),
            Text('Avg FPS (60s): ${snap.avgFps60s.toStringAsFixed(1)}'),
            const SizedBox(height: 8),
            Text('HTTP error rate (15m): ${snap.httpErrorRate15m.toStringAsFixed(3)}'),
            const SizedBox(height: 8),
            Text('Pricing freshness bins:'),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              children: snap.pricingFreshnessBins.entries
                  .map((e) => Chip(label: Text('${e.key}: ${e.value}')))
                  .toList(),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: (kUseGlowWidgets
                  ? GlowButton(
                      onPressed: () async {
                        final data = json.encode(snap.toJson());
                        final path = await texport.exportTelemetryJson(data);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Exported to $path')),
                          );
                        }
                      },
                      child: const Text('Copy JSON snapshot'),
                    )
                  : ElevatedButton(
                      onPressed: () async {
                        final data = json.encode(snap.toJson());
                        final path = await texport.exportTelemetryJson(data);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Exported to $path')),
                          );
                        }
                      },
                      child: const Text('Copy JSON snapshot'),
                    )),
            )
          ],
        ),
      ),
    );
  }
}
