import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/network/founder_metrics_service.dart';

class FounderMetricsScreen extends StatefulWidget {
  const FounderMetricsScreen({super.key});

  @override
  State<FounderMetricsScreen> createState() => _FounderMetricsScreenState();
}

class _FounderMetricsScreenState extends State<FounderMetricsScreen> {
  FounderMetricsBundle? _bundle;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final bundle = await FounderMetricsService.load(
        client: Supabase.instance.client,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _bundle = bundle;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = 'Founder metrics are unavailable right now.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bundle = _bundle;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Founder Metrics'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 24),
          children: [
            _FounderMetricsHero(
              generatedAt: bundle?.generatedAt,
              latestWeek: bundle?.latestWeek,
            ),
            const SizedBox(height: 12),
            if (_loading)
              const _FounderMetricsSurface(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Center(child: CircularProgressIndicator()),
                ),
              )
            else if (_error != null)
              _FounderMetricsSurface(
                child: _FounderMetricsEmpty(
                  title: 'Unable to load metrics',
                  body: _error!,
                  action: FilledButton.icon(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Retry'),
                  ),
                ),
              )
            else if (bundle == null || bundle.latestWeek == null)
              const _FounderMetricsSurface(
                child: _FounderMetricsEmpty(
                  title: 'No weekly rollups yet',
                  body:
                      'Run the weekly E7 rollup for a completed UTC week, then reload this screen.',
                ),
              )
            else ...[
              _NorthStarPanel(bundle: bundle),
              const SizedBox(height: 12),
              _MetricListPanel(
                title: 'Interaction Breakdown',
                description:
                    'Shared E7 meaningful interaction kinds for the latest completed week.',
                rows: bundle.interactionBreakdown,
                emptyMessage: 'No meaningful interactions in this week.',
              ),
              const SizedBox(height: 12),
              _WatchesPanel(bundle: bundle),
              const SizedBox(height: 12),
              _TapThroughPanel(bundle: bundle),
              const SizedBox(height: 12),
              _OnboardingPanel(bundle: bundle),
              const SizedBox(height: 12),
              _RecommendationPanel(bundle: bundle),
              const SizedBox(height: 12),
              _HistoryPanel(bundle: bundle),
            ],
          ],
        ),
      ),
    );
  }
}

class _FounderMetricsHero extends StatelessWidget {
  const _FounderMetricsHero({
    required this.generatedAt,
    required this.latestWeek,
  });

  final DateTime? generatedAt;
  final FounderMetricsWeek? latestWeek;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final latest = latestWeek;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'FOUNDER METRICS',
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.56),
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'North Star',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            latest == null
                ? 'Founder-only weekly operating view.'
                : 'Latest completed week: ${_formatDate(latest.weekStart)}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.35,
            ),
          ),
          if (generatedAt != null) ...[
            const SizedBox(height: 8),
            Text(
              'Loaded ${_formatDateTime(generatedAt!)}',
              style: theme.textTheme.labelMedium?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.52),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _NorthStarPanel extends StatelessWidget {
  const _NorthStarPanel({required this.bundle});

  final FounderMetricsBundle bundle;

  @override
  Widget build(BuildContext context) {
    final latest = bundle.latestWeek!;
    final previous = bundle.previousWeek;

    return _FounderMetricsSurface(
      title: 'North Star',
      description: 'Meaningful interactions normalized by app-observed WAU.',
      child: Column(
        children: [
          _MetricGrid(
            metrics: [
              _MetricGridItem(
                label: 'Meaningful / WAU',
                value: _formatDecimal(latest.meaningfulInteractionsPerWau),
                detail:
                    '${_formatInt(latest.meaningfulInteractionCount)} interactions / ${_formatInt(latest.wauCount)} WAU',
                trend: previous == null
                    ? null
                    : _trendPercent(
                        latest.meaningfulInteractionsPerWau,
                        previous.meaningfulInteractionsPerWau,
                      ),
              ),
              _MetricGridItem(
                label: 'Raw interactions',
                value: _formatInt(latest.meaningfulInteractionCount),
                detail: 'Shared E7 enum',
                trend: previous == null
                    ? null
                    : _trendPercent(
                        latest.meaningfulInteractionCount.toDouble(),
                        previous.meaningfulInteractionCount.toDouble(),
                      ),
              ),
              _MetricGridItem(
                label: 'Active watches / WAU',
                value: _formatDecimal(latest.watchesPerWau),
                detail:
                    '${_formatInt(latest.activeUnmutedWatchesCount)} active watches',
                trend: previous == null
                    ? null
                    : _trendPercent(
                        latest.watchesPerWau,
                        previous.watchesPerWau,
                      ),
              ),
              _MetricGridItem(
                label: 'Events / watch',
                value: _formatDecimal(latest.eventsPerWatch),
                detail:
                    '${_formatInt(latest.watchMatchedEventCount)} watched events',
                trend: previous == null
                    ? null
                    : _trendPercent(
                        latest.eventsPerWatch,
                        previous.eventsPerWatch,
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WatchesPanel extends StatelessWidget {
  const _WatchesPanel({required this.bundle});

  final FounderMetricsBundle bundle;

  @override
  Widget build(BuildContext context) {
    final latest = bundle.latestWeek!;

    return _FounderMetricsSurface(
      title: 'Watches And Match Density',
      description: 'Active unmuted watches by subject type.',
      child: Column(
        children: [
          _MetricRows(
            rows: bundle.watchesBySubject,
            emptyMessage: 'No active unmuted watches in this rollup.',
          ),
          const SizedBox(height: 10),
          _MetricGrid(
            metrics: [
              _MetricGridItem(
                label: 'Watches / WAU',
                value: _formatDecimal(latest.watchesPerWau),
              ),
              _MetricGridItem(
                label: 'Events / watch',
                value: _formatDecimal(latest.eventsPerWatch),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TapThroughPanel extends StatelessWidget {
  const _TapThroughPanel({required this.bundle});

  final FounderMetricsBundle bundle;

  @override
  Widget build(BuildContext context) {
    return _FounderMetricsSurface(
      title: 'Notification Tap-Through',
      description:
          'Completed-week delivery health by event type and tier. Advisory only.',
      child: Column(
        children: [
          _TapThroughRows(
            title: 'Event type',
            rows: bundle.notificationByEventType,
          ),
          const SizedBox(height: 12),
          _TapThroughRows(title: 'Tier', rows: bundle.notificationByTier),
        ],
      ),
    );
  }
}

class _OnboardingPanel extends StatelessWidget {
  const _OnboardingPanel({required this.bundle});

  final FounderMetricsBundle bundle;

  @override
  Widget build(BuildContext context) {
    final latest = bundle.latestWeek!;

    return _FounderMetricsSurface(
      title: 'Onboarding Ladder',
      description: 'Users by rung from onboarding_ladder_events.',
      child: Column(
        children: [
          _MetricRows(
            rows: bundle.onboardingLadder,
            emptyMessage: 'No onboarding ladder rows in this week.',
          ),
          const SizedBox(height: 10),
          _MetricGrid(
            metrics: [
              _MetricGridItem(
                label: 'Started',
                value: _formatInt(latest.ladderStartedCount),
              ),
              _MetricGridItem(
                label: 'Owned',
                value: _formatInt(latest.ladderOwnedCount),
              ),
              _MetricGridItem(
                label: 'Wanted',
                value: _formatInt(latest.ladderWantedCount),
              ),
              _MetricGridItem(
                label: 'Followed',
                value: _formatInt(latest.ladderFollowedCount),
              ),
              _MetricGridItem(
                label: 'Completed',
                value: _formatInt(latest.ladderCompletedCount),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RecommendationPanel extends StatelessWidget {
  const _RecommendationPanel({required this.bundle});

  final FounderMetricsBundle bundle;

  @override
  Widget build(BuildContext context) {
    final rows = bundle.flaggedRecommendations.isNotEmpty
        ? bundle.flaggedRecommendations
        : bundle.recommendations;

    return _FounderMetricsSurface(
      title: 'Delivery Recommendations',
      description:
          'Flags require founder approval. E7 does not change dispatcher behavior.',
      child: rows.isEmpty
          ? const _FounderMetricsEmpty(
              title: 'No recommendation rows',
              body:
                  'Notification delivery rows will appear after a weekly rollup.',
            )
          : Column(
              children: [
                for (var index = 0; index < rows.length; index++) ...[
                  if (index > 0) const SizedBox(height: 8),
                  _RecommendationRow(row: rows[index]),
                ],
              ],
            ),
    );
  }
}

class _HistoryPanel extends StatelessWidget {
  const _HistoryPanel({required this.bundle});

  final FounderMetricsBundle bundle;

  @override
  Widget build(BuildContext context) {
    return _FounderMetricsSurface(
      title: 'Rollup History',
      description: 'Recent completed weeks from north_star_weekly_rollups.',
      child: bundle.recentWeeks.isEmpty
          ? const _FounderMetricsEmpty(
              title: 'No history',
              body: 'Weekly rollups will appear after E7 backfill.',
            )
          : Column(
              children: [
                for (
                  var index = 0;
                  index < bundle.recentWeeks.length;
                  index++
                ) ...[
                  if (index > 0) const Divider(height: 18),
                  _WeekHistoryRow(week: bundle.recentWeeks[index]),
                ],
              ],
            ),
    );
  }
}

class _MetricListPanel extends StatelessWidget {
  const _MetricListPanel({
    required this.title,
    required this.description,
    required this.rows,
    required this.emptyMessage,
  });

  final String title;
  final String description;
  final List<FounderLabeledMetric> rows;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    return _FounderMetricsSurface(
      title: title,
      description: description,
      child: _MetricRows(rows: rows, emptyMessage: emptyMessage),
    );
  }
}

class _FounderMetricsSurface extends StatelessWidget {
  const _FounderMetricsSurface({
    required this.child,
    this.title,
    this.description,
  });

  final Widget child;
  final String? title;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(
              title!,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            if (description != null) ...[
              const SizedBox(height: 4),
              Text(
                description!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.68),
                  height: 1.35,
                ),
              ),
            ],
            const SizedBox(height: 12),
          ],
          child,
        ],
      ),
    );
  }
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.metrics});

  final List<_MetricGridItem> metrics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 520 ? 2 : 1;
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final metric in metrics)
              SizedBox(
                width: (constraints.maxWidth - (columns - 1) * 8) / columns,
                child: _MetricTile(metric: metric),
              ),
          ],
        );
      },
    );
  }
}

class _MetricGridItem {
  const _MetricGridItem({
    required this.label,
    required this.value,
    this.detail,
    this.trend,
  });

  final String label;
  final String value;
  final String? detail;
  final double? trend;
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.metric});

  final _MetricGridItem metric;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final trend = metric.trend;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.32),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  metric.label.toUpperCase(),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.54),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              if (trend != null)
                Text(
                  _formatSignedPercent(trend),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: trend >= 0
                        ? colorScheme.tertiary
                        : colorScheme.error,
                    fontWeight: FontWeight.w700,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            metric.value,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0,
            ),
          ),
          if (metric.detail != null) ...[
            const SizedBox(height: 4),
            Text(
              metric.detail!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.66),
                height: 1.3,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MetricRows extends StatelessWidget {
  const _MetricRows({required this.rows, required this.emptyMessage});

  final List<FounderLabeledMetric> rows;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return _FounderMetricsEmpty(title: 'No rows', body: emptyMessage);
    }

    final maxValue = rows.fold<double>(
      1,
      (previous, row) => row.value > previous ? row.value : previous,
    );

    return Column(
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          if (index > 0) const SizedBox(height: 8),
          _MetricBarRow(
            label: rows[index].label,
            value: _formatCompactNumber(rows[index].value),
            detail: '${_formatInt(rows[index].rowCount)} rows',
            fraction: rows[index].value / maxValue,
          ),
        ],
      ],
    );
  }
}

class _TapThroughRows extends StatelessWidget {
  const _TapThroughRows({required this.title, required this.rows});

  final String title;
  final List<FounderTapThroughMetric> rows;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.55),
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        if (rows.isEmpty)
          const _FounderMetricsEmpty(
            title: 'No sends',
            body: 'No sent notifications in this category.',
          )
        else
          for (var index = 0; index < rows.length; index++) ...[
            if (index > 0) const SizedBox(height: 8),
            _MetricBarRow(
              label: rows[index].label,
              value: _formatPercent(rows[index].value),
              detail: '${_formatInt(rows[index].sentCount)} sent',
              fraction: rows[index].value,
            ),
          ],
      ],
    );
  }
}

class _MetricBarRow extends StatelessWidget {
  const _MetricBarRow({
    required this.label,
    required this.value,
    required this.detail,
    required this.fraction,
  });

  final String label;
  final String value;
  final String detail;
  final double fraction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final safeFraction = fraction.clamp(0.04, 1.0);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                value,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    minHeight: 6,
                    value: safeFraction,
                    backgroundColor: colorScheme.surface.withValues(alpha: 0.7),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                detail,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RecommendationRow extends StatelessWidget {
  const _RecommendationRow({required this.row});

  final FounderDeliveryRecommendation row;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final flagged = row.recommendation == 'digest_only_candidate';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: flagged
            ? colorScheme.tertiaryContainer.withValues(alpha: 0.38)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: flagged
              ? colorScheme.tertiary.withValues(alpha: 0.28)
              : colorScheme.outline.withValues(alpha: 0.08),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _StatusPill(
                label: _labelize(row.recommendation),
                emphasized: flagged,
              ),
              _StatusPill(label: _labelize(row.tier)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _labelize(row.eventType),
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            row.reason.isEmpty ? 'No E7 advisory action.' : row.reason,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${_formatInt(row.sentCount)} sent · ${_formatInt(row.tapCount)} tapped · ${_formatPercent(row.tapThroughRate)}',
            style: theme.textTheme.labelMedium?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.7),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _WeekHistoryRow extends StatelessWidget {
  const _WeekHistoryRow({required this.week});

  final FounderMetricsWeek week;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _formatDate(week.weekStart),
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${_formatInt(week.meaningfulInteractionCount)} interactions · ${_formatInt(week.wauCount)} WAU',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                ),
              ),
            ],
          ),
        ),
        Text(
          _formatDecimal(week.meaningfulInteractionsPerWau),
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, this.emphasized = false});

  final String label;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: emphasized
            ? colorScheme.tertiaryContainer.withValues(alpha: 0.7)
            : colorScheme.surface.withValues(alpha: 0.64),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: emphasized
              ? colorScheme.tertiary.withValues(alpha: 0.32)
              : colorScheme.outline.withValues(alpha: 0.08),
        ),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: emphasized
              ? colorScheme.onTertiaryContainer
              : colorScheme.onSurface,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _FounderMetricsEmpty extends StatelessWidget {
  const _FounderMetricsEmpty({
    required this.title,
    required this.body,
    this.action,
  });

  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.66),
              height: 1.35,
            ),
          ),
          if (action != null) ...[const SizedBox(height: 10), action!],
        ],
      ),
    );
  }
}

String _formatInt(num value) => value.round().toString();

String _formatCompactNumber(double value) {
  if (value == value.roundToDouble()) {
    return value.round().toString();
  }
  return value.toStringAsFixed(1);
}

String _formatDecimal(double value) => value.toStringAsFixed(2);

String _formatPercent(double value) => '${(value * 100).toStringAsFixed(1)}%';

String _formatSignedPercent(double value) {
  final prefix = value > 0 ? '+' : '';
  return '$prefix${value.toStringAsFixed(1)}%';
}

double _trendPercent(double current, double previous) {
  if (previous == 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

String _formatDate(DateTime? value) {
  if (value == null) {
    return '-';
  }
  return '${value.month}/${value.day}/${value.year}';
}

String _formatDateTime(DateTime value) {
  final local = value.toLocal();
  return '${local.month}/${local.day}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

String _labelize(String value) {
  return value
      .replaceAll('_', ' ')
      .split(' ')
      .where((part) => part.isNotEmpty)
      .map(
        (part) => '${part.substring(0, 1).toUpperCase()}${part.substring(1)}',
      )
      .join(' ');
}
