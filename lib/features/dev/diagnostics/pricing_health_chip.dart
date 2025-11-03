import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/colors.dart';
import 'package:grookai_vault/models/pricing_health.dart';
import 'package:grookai_vault/services/pricing_health_service.dart';

class PricesAsOfChip extends StatefulWidget {
  final SupabaseClient supabase;
  final Duration staleAfter; // default 2h
  const PricesAsOfChip({super.key, required this.supabase, this.staleAfter = const Duration(hours: 2)});

  @override
  State<PricesAsOfChip> createState() => _PricesAsOfChipState();
}

class _PricesAsOfChipState extends State<PricesAsOfChip> {
  late final PricingHealthService _svc;
  Future<PricingHealth?>? _future;

  @override
  void initState() {
    super.initState();
    _svc = PricingHealthService(widget.supabase);
    _future = _svc.fetch();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = theme.brightness == Brightness.dark ? GVPalette.dark : GVPalette.light;

    return FutureBuilder<PricingHealth?>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return Chip(label: const Text('Prices as of…'), backgroundColor: palette.card);
        }
        final ph = snap.data;
        if (ph == null) {
          return Chip(label: const Text('Prices as of: unknown'), backgroundColor: palette.warning.withOpacity(0.15));
        }
        final ts = ph.mvLatestObservedAt;
        final age = ph.age;
        final isStale = age == null ? true : age > widget.staleAfter;
        final color = isStale ? palette.warning : palette.success;
        final text = ts == null ? 'unknown' : _fmt(ts);
        final rows = ph.mvRows;

        return Chip(
          avatar: Icon(isStale ? Icons.schedule : Icons.check_circle, size: 18, color: color),
          label: Text('Prices as of $text • $rows rows'),
          labelStyle: theme.textTheme.bodySmall,
          backgroundColor: color.withOpacity(0.08),
          side: BorderSide(color: color.withOpacity(0.35)),
        );
      },
    );
  }

  String _fmt(DateTime dt) {
    final utc = dt.toUtc();
    final now = DateTime.now().toUtc();
    final diff = now.difference(utc);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${utc.year}-${_2(utc.month)}-${_2(utc.day)} ${_2(utc.hour)}:${_2(utc.minute)}Z';
  }

  String _2(int n) => n.toString().padLeft(2, '0');
}

