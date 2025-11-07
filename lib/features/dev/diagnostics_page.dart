import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/telemetry/telemetry.dart';
import 'package:grookai_vault/telemetry/export.dart' as texport;
import 'package:grookai_vault/config/flags.dart';
import 'package:grookai_vault/ui/widgets/glow_button.dart';

class DiagnosticsPage extends StatelessWidget {
  const DiagnosticsPage({super.key});

  @override
  Widget build(BuildContext context) {
    assert(kDebugMode || kProfileMode);
    final t = AppTelemetry.I;
    final snap = t.snapshot();
    return Scaffold(
      appBar: AppBar(title: const Text('Diagnostics')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
