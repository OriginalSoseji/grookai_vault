import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/vault/portfolio_history_service.dart';
import 'portfolio_timeline.dart';

const _errors = {
  'day_expired': 'That recording day ended. You can record today’s collection.',
  'capacity_reached': 'History has reached its recording limit.',
  'too_many_copies':
      'Recording supports up to 20,000 owned copies. Your current Vault is still available.',
  'observation_too_large':
      'This collection is too large to record in one complete observation.',
  'pricing_unavailable':
      'The price source is unavailable. No observation was saved.',
  'invalid_reference':
      'A price reference could not be verified. No observation was saved.',
  'clock_changed':
      'The recording time could not be verified. No observation was saved.',
  'capture_failed': 'The recording failed. No observation was saved.',
};
const _labels = {
  'marketMovement': 'Price movement on comparable copies',
  'addedCopies': 'Copies added',
  'removedCopies': 'Copies removed',
  'newPriceCoverage': 'New price coverage',
  'lostPriceCoverage': 'Lost price coverage',
  'basisChanges': 'Identity or valuation basis changes',
};
String _historyError(Object error) => error is FormatException
    ? error.message
    : error is StateError
    ? error.message.toString()
    : 'Collection history is unavailable. Any pending recording request remains saved.';
String _date(dynamic value) =>
    DateTime.parse(value as String).toLocal().toString().substring(0, 16);
String _total(Map<String, dynamic> p) {
  final totals = p['totals'] as Map;
  return totals.isEmpty
      ? (p['state'] == 'empty' ? 'Empty collection' : 'No priced copies')
      : totals.entries.map((e) => '${e.key} ${e.value['display']}').join(' · ');
}

class PortfolioHistoryScreen extends StatelessWidget {
  const PortfolioHistoryScreen({super.key, required this.ownerId});
  final String ownerId;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Collection history')),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: PortfolioHistoryPanel(ownerId: ownerId),
    ),
  );
}

class PortfolioHistoryPanel extends StatefulWidget {
  const PortfolioHistoryPanel({
    super.key,
    required this.ownerId,
    this.compact = false,
    this.service,
  });
  final String ownerId;
  final bool compact;
  final PortfolioHistoryService? service;
  @override
  State<PortfolioHistoryPanel> createState() => _PortfolioHistoryPanelState();
}

class _PortfolioHistoryPanelState extends State<PortfolioHistoryPanel> {
  late PortfolioHistoryService _service;
  StreamSubscription<void>? _ownerSubscription;
  List<Map<String, dynamic>> _points = [];
  Map<String, dynamic>? _journal, _caps, _comparison;
  String? _cursor, _watermark, _error, _notice, _before, _after;
  bool _busy = true, _invalid = false;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _start();
  }

  void _start() {
    _service =
        widget.service ??
        PortfolioHistoryService.supabase(Supabase.instance.client);
    _ownerSubscription = _service.accountChanges.listen((_) {
      if (mounted) {
        _generation++;
        setState(() {
          _invalid = true;
          _points = [];
          _journal = null;
          _caps = null;
          _comparison = null;
          _error = null;
          _notice = null;
          _busy = false;
        });
      }
    });
    unawaited(_load(automatic: true));
  }

  @override
  void didUpdateWidget(covariant PortfolioHistoryPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ownerId != widget.ownerId ||
        oldWidget.service != widget.service) {
      _generation++;
      unawaited(_ownerSubscription?.cancel());
      if (oldWidget.service == null) _service.dispose();
      _points = [];
      _journal = null;
      _caps = null;
      _comparison = null;
      _cursor = null;
      _watermark = null;
      _error = null;
      _notice = null;
      _before = null;
      _after = null;
      _busy = true;
      _invalid = false;
      _start();
    }
  }

  @override
  void dispose() {
    _generation++;
    unawaited(_ownerSubscription?.cancel());
    if (widget.service == null) _service.dispose();
    super.dispose();
  }

  void _check(int generation) {
    _service.checkOwner();
    if (!mounted ||
        generation != _generation ||
        _service.ownerId != widget.ownerId) {
      throw StateError('History view changed.');
    }
  }

  void _resolved(PortfolioAttempt value) {
    _journal = value.journal;
    _notice = switch (value.status) {
      'unconfirmed' =>
        'The recording outcome is not confirmed. Your exact request is saved on this device.',
      'captured' =>
        'Collection recorded for ${value.acknowledgement!['request']['day']} UTC.',
      'reused' => 'That day’s original observation is already recorded.',
      'cancelled' => 'The recording request was cancelled.',
      'failed' =>
        _errors[value.acknowledgement?['errorCode']] ??
            _errors['capture_failed'],
      _ => null,
    };
  }

  void _page(Map<String, dynamic> page) {
    _before = null;
    _after = null;
    _comparison = null;
    _points = (page['points'] as List)
        .map((p) => Map<String, dynamic>.from(p as Map))
        .toList();
    _cursor = page['nextBefore'] as String?;
    _watermark = page['watermark'] as String;
  }

  Future<void> _load({bool automatic = false}) async {
    final generation = ++_generation;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      _check(generation);
      var retained = await _service.journal();
      _check(generation);
      setState(() => _journal = retained);
      if (retained?['pending'] != null) {
        final outcome = await _service.recover();
        _check(generation);
        setState(() => _resolved(outcome));
        retained = outcome.journal;
      }
      final caps = await _service.capabilities();
      _check(generation);
      setState(() => _caps = caps);
      if (retained?['lastOutcome']?['status'] == 'failed' &&
          retained?['lastOutcome']?['request']?['day'] == caps['day']) {
        setState(
          () => _notice = _errors[retained!['lastOutcome']['errorCode']],
        );
      }
      final page = await _service.list();
      _check(generation);
      setState(() => _page(page));
      final recorded = _points.any(
        (p) => (p['capturedAt'] as String).substring(0, 10) == caps['day'],
      );
      if (automatic &&
          caps['enabled'] == true &&
          !recorded &&
          retained?['pending'] == null &&
          retained?['lastOutcome']?['request']?['day'] != caps['day']) {
        final outcome = await _service.begin(
          caps['day'] as String,
          retained?['localRevision'] as String?,
        );
        _check(generation);
        setState(() => _resolved(outcome));
        final fresh = await _service.list();
        _check(generation);
        setState(() => _page(fresh));
      }
    } catch (error) {
      if (mounted && generation == _generation) {
        setState(() => _error = _historyError(error));
      }
    } finally {
      if (mounted && generation == _generation) setState(() => _busy = false);
    }
  }

  Future<void> _run(Future<void> Function(int generation) action) async {
    if (_busy || _invalid) return;
    final generation = ++_generation;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      _check(generation);
      await action(generation);
    } catch (error) {
      if (mounted && generation == _generation) {
        setState(() => _error = _historyError(error));
      }
    } finally {
      if (mounted && generation == _generation) setState(() => _busy = false);
    }
  }

  Future<void> _record(String mode) => _run((generation) async {
    PortfolioAttempt outcome;
    if (mode == 'new') {
      final caps = await _service.capabilities();
      _check(generation);
      setState(() => _caps = caps);
      if (caps['enabled'] != true) {
        throw StateError('New recordings are unavailable.');
      }
      final retained = await _service.journal();
      _check(generation);
      setState(() => _journal = retained);
      outcome = await _service.begin(
        caps['day'] as String,
        retained?['localRevision'] as String?,
      );
    } else {
      outcome = await switch (mode) {
        'recover' => _service.recover(),
        'cancel' => _service.cancel(),
        _ => _service.retry(),
      };
    }
    _check(generation);
    setState(() => _resolved(outcome));
    final page = await _service.list();
    _check(generation);
    setState(() {
      _page(page);
      _comparison = null;
    });
  });
  Future<void> _export(String pointId) => _run((generation) async {
    final data = await _service.export(pointId);
    _check(generation);
    if (!mounted) return;
    final box = context.findRenderObject() as RenderBox?;
    await SharePlus.instance.share(
      ShareParams(
        files: [
          XFile.fromData(
            utf8.encode(const JsonEncoder.withIndent('  ').convert(data)),
            mimeType: 'application/json',
          ),
        ],
        fileNameOverrides: [
          'grookai-collection-${(data['point']['capturedAt'] as String).substring(0, 10)}.json',
        ],
        sharePositionOrigin: box == null
            ? null
            : box.localToGlobal(Offset.zero) & box.size,
      ),
    );
    _check(generation);
    setState(
      () => _notice =
          'Complete observation prepared with its original price references.',
    );
  });
  Widget _button(String label, VoidCallback action, {bool enabled = true}) =>
      OutlinedButton(
        onPressed: _busy || !enabled ? null : action,
        child: Text(label),
      );
  @override
  Widget build(BuildContext context) {
    if (_invalid) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Your account changed. Reopen Vault to view collection history.',
          ),
        ),
      );
    }
    final style = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Collection history', style: style.titleMedium),
            const SizedBox(height: 4),
            const Text(
              'Your whole Vault, recorded on the first visit each UTC day.',
            ),
            if (widget.compact)
              _button(
                'View history',
                () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        PortfolioHistoryScreen(ownerId: widget.ownerId),
                  ),
                ),
              )
            else
              _button('Refresh history', () => _load()),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Semantics(
                liveRegion: true,
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
              _button('Retry loading', () => _load()),
            ],
            if (_notice != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Semantics(liveRegion: true, child: Text(_notice!)),
              ),
            if (_journal?['pending'] != null) ...[
              const SizedBox(height: 8),
              Text('Recording needs confirmation', style: style.titleSmall),
              Text(
                'Requested for ${_journal!['pending']['day']} UTC. Checking or retrying keeps the same request.',
              ),
              Wrap(
                spacing: 8,
                children: [
                  _button('Check outcome', () => _record('recover')),
                  _button(
                    'Retry recording',
                    () => _record('retry'),
                    enabled: _caps?['enabled'] == true,
                  ),
                  _button('Cancel request', () => _record('cancel')),
                ],
              ),
            ],
            if (_busy)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: LinearProgressIndicator(),
              ),
            if (!_busy && _error == null && _points.isEmpty)
              const Text(
                'No recorded observations yet. Your first observation starts here; earlier holdings cannot be reconstructed.',
              ),
            if (_caps?['enabled'] == false)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'New recordings are currently unavailable. Existing observations and pending requests remain accessible.',
                ),
              ),
            if (_journal?['pending'] == null &&
                _caps?['enabled'] == true &&
                !_points.any(
                  (p) =>
                      (p['capturedAt'] as String).substring(0, 10) ==
                      _caps!['day'],
                ))
              _button('Record today’s collection', () => _record('new')),
            if (_points.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Latest recorded observation · ${_date(_points.first['capturedAt'])}',
                style: style.bodySmall,
              ),
              Text(_total(_points.first), style: style.titleLarge),
              Text(
                '${_points.first['coverage']['priced']} of ${_points.first['coverage']['owned']} copies priced · ${_points.first['coverage']['unpriced']} unpriced',
              ),
            ],
            if (!widget.compact && _points.isNotEmpty) ...[
              const SizedBox(height: 16),
              PortfolioTimeline(points: _points),
              const Text(
                'Recorded reference values are separate from today’s live value. Changes can include ownership, condition and price coverage. They are not profit or cash flow. Currencies stay separate.',
              ),
              if (_points.length == 1)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'This is your first observation. A comparison becomes available after another day is recorded.',
                  ),
                ),
              if (_points.length > 1) ...[
                const SizedBox(height: 16),
                Text('What changed?', style: style.titleMedium),
                DropdownButtonFormField<String>(
                  key: ValueKey('before-$_watermark-$_before'),
                  initialValue: _before,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Earlier observation',
                  ),
                  items: _points
                      .map(
                        (p) => DropdownMenuItem(
                          value: p['snapshotId'] as String,
                          child: Text(_date(p['capturedAt'])),
                        ),
                      )
                      .toList(),
                  onChanged: _busy
                      ? null
                      : (v) => setState(() {
                          _before = v;
                          _after = null;
                          _comparison = null;
                        }),
                ),
                DropdownButtonFormField<String>(
                  key: ValueKey(_before),
                  initialValue: _after,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Later observation',
                  ),
                  items: _points
                      .where(
                        (p) =>
                            _before == null ||
                            BigInt.parse(p['sequence'] as String) >
                                BigInt.parse(
                                  _points.firstWhere(
                                        (v) => v['snapshotId'] == _before,
                                      )['sequence']
                                      as String,
                                ),
                      )
                      .map(
                        (p) => DropdownMenuItem(
                          value: p['snapshotId'] as String,
                          child: Text(_date(p['capturedAt'])),
                        ),
                      )
                      .toList(),
                  onChanged: _busy
                      ? null
                      : (v) => setState(() {
                          _after = v;
                          _comparison = null;
                        }),
                ),
                _button(
                  'Compare',
                  () => _run((generation) async {
                    final comparison = await _service.compare(
                      _before!,
                      _after!,
                    );
                    _check(generation);
                    setState(() => _comparison = comparison);
                  }),
                  enabled:
                      _before != null && _after != null && _before != _after,
                ),
              ],
              if (_comparison != null) ...[
                Text(
                  '${_comparison!['counts']['addedCopies']} copies added · ${_comparison!['counts']['removedCopies']} removed · ${_comparison!['counts']['basisChangedCopies']} changed basis',
                ),
                for (final e
                    in (_comparison!['currencies'] as Map).entries) ...[
                  const SizedBox(height: 12),
                  Text(
                    '${e.key} ${e.value['display']['difference']} reference value change',
                    style: style.titleSmall,
                  ),
                  for (final label in _labels.entries)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(flex: 2, child: Text(label.value)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              e.value['display']['components'][label.key]
                                  as String,
                              textAlign: TextAlign.end,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (e.value['display']['roundingAdjustment'] != '0.00')
                    Text(
                      'Display rounding: ${e.value['display']['roundingAdjustment']}',
                    ),
                ],
              ],
              for (final point in _points) ...[
                const Divider(height: 32),
                Text(_date(point['capturedAt']), style: style.bodySmall),
                Text(_total(point), style: style.titleMedium),
                Text(
                  '${point['coverage']['priced']} / ${point['coverage']['owned']} priced · ${point['coverage']['byKind']['raw']['owned']} raw · ${point['coverage']['byKind']['slab']['owned']} slabs · ${point['coverage']['byKind']['sealed']['owned']} sealed',
                ),
                if (point['coverage']['unpriced'] > 0)
                  Text(
                    '${point['coverage']['unpriced']} unpriced copies are included in ownership, not valued as zero.',
                  ),
                _button(
                  'Export details',
                  () => _export(point['snapshotId'] as String),
                ),
              ],
              if (_cursor != null)
                _button(
                  'Load older observations',
                  () => _run((generation) async {
                    final page = await _service.list(
                      before: _cursor,
                      watermark: _watermark,
                    );
                    _check(generation);
                    setState(() {
                      _points.addAll(
                        (page['points'] as List).map(
                          (p) => Map<String, dynamic>.from(p as Map),
                        ),
                      );
                      _cursor = page['nextBefore'] as String?;
                    });
                  }),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
