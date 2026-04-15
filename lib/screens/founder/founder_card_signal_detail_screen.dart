import 'package:flutter/material.dart';

import '../../services/network/founder_insight_service.dart';

class FounderCardSignalDetailScreen extends StatefulWidget {
  const FounderCardSignalDetailScreen({super.key, required this.previewRow});

  final FounderInsightCardRow previewRow;

  @override
  State<FounderCardSignalDetailScreen> createState() =>
      _FounderCardSignalDetailScreenState();
}

class _FounderCardSignalDetailScreenState
    extends State<FounderCardSignalDetailScreen> {
  bool _loading = true;
  String? _error;
  FounderCardSignalDrilldown? _drilldown;

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
      final drilldown = await FounderInsightService.fetchCardDrilldown(
        widget.previewRow.cardPrintId,
      );
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
        _error = 'Unable to load the founder card drilldown right now.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = _drilldown;
    final identity = detail?.card;
    final title = identity?.name ?? widget.previewRow.name;

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
              _FounderCardHero(
                imageUrl:
                    identity?.preferredImageUrl ??
                    widget.previewRow.preferredImageUrl,
                name: title,
                setName: identity?.setName ?? widget.previewRow.setName,
                setCode: identity?.setCode ?? widget.previewRow.setCode,
                number: identity?.number ?? widget.previewRow.number,
              ),
              const SizedBox(height: 12),
              if (_loading && detail == null)
                const _FounderLoadingCard(
                  title: 'Loading card drilldown...',
                  body:
                      'Pulling founder-only signal detail from the private backend surface.',
                )
              else if (_error != null && detail == null)
                _FounderMessageCard(
                  title: 'Unable to load drilldown',
                  body: _error!,
                  actionLabel: 'Retry',
                  onAction: _load,
                )
              else if (detail != null) ...[
                _FounderSectionCard(
                  title: 'Why This Card Matters',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ...((detail.insightSummary.isNotEmpty
                              ? detail.insightSummary
                              : detail.summaryLines.take(2))
                          .map((line) => _FounderSummaryLine(text: line))),
                      if (detail.recommendation == 'understocked') ...[
                        const SizedBox(height: 4),
                        const _FounderRecommendationBanner(
                          text:
                              'Likely understocked based on current demand vs visible ownership.',
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        'Signal Breakdown',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _FounderValuePill(
                            label: 'Wants',
                            value: '${detail.current.activeWants}',
                          ),
                          _FounderValuePill(
                            label: 'Opens (7d)',
                            value: '${detail.metrics7d.opens}',
                          ),
                          _FounderValuePill(
                            label: 'Adds (7d)',
                            value: '${detail.metrics7d.adds}',
                          ),
                          _FounderValuePill(
                            label: 'Comments (7d)',
                            value: '${detail.metrics7d.comments}',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _FounderSectionCard(
                  title: 'Current Demand vs Supply',
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _FounderValuePill(
                        label: 'Active wants',
                        value: '${detail.current.activeWants}',
                      ),
                      _FounderValuePill(
                        label: 'Active owners',
                        value: '${detail.current.activeOwners}',
                      ),
                      _FounderValuePill(
                        label: 'Demand gap',
                        value: _signed(detail.current.demandSupplyGap),
                        emphasize: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _FounderSectionCard(
                  title: '7d vs 30d Signal',
                  child: Column(
                    children: [
                      _FounderMetricTrendRow(
                        label: 'Opens',
                        sevenDay: detail.metrics7d.opens,
                        thirtyDay: detail.metrics30d.opens,
                        delta: detail.deltas.opens,
                      ),
                      _FounderMetricTrendRow(
                        label: 'Adds',
                        sevenDay: detail.metrics7d.adds,
                        thirtyDay: detail.metrics30d.adds,
                        delta: detail.deltas.adds,
                      ),
                      _FounderMetricTrendRow(
                        label: 'Comments',
                        sevenDay: detail.metrics7d.comments,
                        thirtyDay: detail.metrics30d.comments,
                        delta: detail.deltas.comments,
                      ),
                      _FounderMetricTrendRow(
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
                _FounderSectionCard(
                  title: 'Previous 7d Context',
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _FounderValuePill(
                        label: 'Prev opens',
                        value: '${detail.previous7d.opens}',
                      ),
                      _FounderValuePill(
                        label: 'Prev adds',
                        value: '${detail.previous7d.adds}',
                      ),
                      _FounderValuePill(
                        label: 'Prev comments',
                        value: '${detail.previous7d.comments}',
                      ),
                      _FounderValuePill(
                        label: 'Prev want on',
                        value: '${detail.previous7d.wantOn}',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                _FounderSectionCard(
                  title: 'Trend Notes',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: detail.summaryLines
                        .map((line) => _FounderSummaryLine(text: line))
                        .toList(growable: false),
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

class _FounderCardHero extends StatelessWidget {
  const _FounderCardHero({
    required this.imageUrl,
    required this.name,
    required this.setName,
    required this.setCode,
    required this.number,
  });

  final String? imageUrl;
  final String name;
  final String? setName;
  final String? setCode;
  final String? number;

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
            width: 88,
            height: 122,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.48,
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: (imageUrl ?? '').isEmpty
                ? Icon(
                    Icons.image_not_supported_outlined,
                    color: colorScheme.onSurface.withValues(alpha: 0.38),
                  )
                : Image.network(
                    imageUrl!,
                    fit: BoxFit.cover,
                    cacheWidth: 260,
                    errorBuilder: (context, error, stackTrace) => Icon(
                      Icons.image_not_supported_outlined,
                      color: colorScheme.onSurface.withValues(alpha: 0.38),
                    ),
                  ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                if ((setName ?? '').isNotEmpty)
                  Text(
                    setName!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.74),
                    ),
                  ),
                if ((setCode ?? '').isNotEmpty ||
                    (number ?? '').isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if ((setCode ?? '').isNotEmpty)
                        _FounderValuePill(
                          label: 'Set',
                          value: setCode!.toUpperCase(),
                        ),
                      if ((number ?? '').isNotEmpty)
                        _FounderValuePill(label: 'Number', value: '#$number'),
                    ],
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

class _FounderSectionCard extends StatelessWidget {
  const _FounderSectionCard({required this.title, required this.child});

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

class _FounderMetricTrendRow extends StatelessWidget {
  const _FounderMetricTrendRow({
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
          _FounderMiniMetric(label: '7d', value: sevenDay),
          const SizedBox(width: 8),
          _FounderMiniMetric(label: '30d', value: thirtyDay),
          const SizedBox(width: 8),
          _FounderDeltaBadge(value: delta),
        ],
      ),
    );
  }
}

class _FounderMiniMetric extends StatelessWidget {
  const _FounderMiniMetric({required this.label, required this.value});

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

class _FounderDeltaBadge extends StatelessWidget {
  const _FounderDeltaBadge({required this.value});

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
      width: 82,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _deltaLabel(value),
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w800,
          color: foreground,
        ),
      ),
    );
  }
}

class _FounderRecommendationBanner extends StatelessWidget {
  const _FounderRecommendationBanner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.12)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.inventory_2_outlined, color: colorScheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FounderValuePill extends StatelessWidget {
  const _FounderValuePill({
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

class _FounderSummaryLine extends StatelessWidget {
  const _FounderSummaryLine({required this.text});

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

class _FounderLoadingCard extends StatelessWidget {
  const _FounderLoadingCard({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return _FounderSectionCard(
      title: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LinearProgressIndicator(minHeight: 3),
          const SizedBox(height: 12),
          Text(body, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _FounderMessageCard extends StatelessWidget {
  const _FounderMessageCard({
    required this.title,
    required this.body,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String body;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return _FounderSectionCard(
      title: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(body, style: Theme.of(context).textTheme.bodyMedium),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}

String _signed(int value) {
  if (value > 0) {
    return '+$value';
  }
  return '$value';
}

String _deltaLabel(int value) {
  if (value > 0) {
    return 'Up $value';
  }
  if (value < 0) {
    return 'Down ${value.abs()}';
  }
  return 'Flat';
}
