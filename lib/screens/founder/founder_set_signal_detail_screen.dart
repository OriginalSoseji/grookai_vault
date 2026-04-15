import 'package:flutter/material.dart';

import '../../services/network/founder_insight_service.dart';
import 'founder_card_signal_detail_screen.dart';

class FounderSetSignalDetailScreen extends StatefulWidget {
  const FounderSetSignalDetailScreen({super.key, required this.previewRow});

  final FounderInsightSetRow previewRow;

  @override
  State<FounderSetSignalDetailScreen> createState() =>
      _FounderSetSignalDetailScreenState();
}

class _FounderSetSignalDetailScreenState
    extends State<FounderSetSignalDetailScreen> {
  bool _loading = true;
  String? _error;
  FounderSetSignalDrilldown? _drilldown;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final setCode = widget.previewRow.setCode;
    if (setCode == null || setCode.trim().isEmpty) {
      setState(() {
        _loading = false;
        _error =
            'This set does not have a canonical code available for drilldown.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final drilldown = await FounderInsightService.fetchSetDrilldown(setCode);
      if (!mounted) {
        return;
      }
      setState(() {
        _drilldown = drilldown;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = 'Unable to load the founder set drilldown right now.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = _drilldown;
    final identity = detail?.set;
    final title =
        identity?.setName ?? widget.previewRow.setName ?? 'Set Signal';

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            tooltip: 'Refresh drilldown',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 18),
            children: [
              _FounderSetHero(
                setName: title,
                setCode: identity?.setCode ?? widget.previewRow.setCode,
                reason: widget.previewRow.reason,
              ),
              const SizedBox(height: 12),
              if (_loading && detail == null)
                const _FounderSetSectionCard(
                  title: 'Loading set drilldown...',
                  child: _FounderSetLoadingBody(),
                )
              else if (_error != null && detail == null)
                _FounderSetSectionCard(
                  title: 'Unable to load drilldown',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _error!,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: _load,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              else if (detail != null) ...[
                _FounderSetSectionCard(
                  title: 'Current Context',
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _FounderSetValuePill(
                        label: 'Active wants',
                        value: '${detail.current.activeWants}',
                      ),
                      _FounderSetValuePill(
                        label: 'Cards with signal',
                        value: '${detail.current.cardsWithSignal}',
                      ),
                      _FounderSetValuePill(
                        label: 'Momentum score',
                        value: '${detail.metrics7d.total}',
                        emphasize: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _FounderSetSectionCard(
                  title: '7d vs 30d Signal',
                  child: Column(
                    children: [
                      _FounderSetMetricTrendRow(
                        label: 'Opens',
                        sevenDay: detail.metrics7d.opens,
                        thirtyDay: detail.metrics30d.opens,
                        delta: detail.deltas.opens,
                      ),
                      _FounderSetMetricTrendRow(
                        label: 'Adds',
                        sevenDay: detail.metrics7d.adds,
                        thirtyDay: detail.metrics30d.adds,
                        delta: detail.deltas.adds,
                      ),
                      _FounderSetMetricTrendRow(
                        label: 'Comments',
                        sevenDay: detail.metrics7d.comments,
                        thirtyDay: detail.metrics30d.comments,
                        delta: detail.deltas.comments,
                      ),
                      _FounderSetMetricTrendRow(
                        label: 'Want On',
                        sevenDay: detail.metrics7d.wantOn,
                        thirtyDay: detail.metrics30d.wantOn,
                        delta: detail.deltas.want,
                        isLast: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _FounderSetSectionCard(
                  title: 'Why This Set Matters',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: detail.summaryLines
                        .map((line) => _FounderSetSummaryLine(text: line))
                        .toList(growable: false),
                  ),
                ),
                const SizedBox(height: 12),
                _FounderSetSectionCard(
                  title: 'Top Drivers in This Set',
                  child: detail.topDrivers.isEmpty
                      ? Text(
                          'Not enough recent signal yet.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        )
                      : Column(
                          children: [
                            for (
                              var index = 0;
                              index < detail.topDrivers.length;
                              index++
                            ) ...[
                              if (index > 0) const SizedBox(height: 10),
                              _FounderSetTopCardRow(
                                row: detail.topDrivers[index],
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) =>
                                          FounderCardSignalDetailScreen(
                                            previewRow:
                                                detail.topDrivers[index],
                                          ),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ],
                        ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _FounderSetHero extends StatelessWidget {
  const _FounderSetHero({
    required this.setName,
    required this.setCode,
    required this.reason,
  });

  final String setName;
  final String? setCode;
  final String reason;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 72,
            height: 72,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Text(
              (setCode ?? 'SET').toUpperCase(),
              textAlign: TextAlign.center,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w800,
                color: colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  setName,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                if ((setCode ?? '').isNotEmpty)
                  _FounderSetValuePill(
                    label: 'Set',
                    value: setCode!.toUpperCase(),
                  ),
                if (reason.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    reason,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.74),
                      height: 1.35,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FounderSetSectionCard extends StatelessWidget {
  const _FounderSetSectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _FounderSetMetricTrendRow extends StatelessWidget {
  const _FounderSetMetricTrendRow({
    required this.label,
    required this.sevenDay,
    required this.thirtyDay,
    required this.delta,
    this.isLast = false,
  });

  final String label;
  final int sevenDay;
  final int thirtyDay;
  final int delta;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
      margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(
                bottom: BorderSide(
                  color: colorScheme.outline.withValues(alpha: 0.08),
                ),
              ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          _FounderSetMiniMetric(label: '7d', value: sevenDay),
          const SizedBox(width: 8),
          _FounderSetMiniMetric(label: '30d', value: thirtyDay),
          const SizedBox(width: 8),
          _FounderSetDeltaBadge(value: delta),
        ],
      ),
    );
  }
}

class _FounderSetMiniMetric extends StatelessWidget {
  const _FounderSetMiniMetric({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 58,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.64),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '$value',
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _FounderSetDeltaBadge extends StatelessWidget {
  const _FounderSetDeltaBadge({required this.value});

  final int value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final positive = value > 0;
    final negative = value < 0;
    final background = positive
        ? Colors.green.withValues(alpha: 0.12)
        : negative
        ? colorScheme.error.withValues(alpha: 0.12)
        : colorScheme.surfaceContainerHighest.withValues(alpha: 0.42);
    final foreground = positive
        ? Colors.green.shade800
        : negative
        ? colorScheme.error
        : colorScheme.onSurface.withValues(alpha: 0.72);

    return Container(
      width: 68,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _setSigned(value),
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w800,
          color: foreground,
        ),
      ),
    );
  }
}

class _FounderSetValuePill extends StatelessWidget {
  const _FounderSetValuePill({
    required this.label,
    required this.value,
    this.emphasize = false,
  });

  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: emphasize
            ? colorScheme.primary.withValues(alpha: 0.1)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(999),
      ),
      child: RichText(
        text: TextSpan(
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
          children: [
            TextSpan(
              text: '$label ',
              style: TextStyle(
                color: colorScheme.onSurface.withValues(alpha: 0.66),
              ),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}

class _FounderSetTopCardRow extends StatelessWidget {
  const _FounderSetTopCardRow({required this.row, required this.onTap});

  final FounderInsightCardRow row;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final breakdownText = _topDriverBreakdownText(row);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 64,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: (row.preferredImageUrl ?? '').isEmpty
                    ? Icon(
                        Icons.image_not_supported_outlined,
                        color: colorScheme.onSurface.withValues(alpha: 0.4),
                      )
                    : Image.network(
                        row.preferredImageUrl!,
                        fit: BoxFit.cover,
                        cacheWidth: 180,
                        errorBuilder: (context, error, stackTrace) => Icon(
                          Icons.image_not_supported_outlined,
                          color: colorScheme.onSurface.withValues(alpha: 0.4),
                        ),
                      ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      breakdownText.isNotEmpty ? breakdownText : row.reason,
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(height: 1.35),
                    ),
                    if (row.recommendation == 'understocked') ...[
                      const SizedBox(height: 6),
                      _FounderSetValuePill(
                        label: 'Bring',
                        value: 'Understocked',
                        emphasize: true,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _FounderSetValuePill(
                label: 'Score',
                value: '${row.score}',
                emphasize: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FounderSetSummaryLine extends StatelessWidget {
  const _FounderSetSummaryLine({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: colorScheme.primary,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}

class _FounderSetLoadingBody extends StatelessWidget {
  const _FounderSetLoadingBody();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const LinearProgressIndicator(minHeight: 3),
        const SizedBox(height: 12),
        Text(
          'Pulling founder-only set momentum detail from the private backend surface.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

String _setSigned(int value) {
  if (value > 0) {
    return '+$value';
  }
  return '$value';
}

String _topDriverBreakdownText(FounderInsightCardRow row) {
  final wants =
      row.signalBreakdown['want'] ?? row.signalBreakdown['wantsCurrent'] ?? 0;
  final opens =
      row.signalBreakdown['open'] ?? row.signalBreakdown['opens7d'] ?? 0;
  final adds = row.signalBreakdown['add'] ?? row.signalBreakdown['adds7d'] ?? 0;
  final comments =
      row.signalBreakdown['comments'] ?? row.signalBreakdown['comments7d'] ?? 0;

  final parts = <String>[];
  if (wants > 0) {
    parts.add('$wants ${wants == 1 ? 'want' : 'wants'}');
  }
  if (opens > 0) {
    parts.add('$opens ${opens == 1 ? 'open' : 'opens'}');
  }
  if (adds > 0) {
    parts.add('$adds ${adds == 1 ? 'add' : 'adds'}');
  }
  if (comments > 0) {
    parts.add('$comments ${comments == 1 ? 'comment' : 'comments'}');
  }

  return parts.join(' · ');
}
