import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/operations/founder_operations_service.dart';

enum _OperationsQueue { needsAction, running, failed, completed }

class FounderOperationsScreen extends StatefulWidget {
  const FounderOperationsScreen({
    this.initialWorkItemId,
    this.service,
    super.key,
  });

  final String? initialWorkItemId;
  final FounderOperationsService? service;

  @override
  State<FounderOperationsScreen> createState() =>
      _FounderOperationsScreenState();
}

class _FounderOperationsScreenState extends State<FounderOperationsScreen>
    with SingleTickerProviderStateMixin {
  late final FounderOperationsService _service =
      widget.service ??
      FounderOperationsService(client: Supabase.instance.client);
  late final TabController _tabController = TabController(
    length: 2,
    vsync: this,
  );

  FounderOperationsCounts _counts = FounderOperationsCounts.empty;
  List<FounderOperationsWorkItem> _items = const <FounderOperationsWorkItem>[];
  List<FounderOperationsAgentHealth> _agents =
      const <FounderOperationsAgentHealth>[];
  _OperationsQueue _queue = _OperationsQueue.needsAction;
  bool _loading = true;
  bool _controllingAgent = false;
  String? _error;
  bool _openedInitialItem = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String get _queueRpcValue => switch (_queue) {
    _OperationsQueue.needsAction => 'needs_action',
    _OperationsQueue.running => 'running',
    _OperationsQueue.failed => 'failed',
    _OperationsQueue.completed => 'completed',
  };

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final results = await Future.wait<dynamic>([
        _service.fetchCounts(),
        _service.fetchWorkItems(queue: _queueRpcValue),
        _service.fetchAgentHealth(),
      ]);
      if (!mounted) return;
      setState(() {
        _counts = results[0] as FounderOperationsCounts;
        _items = results[1] as List<FounderOperationsWorkItem>;
        _agents = results[2] as List<FounderOperationsAgentHealth>;
        _loading = false;
      });
      await _openInitialItemIfNeeded();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _friendlyError(error);
      });
    }
  }

  Future<void> _openInitialItemIfNeeded() async {
    final workItemId = widget.initialWorkItemId?.trim() ?? '';
    if (_openedInitialItem || workItemId.isEmpty || !mounted) return;
    _openedInitialItem = true;
    FounderOperationsWorkItem? item;
    for (final candidate in _items) {
      if (candidate.id == workItemId) {
        item = candidate;
        break;
      }
    }
    item ??= await _findWorkItem(workItemId);
    if (item == null || !mounted) return;
    await _openItem(item);
  }

  Future<FounderOperationsWorkItem?> _findWorkItem(String id) async {
    for (final queue in const [
      'needs_action',
      'running',
      'failed',
      'completed',
    ]) {
      final rows = await _service.fetchWorkItems(queue: queue, limit: 100);
      for (final row in rows) {
        if (row.id == id) return row;
      }
    }
    return null;
  }

  Future<void> _selectQueue(_OperationsQueue queue) async {
    if (_queue == queue) return;
    setState(() => _queue = queue);
    await _load();
  }

  Future<void> _openItem(FounderOperationsWorkItem item) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) =>
            FounderOperationsWorkItemScreen(item: item, service: _service),
      ),
    );
    if (changed == true) await _load();
  }

  Future<void> _controlAgent(FounderOperationsAgentHealth agent) async {
    if (_controllingAgent) return;
    final pause = !agent.isPaused;
    final controller = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          pause
              ? 'Pause ${agent.displayName}?'
              : 'Resume ${agent.displayName}?',
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              pause
                  ? 'New commands will not be leased to this agent. Running external processes are not terminated.'
                  : 'The agent may claim new allowlisted commands after it resumes.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              minLines: 2,
              maxLines: 4,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Reason',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = controller.text.trim();
              if (value.length >= 3) Navigator.pop(context, value);
            },
            child: Text(pause ? 'Pause agent' : 'Resume agent'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (note == null || !mounted) return;
    setState(() => _controllingAgent = true);
    try {
      await _service.controlAgent(agent: agent, pause: pause, note: note);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(pause ? 'Agent paused.' : 'Agent resumed.')),
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyError(error))));
    } finally {
      if (mounted) setState(() => _controllingAgent = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Founder Operations'),
        actions: [
          IconButton(
            tooltip: 'Refresh operations',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.inbox_outlined), text: 'Work queue'),
            Tab(icon: Icon(Icons.monitor_heart_outlined), text: 'Agent health'),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [_buildWorkQueue(context), _buildAgentHealth(context)],
        ),
      ),
    );
  }

  Widget _buildWorkQueue(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: _OperationsMetrics(counts: _counts)),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 5,
                ),
                children: [
                  _queueChip(
                    'Needs action',
                    _OperationsQueue.needsAction,
                    _counts.needsAction,
                  ),
                  _queueChip(
                    'Running',
                    _OperationsQueue.running,
                    _counts.running,
                  ),
                  _queueChip('Failed', _OperationsQueue.failed, _counts.failed),
                  _queueChip(
                    'Completed',
                    _OperationsQueue.completed,
                    _counts.completed,
                  ),
                ],
              ),
            ),
          ),
          if (_loading && _items.isEmpty)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null && _items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _OperationsEmpty(
                icon: Icons.error_outline_rounded,
                title: 'Unable to load operations',
                body: _error!,
                action: _load,
              ),
            )
          else if (_items.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _OperationsEmpty(
                icon: Icons.task_alt_rounded,
                title: 'Queue is clear',
                body: 'No founder work items are in this state.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
              sliver: SliverList.separated(
                itemCount: _items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) => _OperationsWorkItemRow(
                  item: _items[index],
                  onTap: () => _openItem(_items[index]),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _queueChip(String label, _OperationsQueue queue, int count) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text('$label $count'),
        selected: _queue == queue,
        onSelected: (_) => _selectQueue(queue),
      ),
    );
  }

  Widget _buildAgentHealth(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: _loading && _agents.isEmpty
          ? ListView(
              children: const [
                SizedBox(height: 260),
                Center(child: CircularProgressIndicator()),
              ],
            )
          : _error != null && _agents.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 100),
                _OperationsEmpty(
                  icon: Icons.error_outline_rounded,
                  title: 'Unable to load agent health',
                  body: _error!,
                  action: _load,
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 24),
              itemCount: _agents.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) => _OperationsAgentRow(
                agent: _agents[index],
                onControl: _controllingAgent
                    ? null
                    : () => _controlAgent(_agents[index]),
              ),
            ),
    );
  }
}

class FounderOperationsWorkItemScreen extends StatefulWidget {
  const FounderOperationsWorkItemScreen({
    required this.item,
    required this.service,
    super.key,
  });

  final FounderOperationsWorkItem item;
  final FounderOperationsService service;

  @override
  State<FounderOperationsWorkItemScreen> createState() =>
      _FounderOperationsWorkItemScreenState();
}

class _FounderOperationsWorkItemScreenState
    extends State<FounderOperationsWorkItemScreen> {
  FounderOperationsWorkItemDetail? _detail;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final detail = await widget.service.fetchWorkItem(widget.item.id);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _friendlyError(error);
      });
    }
  }

  Future<void> _decide(
    String decision, {
    String? note,
    DateTime? deferUntil,
  }) async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      final result = await widget.service.decide(
        item: widget.item,
        decision: decision,
        note: note,
        deferUntil: deferUntil,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_decisionMessage(decision, result))),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_friendlyError(error))));
    }
  }

  Future<void> _confirmApprove() async {
    final execution = widget.item.executionEnabled;
    final outcomeWorkflow = widget.item.isOutcomeWorkflow;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          outcomeWorkflow
              ? 'Approve complete outcome?'
              : execution
              ? 'Approve and queue?'
              : 'Approve review?',
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              execution
                  ? outcomeWorkflow
                        ? 'Every listed stage will run automatically from this frozen plan. You only return here for completion or a genuine exception.'
                        : 'The service executor will receive only this frozen scope and must re-run preflight before writing.'
                  : 'This records approval of the review package. No executor or database writer is enabled for this item.',
            ),
            if (outcomeWorkflow) ...[
              const SizedBox(height: 12),
              Text('${widget.item.outcomeStages.length} registered stages'),
              Text(
                _text(
                  (widget.item.outcomeWorkflow['terminal_outcome']
                      as Map?)?['summary'],
                ),
              ),
            ],
            const SizedBox(height: 12),
            Text('Version ${widget.item.version}'),
            Text('Fingerprint ${_shortHash(widget.item.planFingerprint)}'),
            if (widget.item.requiresRecentAuth) ...[
              const SizedBox(height: 8),
              const Text('A recent authenticated session is required.'),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Approve'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _decide('approve');
  }

  Future<void> _requestNote(String decision, String title) async {
    final controller = TextEditingController();
    final note = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          20,
          16,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              minLines: 3,
              maxLines: 6,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Reason',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () {
                final value = controller.text.trim();
                if (value.isNotEmpty) Navigator.pop(context, value);
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    if (note != null) await _decide(decision, note: note);
  }

  Future<void> _defer() async {
    final duration = await showModalBottomSheet<Duration>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('Remind me later')),
            ListTile(
              title: const Text('In 1 hour'),
              onTap: () => Navigator.pop(context, const Duration(hours: 1)),
            ),
            ListTile(
              title: const Text('Tomorrow'),
              onTap: () => Navigator.pop(context, const Duration(days: 1)),
            ),
            ListTile(
              title: const Text('In 7 days'),
              onTap: () => Navigator.pop(context, const Duration(days: 7)),
            ),
          ],
        ),
      ),
    );
    if (duration != null) {
      await _decide('defer', deferUntil: DateTime.now().add(duration));
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (_, _) {},
      child: Scaffold(
        appBar: AppBar(title: const Text('Operation detail')),
        body: SafeArea(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
              ? _OperationsEmpty(
                  icon: Icons.error_outline_rounded,
                  title: 'Unable to load work item',
                  body: _error!,
                  action: _load,
                )
              : _buildDetail(context),
        ),
        bottomNavigationBar: _buildActionBar(context),
      ),
    );
  }

  Widget _buildDetail(BuildContext context) {
    final detail = _detail!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _StatusPill(
              label: _displayToken(widget.item.state),
              tone: _stateColor(context, widget.item.state),
            ),
            _StatusPill(
              label: widget.item.riskLevel.toUpperCase(),
              tone: _riskColor(context, widget.item.riskLevel),
            ),
            _StatusPill(
              label: widget.item.domain,
              tone: Theme.of(context).colorScheme.primary,
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          widget.item.title,
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        Text(
          widget.item.summary,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.4),
        ),
        const SizedBox(height: 20),
        _DetailSection(
          title: 'Proposed scope',
          child: _KeyValueList(values: widget.item.scope),
        ),
        _DetailSection(
          title: 'Explicit exclusions',
          child: _StringList(value: widget.item.exclusions),
        ),
        if (widget.item.isOutcomeWorkflow)
          _DetailSection(
            title: 'Automatic outcome workflow',
            child: _OutcomeWorkflowProgress(
              workflow: widget.item.outcomeWorkflow,
              receipts: detail.workflowStages,
            ),
          ),
        _DetailSection(
          title: 'Authority',
          child: _KeyValueList(
            values: {
              'Agent': widget.item.agentName,
              'Agent key': widget.item.agentKey,
              'Contract': widget.item.contractVersion,
              'Executor': widget.item.executorVersion ?? 'Review only',
              'Commit': widget.item.sourceCommitSha ?? 'Not supplied',
              'Plan version': widget.item.version,
              'Fingerprint': widget.item.planFingerprint,
              'Expires': _fullTime(widget.item.expiresAt),
            },
          ),
        ),
        _DetailSection(
          title: 'Evidence',
          child: detail.evidence.isEmpty
              ? const Text('No durable evidence references were attached.')
              : Column(
                  children: detail.evidence
                      .map((evidence) => _EvidenceRow(evidence: evidence))
                      .toList(growable: false),
                ),
        ),
        _DetailSection(
          title: 'Timeline',
          child: detail.events.isEmpty
              ? const Text('No events recorded.')
              : Column(
                  children: detail.events.reversed
                      .map(
                        (event) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.history_rounded, size: 20),
                          title: Text(
                            _displayToken(_text(event['event_type'])),
                          ),
                          subtitle: Text(
                            '${_text(event['actor_type'])} · ${_fullTime(_date(event['created_at']))}',
                          ),
                        ),
                      )
                      .toList(growable: false),
                ),
        ),
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: const Text('Frozen plan payload'),
          subtitle: const Text('Read-only source evidence and proposal data'),
          children: [
            SelectableText(
              const JsonEncoder.withIndent(
                '  ',
              ).convert(widget.item.planPayload),
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(fontFamily: 'monospace'),
            ),
          ],
        ),
      ],
    );
  }

  Widget? _buildActionBar(BuildContext context) {
    if (_loading || _error != null) return null;
    final item = widget.item;
    return SafeArea(
      top: false,
      child: Material(
        elevation: 8,
        color: Theme.of(context).colorScheme.surface,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: Row(
            children: [
              PopupMenuButton<String>(
                tooltip: 'More decisions',
                enabled: !_submitting,
                onSelected: (value) {
                  if (value == 'acknowledge') {
                    _decide(value);
                  }
                  if (value == 'add_note') {
                    _requestNote(value, 'Add note');
                  }
                  if (value == 'defer') {
                    _defer();
                  }
                  if (value == 'reject') {
                    _requestNote(value, 'Reject work item');
                  }
                  if (value == 'request_repair') {
                    _requestNote(value, 'Request repair');
                  }
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: 'acknowledge',
                    child: Text('Acknowledge'),
                  ),
                  const PopupMenuItem(
                    value: 'add_note',
                    child: Text('Add note'),
                  ),
                  if (item.isActionable) ...const [
                    PopupMenuItem(value: 'defer', child: Text('Defer')),
                    PopupMenuItem(
                      value: 'request_repair',
                      child: Text('Request repair'),
                    ),
                    PopupMenuItem(value: 'reject', child: Text('Reject')),
                  ],
                ],
                icon: const Icon(Icons.more_horiz_rounded),
              ),
              if (item.isActionable || item.isRetryable) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _submitting
                        ? null
                        : item.isRetryable
                        ? () => _decide('retry')
                        : _confirmApprove,
                    icon: _submitting
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(
                            item.isRetryable
                                ? Icons.refresh_rounded
                                : Icons.check_rounded,
                          ),
                    label: Text(
                      item.isRetryable
                          ? 'Retry bounded command'
                          : item.executionEnabled
                          ? item.isOutcomeWorkflow
                                ? 'Approve complete outcome'
                                : 'Approve and queue'
                          : 'Approve review',
                    ),
                  ),
                ),
              ] else
                const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class _OperationsMetrics extends StatelessWidget {
  const _OperationsMetrics({required this.counts});
  final FounderOperationsCounts counts;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Wrap(
        spacing: 16,
        runSpacing: 10,
        children: [
          _Metric(label: 'Needs action', value: counts.needsAction),
          _Metric(label: 'Running', value: counts.running),
          _Metric(label: 'Failed', value: counts.failed),
          _Metric(label: 'Unhealthy agents', value: counts.unhealthyAgents),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 132,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$value',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          Text(label, style: Theme.of(context).textTheme.labelMedium),
        ],
      ),
    );
  }
}

class _OperationsWorkItemRow extends StatelessWidget {
  const _OperationsWorkItemRow({required this.item, required this.onTap});
  final FounderOperationsWorkItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _riskColor(context, item.riskLevel);
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: color.withValues(alpha: 0.24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.rule_folder_outlined, color: color),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.summary,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 7),
                    Text(
                      '${item.agentName} · ${_displayToken(item.state)} · ${_relativeTime(item.createdAt)}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class _OperationsAgentRow extends StatelessWidget {
  const _OperationsAgentRow({required this.agent, required this.onControl});
  final FounderOperationsAgentHealth agent;
  final VoidCallback? onControl;

  @override
  Widget build(BuildContext context) {
    final color = _healthColor(context, agent.health);
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.circle, size: 12, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    agent.displayName,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${agent.domain} · ${_displayToken(agent.health)} · ${agent.executionPlatform}',
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Heartbeat ${_relativeTime(agent.lastHeartbeatAt)} · Success ${_relativeTime(agent.lastSuccessAt)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if ((agent.pausedReason ?? '').isNotEmpty)
                    Text(
                      agent.pausedReason!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
            IconButton(
              tooltip: agent.isPaused ? 'Resume agent' : 'Pause agent',
              onPressed: onControl,
              icon: Icon(
                agent.isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OutcomeWorkflowProgress extends StatelessWidget {
  const _OutcomeWorkflowProgress({
    required this.workflow,
    required this.receipts,
  });

  final Map<String, dynamic> workflow;
  final List<Map<String, dynamic>> receipts;

  @override
  Widget build(BuildContext context) {
    final stages =
        (workflow['stages'] is List
                ? workflow['stages'] as List
                : const <dynamic>[])
            .whereType<Map>()
            .map((stage) => Map<String, dynamic>.from(stage))
            .toList(growable: false);
    final latestByStage = <String, Map<String, dynamic>>{};
    for (final receipt in receipts) {
      final key = _text(receipt['stage_key']);
      if (key.isNotEmpty) latestByStage[key] = receipt;
    }
    final terminal = workflow['terminal_outcome'] is Map
        ? Map<String, dynamic>.from(workflow['terminal_outcome'] as Map)
        : const <String, dynamic>{};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _text(terminal['summary']),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        ...stages.indexed.map((entry) {
          final index = entry.$1;
          final stage = entry.$2;
          final stageKey = _text(stage['stage_key']);
          final status = _text(latestByStage[stageKey]?['status']);
          final succeeded = status == 'succeeded';
          final failed = status == 'failed';
          return ListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            leading: Icon(
              succeeded
                  ? Icons.check_circle_rounded
                  : failed
                  ? Icons.error_rounded
                  : status == 'started'
                  ? Icons.sync_rounded
                  : Icons.radio_button_unchecked_rounded,
              color: succeeded
                  ? Colors.green
                  : failed
                  ? Theme.of(context).colorScheme.error
                  : null,
            ),
            title: Text('${index + 1}. ${_displayToken(stageKey)}'),
            subtitle: Text(
              status.isEmpty
                  ? '${_displayToken(_text(stage['mode']))} · queued after approval'
                  : _displayToken(status),
            ),
          );
        }),
        const SizedBox(height: 8),
        const Text(
          'One approval covers every listed stage. Execution stops only for a frozen safety exception.',
        ),
      ],
    );
  }
}

class _DetailSection extends StatelessWidget {
  const _DetailSection({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const Divider(height: 16),
          child,
        ],
      ),
    );
  }
}

class _KeyValueList extends StatelessWidget {
  const _KeyValueList({required this.values});
  final Map<String, dynamic> values;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: values.entries
          .map(
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 118,
                    child: Text(
                      _displayToken(entry.key),
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                  ),
                  Expanded(child: SelectableText(_displayValue(entry.value))),
                ],
              ),
            ),
          )
          .toList(growable: false),
    );
  }
}

class _StringList extends StatelessWidget {
  const _StringList({required this.value});
  final dynamic value;

  @override
  Widget build(BuildContext context) {
    final List<String> rows;
    if (value is Iterable) {
      final Iterable<dynamic> entries = value as Iterable<dynamic>;
      rows = entries
          .map<String>((entry) => _text(entry))
          .where((row) => row.isNotEmpty)
          .toList(growable: false);
    } else {
      rows = <String>[_text(value)];
    }
    return Column(
      children: rows
          .map(
            (row) => Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 7),
                    child: Icon(Icons.circle, size: 5),
                  ),
                  const SizedBox(width: 9),
                  Expanded(child: Text(row)),
                ],
              ),
            ),
          )
          .toList(growable: false),
    );
  }
}

class _EvidenceRow extends StatelessWidget {
  const _EvidenceRow({required this.evidence});
  final Map<String, dynamic> evidence;

  @override
  Widget build(BuildContext context) {
    final sourceUri = Uri.tryParse(
      _text(evidence['durable_uri']).isNotEmpty
          ? _text(evidence['durable_uri'])
          : _text(evidence['source_uri']),
    );
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.verified_outlined),
      title: Text(
        _text(evidence['summary']).isEmpty
            ? _text(evidence['evidence_key'])
            : _text(evidence['summary']),
      ),
      subtitle: Text(
        '${_text(evidence['role'])} · ${_text(evidence['retention_class'])}\n${_shortHash(_text(evidence['sha256']))}',
      ),
      isThreeLine: true,
      trailing: sourceUri != null && sourceUri.hasScheme
          ? IconButton(
              tooltip: 'Open evidence',
              icon: const Icon(Icons.open_in_new_rounded),
              onPressed: () =>
                  launchUrl(sourceUri, mode: LaunchMode.externalApplication),
            )
          : null,
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.tone});
  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        border: Border.all(color: tone.withValues(alpha: 0.32)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _OperationsEmpty extends StatelessWidget {
  const _OperationsEmpty({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
  });
  final IconData icon;
  final String title;
  final String body;
  final Future<void> Function()? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 38,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(body, textAlign: TextAlign.center),
            if (action != null) ...[
              const SizedBox(height: 14),
              OutlinedButton(onPressed: action, child: const Text('Retry')),
            ],
          ],
        ),
      ),
    );
  }
}

String _decisionMessage(
  String decision,
  FounderOperationsDecisionResult result,
) {
  if (result.duplicate) return 'This decision was already recorded.';
  return switch (decision) {
    'approve' =>
      result.commandId == null
          ? 'Review approved. No writer was dispatched.'
          : 'Approved and queued for bounded execution.',
    'add_note' => 'Note added.',
    'retry' => 'Bounded command queued for retry.',
    'defer' => 'Work item deferred.',
    'reject' => 'Work item rejected.',
    'request_repair' => 'Repair requested.',
    _ => 'Decision recorded.',
  };
}

String _friendlyError(Object error) {
  final text = error
      .toString()
      .replaceFirst('PostgrestException(message: ', '')
      .trim();
  if (text.contains('recent_authentication_required')) {
    return 'Sign in again before approving this high-risk operation.';
  }
  if (text.contains('stale_plan')) {
    return 'This plan changed. Refresh and review the new version.';
  }
  if (text.contains('expired')) {
    return 'This plan expired and must be regenerated.';
  }
  if (text.contains('founder_access_required')) {
    return 'Founder access is required.';
  }
  return text.length > 220 ? '${text.substring(0, 217)}...' : text;
}

Color _riskColor(BuildContext context, String risk) => switch (risk) {
  'critical' => Theme.of(context).colorScheme.error,
  'high' => Colors.deepOrange,
  'medium' => Colors.amber.shade800,
  _ => Colors.teal,
};

Color _stateColor(BuildContext context, String state) => switch (state) {
  'failed' || 'repair_requested' => Theme.of(context).colorScheme.error,
  'queued' || 'running' => Colors.blue,
  'succeeded' || 'approved' => Colors.teal,
  _ => Theme.of(context).colorScheme.primary,
};

Color _healthColor(BuildContext context, String health) => switch (health) {
  'healthy' => Colors.teal,
  'running' => Colors.blue,
  'degraded' || 'stale' => Colors.amber.shade800,
  'failed' => Theme.of(context).colorScheme.error,
  'paused' => Colors.grey,
  _ => Theme.of(context).colorScheme.outline,
};

String _displayToken(String value) => value
    .trim()
    .replaceAll(RegExp(r'[_\-.]+'), ' ')
    .split(' ')
    .where((part) => part.isNotEmpty)
    .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
    .join(' ');
String _displayValue(dynamic value) => value is Map || value is List
    ? const JsonEncoder.withIndent('  ').convert(value)
    : _text(value);
String _text(dynamic value) => value?.toString().trim() ?? '';
String _shortHash(String value) => value.length <= 16
    ? value
    : '${value.substring(0, 8)}…${value.substring(value.length - 8)}';
DateTime? _date(dynamic value) =>
    value is DateTime ? value : DateTime.tryParse(_text(value));
String _fullTime(DateTime? value) =>
    value == null ? 'Not recorded' : value.toLocal().toString();
String _relativeTime(DateTime? value) {
  if (value == null) return 'never';
  final difference = DateTime.now().difference(value.toLocal());
  if (difference.inMinutes < 1) return 'now';
  if (difference.inHours < 1) return '${difference.inMinutes}m ago';
  if (difference.inDays < 1) return '${difference.inHours}h ago';
  return '${difference.inDays}d ago';
}
