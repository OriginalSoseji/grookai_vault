import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/colors.dart';
import 'package:grookai_vault/config/flags.dart';
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
          // Neutral loading state – small dot-only if prod
          return _buildStatus(null, null, palette, prod: gvEnvStage == 'prod');
        }
        final ph = snap.data;
        if (ph == null) {
          return _buildStatus(null, null, palette, prod: gvEnvStage == 'prod', unknown: true);
        }
        final ts = ph.mvLatestObservedAt;
        final age = ph.age;
        final isStale = age == null ? true : age > widget.staleAfter;
        return _buildStatus(ts, ph.mvRows, palette, prod: gvEnvStage == 'prod', stale: isStale, theme: theme);
      },
    );
  }

  Widget _buildStatus(DateTime? ts, int? rows, GVPalette palette,
      {bool prod = false, bool stale = false, bool unknown = false, ThemeData? theme}) {
    final isUnknown = unknown || ts == null;
    final color = isUnknown
        ? (theme?.colorScheme.outline ?? palette.textSecondary)
        : (stale ? palette.warning : palette.success);

    if (prod) {
      // Minimal dot in prod with tooltip
      return Tooltip(
        message: isUnknown
            ? 'Price freshness: unknown'
            : 'Updated every ~15 min. Shows last successful refresh.'
              '\nAs of ${_fmt(ts)} (${rows ?? 0} rows)'.trim(),
        child: Icon(Icons.circle, size: 10, color: color),
      );
    }

    final text = isUnknown ? 'unknown' : _fmt(ts);
    final label = rows == null ? 'Prices as of $text' : 'Prices as of $text • $rows rows';
    return Chip(
      avatar: Icon(isUnknown ? Icons.help_outline : (stale ? Icons.schedule : Icons.check_circle),
          size: 18, color: color),
      label: Text(label),
      labelStyle: theme?.textTheme.bodySmall,
      backgroundColor: color.withValues(alpha: 0.08),
      side: BorderSide(color: color.withValues(alpha: 0.35)),
    );
  }

  String _fmt(DateTime dt) {
    final utc = dt.toUtc();
    final now = DateTime.now().toUtc();
    final diff = now.difference(utc);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${utc.year}-${_two(utc.month)}-${_two(utc.day)} ${_two(utc.hour)}:${_two(utc.minute)}Z';
  }

  String _two(int n) => n.toString().padLeft(2, '0');
}

