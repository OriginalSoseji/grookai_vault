import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/sales/cost_correction_service.dart';
import '../../services/sales/sale_cost_corrections.dart';
import '../../services/sales/sales_profit_service.dart';
import '../../services/sales/sales_profit.dart';
import '../../services/sales/sales_purchase.dart';
import '../../services/sales/sale_cost_report.dart';
import '../../services/sales/vendor_events.dart';

const kVendorCostCorrectionsEnabled = bool.fromEnvironment(
  'GV_VENDOR_COST_CORRECTIONS_V1',
);

class CostHistoryPanel extends StatefulWidget {
  const CostHistoryPanel({
    super.key,
    required this.receipts,
    required this.service,
    required this.profitService,
    this.allowNewEdits = kVendorCostCorrectionsEnabled,
  });
  final List<Map<String, dynamic>> receipts;
  final CostCorrectionService service;
  final SalesProfitService? profitService;
  final bool allowNewEdits;
  @override
  State<CostHistoryPanel> createState() => _CostHistoryPanelState();
}

class _CostHistoryPanelState extends State<CostHistoryPanel> {
  final _scroll = ScrollController();
  StreamSubscription<void>? _subscription;
  List<dynamic>? _states, _snapshots;
  Map<String, dynamic>? _journal, _edit;
  List<dynamic> _history = [];
  ({String receiptId, int lineIndex})? _historyTarget;
  bool _loading = true,
      _busy = false,
      _closed = false,
      _enabled = false,
      _journalReady = false,
      _historyBusy = false,
      _historyMore = false;
  int _generation = 0, _historyGeneration = 0, _limit = 100;
  String _basis = 'original',
      _query = '',
      _error = '',
      _costError = '',
      _message = '';
  late DateTime _from, _to;
  final _amount = TextEditingController(),
      _currency = TextEditingController(text: 'USD'),
      _reason = TextEditingController();
  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _to = DateTime(now.year, now.month, now.day);
    _from = _to.subtract(const Duration(days: 29));
    _bind();
    unawaited(_load());
  }

  void _bind() {
    _subscription = widget.service.accountChanges.listen((_) {
      if (!mounted) return;
      _generation++;
      _historyGeneration++;
      setState(() {
        _closed = true;
        _states = null;
        _snapshots = null;
        _journal = null;
        _edit = null;
        _history = [];
      });
    });
  }

  @override
  void didUpdateWidget(covariant CostHistoryPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.service != widget.service) {
      unawaited(_subscription?.cancel());
      _closed = false;
      _bind();
      unawaited(_load());
    } else if (jsonEncode(oldWidget.receipts) != jsonEncode(widget.receipts) ||
        oldWidget.profitService != widget.profitService) {
      unawaited(_load());
    }
  }

  @override
  void dispose() {
    _generation++;
    _historyGeneration++;
    unawaited(_subscription?.cancel());
    _amount.dispose();
    _currency.dispose();
    _reason.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_closed) return;
    final generation = ++_generation;
    _historyGeneration++;
    setState(() {
      _loading = true;
      _error = '';
      _costError = '';
      _states = null;
      _snapshots = null;
      _enabled = false;
      _journalReady = false;
    });
    final receipts = (jsonDecode(jsonEncode(widget.receipts)) as List)
            .where((r) => !isPurchaseReceipt(r))
            .toList(),
        ids = <String>[
          for (final r in widget.receipts)
            if (!isPurchaseReceipt(r)) r['id'] as String,
        ];
    Map<String, dynamic>? saved;
    List<dynamic>? states, snapshots;
    var journalReady = false, available = false;
    String error = '', costError = '';
    try {
      await Future.wait<void>([
        (() async {
          try {
            saved = await widget.service.journal();
            journalReady = true;
          } catch (_) {
            error =
                'Saved correction could not load. New edits are disabled; preserve this device data.';
          }
        })(),
        (() async {
          try {
            available = await widget.service.available();
          } catch (_) {
            available = false;
          }
        })(),
        (() async {
          try {
            states = await widget.service.read(ids);
          } catch (_) {
            costError =
                'Later cost revisions could not load. Refresh before using the corrected basis.';
          }
        })(),
        (() async {
          try {
            final service = widget.profitService;
            if (service == null) throw const SalesProfitUnavailable();
            snapshots = await service.read(
              receipts.map((r) => r['id'] as String).toList(),
              isCurrent: () => mounted && generation == _generation && !_closed,
            );
          } catch (_) {
            costError =
                'Original cost history could not load. Profit is unavailable until it refreshes.';
          }
        })(),
      ]);
      widget.service.checkOwner();
      if (!mounted || generation != _generation || _closed) return;
      setState(() {
        _journal = saved;
        _journalReady = journalReady;
        _enabled = available && journalReady && widget.allowNewEdits;
        _states = states;
        _snapshots = snapshots;
        _error = error;
        _costError = costError;
        _loading = false;
      });
    } catch (_) {
      if (mounted && generation == _generation && !_closed) {
        setState(() {
          _loading = false;
          _error =
              'Cost history could not refresh. Your saved request is retained.';
        });
      }
    }
  }

  Map? get _pending => _journal?['pending'] as Map?;
  bool get _canEdit =>
      _enabled &&
      !_loading &&
      !_busy &&
      _pending == null &&
      _journalReady &&
      _states != null;
  String _date(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  Future<void> _pickDate(bool start) async {
    final value = await showDatePicker(
      context: context,
      initialDate: start ? _from : _to,
      firstDate: DateTime(1900),
      lastDate: DateTime(2200),
    );
    if (value != null && mounted) {
      setState(() {
        if (start) {
          _from = value;
        } else {
          _to = value;
        }
        _limit = 100;
      });
    }
  }

  Map? _stateFor(Map receipt) {
    for (final s in _states ?? []) {
      if (s['receiptId'] == (receipt['id'] as String).toLowerCase()) {
        return s as Map;
      }
    }
    return null;
  }

  Map? _revision(Map? state, int index) {
    for (final o in state?['lines'] as List? ?? []) {
      if (o['request']['lineIndex'] == index) return o as Map;
    }
    return null;
  }

  void _startEdit(Map<String, dynamic> receipt, int index) {
    final state = _stateFor(receipt);
    if (!_canEdit ||
        state?['source'] == null ||
        !sameCostEvidence(state?['receipt'], receipt)) {
      return;
    }
    final revision = _revision(state, index);
    if (revision != null &&
        (revision['source'] != state!['source'] ||
            !sameCostEvidence(revision['request']['receipt'], receipt))) {
      setState(
        () => _error =
            'The revision refers to different receipt evidence. Review its history.',
      );
      return;
    }
    final cost = revision?['request']['action'] == 'set'
        ? revision!['request']['cost'] as Map
        : null;
    _amount.text = cost == null ? '' : eventMoneyText(cost['minor'] as String);
    _currency.text = cost?['currency'] as String? ?? 'USD';
    _reason.clear();
    setState(() {
      _edit = {
        'receipt': jsonDecode(jsonEncode(receipt)),
        'lineIndex': index,
        'expectedRevision': revision?['revision'] ?? '0',
        'localRevision': _journal?['localRevision'],
        'action': 'set',
      };
      _error = '';
      _message = '';
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) _scroll.jumpTo(0);
    });
  }

  Future<void> _handle(CostCorrectionAttempt attempt) async {
    if (!mounted || _closed) return;
    setState(() => _journal = attempt.journal);
    if (attempt.status == 'applied' || attempt.status == 'cancelled') {
      setState(() {
        _edit = null;
        _message = attempt.status == 'applied'
            ? 'Cost revision saved. Original sale evidence is retained.'
            : 'Request cancelled. No correction was applied by this request.';
      });
      await _load();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_closed && _scroll.hasClients) _scroll.jumpTo(0);
      });
    } else if (attempt.status == 'unconfirmed') {
      setState(
        () => _error = attempt.code == 'PT409'
            ? 'This line has a newer revision. Cancel your retained request, then review the current cost before editing.'
            : attempt.message ?? 'The outcome remains unconfirmed.',
      );
    }
  }

  Future<void> _submit() async {
    final edit = _edit;
    if (edit == null || !_canEdit) return;
    Map<String, dynamic> request;
    try {
      final minor = eventMoneyInput(_amount.text);
      if (edit['action'] == 'set' && minor == null) {
        throw const FormatException('amount');
      }
      request = validateSaleCostCorrectionRequest({
        'version': 1,
        'requestId': newCostCorrectionId(),
        'receipt': edit['receipt'],
        'lineIndex': edit['lineIndex'],
        'expectedRevision': edit['expectedRevision'],
        'action': edit['action'],
        'cost': edit['action'] == 'restore'
            ? null
            : {'minor': minor, 'currency': _currency.text},
        'reason': _reason.text,
      });
    } catch (_) {
      setState(
        () => _error =
            'Enter a nonnegative full-line cost, a three-letter currency, and a reason of 1–500 characters.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      await _handle(
        await widget.service.begin(request, edit['localRevision'] as String?),
      );
    } catch (_) {
      try {
        widget.service.checkOwner();
        final row = await widget.service.journal();
        if (mounted && !_closed) {
          setState(() {
            _journal = row;
            _error =
                'The correction could not be safely saved. Check the retained request before trying again.';
          });
        }
      } catch (_) {
        /* Account changes close the private view. */
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _recover(String mode) async {
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final result = mode == 'cancel'
          ? await widget.service.cancel()
          : mode == 'retry'
          ? await widget.service.retry()
          : await widget.service.recover();
      await _handle(result);
    } catch (_) {
      if (mounted && !_closed) {
        setState(
          () => _error =
              'The retained correction could not be checked. Its request has not been removed.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _loadHistory(
    String receiptId,
    int lineIndex, {
    bool more = false,
  }) async {
    final generation = ++_historyGeneration;
    setState(() {
      _historyBusy = true;
      _error = '';
    });
    try {
      final page = await widget.service.history(
        receiptId,
        lineIndex,
        beforeRevision: more && _history.isNotEmpty
            ? _history.last['revision'] as String
            : null,
      );
      widget.service.checkOwner();
      if (!mounted || _closed || generation != _historyGeneration) return;
      setState(() {
        _historyTarget = (receiptId: receiptId, lineIndex: lineIndex);
        _history = more ? [..._history, ...page] : page;
        _historyMore = page.length == 50;
      });
    } catch (_) {
      if (mounted && !_closed && generation == _historyGeneration) {
        setState(() => _error = 'Cost revision history could not load.');
      }
    } finally {
      if (mounted && generation == _historyGeneration) {
        setState(() => _historyBusy = false);
      }
    }
  }

  Future<void> _export(
    List<dynamic> receipts,
    List<dynamic> states,
    BuildContext anchor,
  ) async {
    try {
      widget.service.checkOwner();
      final csv = saleCostReportCsv(
            receipts,
            _snapshots!,
            basis: _basis,
            states: states,
            ownerId: widget.service.ownerId,
          ),
          box = anchor.findRenderObject() as RenderBox?;
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile.fromData(utf8.encode(csv), mimeType: 'text/csv')],
          fileNameOverrides: [
            'grookai-private-costs-$_basis-${_date(_from)}-${_date(_to)}.csv',
          ],
          sharePositionOrigin: box == null
              ? null
              : box.localToGlobal(Offset.zero) & box.size,
        ),
      );
    } catch (_) {
      if (mounted && !_closed) {
        setState(
          () => _error = 'The private CSV could not be shared. Try again.',
        );
      }
    }
  }

  Widget _button(String text, VoidCallback? onPressed) =>
      OutlinedButton(onPressed: onPressed, child: Text(text));
  Widget _panel(List<Widget> children) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final child in children)
            Padding(padding: const EdgeInsets.only(bottom: 12), child: child),
        ],
      ),
    ),
  );
  String _revisionLabel(Map o) => o['request']['action'] == 'restore'
      ? 'Original evidence restored'
      : '${o['request']['cost']['currency']} ${eventMoneyText(o['request']['cost']['minor'] as String)} full-line cost';
  @override
  Widget build(BuildContext context) {
    if (_closed) {
      return const Center(
        child: Text(
          'Cost history closed. Your account changed. Reopen Reports.',
        ),
      );
    }
    final end = DateTime(_to.year, _to.month, _to.day + 1),
        valid = end.isAfter(_from);
    final rows = widget.receipts.where((r) {
      if (isPurchaseReceipt(r)) return false;
      final at = DateTime.tryParse(r['createdAt'] as String);
      return at != null &&
          !at.isBefore(_from) &&
          at.isBefore(end) &&
          [
            r['number'],
            r['customerName'],
            ...(r['items'] as List).map((i) => i['description']),
          ].join(' ').toLowerCase().contains(_query.trim().toLowerCase());
    }).toList();
    final ids = rows.map((r) => (r['id'] as String).toLowerCase()).toSet(),
        states = (_states ?? [])
            .where((s) => ids.contains(s['receiptId']))
            .toList();
    Map<String, Object?>? report;
    var reportError = '';
    if (!_loading && valid && _snapshots != null) {
      try {
        if (_basis == 'owner_corrected' && _states == null) {
          throw const FormatException('Missing revisions');
        }
        report = _basis == 'original'
            ? salesProfit(rows, _snapshots!)
            : salesProfitCorrected(
                rows,
                _snapshots!,
                states,
                widget.service.ownerId,
              );
      } catch (_) {
        reportError =
            'This cost basis is unavailable until the receipt and private cost history can be verified.';
      }
    }
    final pending = _pending, edit = _edit;
    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.all(12),
      children: [
        if (edit != null)
          _panel([
            Text(
              '${edit['receipt']['number']} · Line ${(edit['lineIndex'] as int) + 1}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(
              '${edit['receipt']['items'][edit['lineIndex']]['quantity']} × ${edit['receipt']['items'][edit['lineIndex']]['description']}',
            ),
            Text(
              'Revision being reviewed: ${edit['expectedRevision']}. The amount covers all units on this line.',
            ),
            DropdownButtonFormField<String>(
              initialValue: edit['action'] as String,
              isExpanded: true,
              itemHeight: null,
              decoration: const InputDecoration(labelText: 'Change'),
              items: const [
                DropdownMenuItem(
                  value: 'set',
                  child: Text('Set full-line cost'),
                ),
                DropdownMenuItem(
                  value: 'restore',
                  child: Text('Restore original evidence'),
                ),
              ],
              onChanged: _busy || pending != null || !_enabled
                  ? null
                  : (v) {
                      if (v != null) setState(() => edit['action'] = v);
                    },
            ),
            if (edit['action'] == 'set') ...[
              TextField(
                controller: _amount,
                enabled: !_busy && pending == null && _enabled,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Total cost for this line',
                ),
              ),
              TextField(
                controller: _currency,
                enabled: !_busy && pending == null && _enabled,
                textCapitalization: TextCapitalization.characters,
                maxLength: 3,
                decoration: const InputDecoration(labelText: 'Currency'),
              ),
            ],
            TextField(
              controller: _reason,
              enabled: !_busy && pending == null && _enabled,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Reason for this correction',
              ),
            ),
            FilledButton(
              onPressed: _canEdit ? () => unawaited(_submit()) : null,
              child: const Text('Save cost revision'),
            ),
            _button(
              'Close editor',
              _busy || pending != null
                  ? null
                  : () => setState(() => _edit = null),
            ),
          ]),
        _panel([
          Text(
            'Cost history',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const Text(
            'Private to you. Corrections cover the whole recorded line and retain the original sale evidence.',
          ),
          _button(
            'Refresh cost history',
            _loading || _busy || edit != null ? null : () => unawaited(_load()),
          ),
          if (_message.isNotEmpty) Text(_message),
          if (_error.isNotEmpty) Text(_error, semanticsLabel: 'Error: $_error'),
        ]),
        if (pending != null)
          _panel([
            Text(
              'Saved correction needs an outcome',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(
              '${pending['receipt']['number']} · Line ${(pending['lineIndex'] as int) + 1}',
            ),
            Text(
              pending['action'] == 'restore'
                  ? 'Restore original evidence'
                  : '${pending['cost']['currency']} ${eventMoneyText(pending['cost']['minor'] as String)} for the whole line',
            ),
            Text(pending['reason'] as String),
            Wrap(
              spacing: 8,
              children: [
                _button(
                  'Check saved correction',
                  _busy ? null : () => unawaited(_recover('recover')),
                ),
                _button(
                  'Retry exact correction',
                  _busy || !_enabled
                      ? null
                      : () => unawaited(_recover('retry')),
                ),
                _button(
                  'Cancel pending request',
                  _busy ? null : () => unawaited(_recover('cancel')),
                ),
              ],
            ),
            const Text(
              'If it already saved, cancellation recovers that saved revision.',
            ),
          ]),
        _panel([
          Wrap(
            spacing: 8,
            children: [
              _button('From ${_date(_from)}', () => unawaited(_pickDate(true))),
              _button(
                'Through ${_date(_to)}',
                () => unawaited(_pickDate(false)),
              ),
            ],
          ),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Receipt, customer or item',
            ),
            onChanged: (value) => setState(() {
              _query = value;
              _limit = 100;
            }),
          ),
          DropdownButtonFormField<String>(
            initialValue: _basis,
            isExpanded: true,
            itemHeight: null,
            decoration: const InputDecoration(labelText: 'Cost basis'),
            items: const [
              DropdownMenuItem(
                value: 'original',
                child: Text('Original cost at sale'),
              ),
              DropdownMenuItem(
                value: 'owner_corrected',
                child: Text('Later owner corrections'),
              ),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _basis = value);
            },
          ),
          Text(
            'Dates use this device’s time zone. ${_basis == 'original' ? 'Uses only original cost-at-sale evidence.' : 'Uses the latest applicable owner revision, with original evidence for unchanged or restored lines.'}',
          ),
          if (_loading)
            const LinearProgressIndicator()
          else if (!valid)
            const Text('Choose a valid date range.')
          else if (reportError.isNotEmpty)
            Text(reportError)
          else if (report != null) ...[
            Text(
              'Profit on covered sales',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SelectableText(
              report['knownProfitMinor'] == null
                  ? 'Unavailable'
                  : profitMoney(report['knownProfitMinor'] as String),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            Text(
              'Covered cost: ${profitMoney(report['knownCostMinor'] as String)}',
            ),
            Text(
              'Sales without qualified cost: ${profitMoney(report['unknownSalesMinor'] as String)}',
            ),
            Text(
              '${report['knownLines']} of ${report['totalLines']} lines · ${report['knownUnits']} of ${report['totalUnits']} units covered.',
            ),
            if (report.containsKey('attestedLines'))
              Text(
                '${report['attestedLines']} lines use later cost attestations; ${report['restoredLines']} use restored original evidence.',
              ),
            for (final reason in report['reasons'] as List)
              Text(
                '${costGapLabel(reason['reason'] as String)}: ${reason['lines']} lines · ${profitMoney(reason['salesMinor'] as String)}',
              ),
            Builder(
              builder: (anchor) => _button(
                'Export private profit CSV',
                () => unawaited(_export(rows, states, anchor)),
              ),
            ),
          ] else
            const Text(
              'Original cost history is unavailable. Refresh to try again.',
            ),
          if (_costError.isNotEmpty) Text(_costError),
          if (!_loading && !_enabled)
            const Text(
              'New corrections are currently unavailable. Existing history and saved-request recovery remain accessible.',
            ),
          const Text(
            'Unknown cost is never zero. Foreign-currency costs are excluded from USD profit. Corrections cannot supply a missing historical discount allocation. Tax, payment movements and event expenses are separate.',
          ),
        ]),
        Text(
          'Recorded sale lines',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (rows.isEmpty && !_loading)
          const Text('No sales match these filters.'),
        for (final receipt in rows.take(_limit))
          Card(
            child: ExpansionTile(
              key: ValueKey(receipt['id']),
              title: Text(receipt['number'] as String),
              subtitle: Text(
                '${DateTime.parse(receipt['createdAt'] as String).toLocal()} · ${(receipt['items'] as List).length} lines',
              ),
              children: [
                for (
                  var index = 0;
                  index < (receipt['items'] as List).length;
                  index++
                )
                  Builder(
                    builder: (context) {
                      final item = receipt['items'][index] as Map,
                          state = _stateFor(receipt),
                          revision = _revision(state, index),
                          aligned =
                              state?['source'] != null &&
                              sameCostEvidence(state?['receipt'], receipt);
                      return _panel([
                        Text('${item['quantity']} × ${item['description']}'),
                        Text(
                          revision == null
                              ? 'No later cost correction.'
                              : 'Latest revision ${revision['revision']} · ${DateTime.parse(revision['recordedAt'] as String).toLocal()} · ${_revisionLabel(revision)}',
                        ),
                        Wrap(
                          spacing: 8,
                          children: [
                            _button(
                              'Correct cost',
                              _canEdit && aligned && edit == null
                                  ? () => _startEdit(receipt, index)
                                  : null,
                            ),
                            _button(
                              'Revision history',
                              _loading || _busy || _historyBusy
                                  ? null
                                  : () => unawaited(
                                      _loadHistory(
                                        receipt['id'] as String,
                                        index,
                                      ),
                                    ),
                            ),
                          ],
                        ),
                        if (!aligned)
                          const Text(
                            'This receipt needs an unambiguous saved identity before a correction can apply.',
                          ),
                      ]);
                    },
                  ),
              ],
            ),
          ),
        if (rows.length > _limit)
          _button('Show more receipts', () => setState(() => _limit += 100)),
        if (_historyTarget != null)
          _panel([
            Text(
              'Line ${_historyTarget!.lineIndex + 1} · Revision history',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SelectableText('Receipt ${_historyTarget!.receiptId}'),
            if (_history.isEmpty) const Text('No later cost revisions.'),
            for (final o in _history) ...[
              Text('Revision ${o['revision']} · ${_revisionLabel(o as Map)}'),
              Text(
                '${DateTime.parse(o['recordedAt'] as String).toLocal()} · Recorded by you',
              ),
              Text(o['request']['reason'] as String),
              const Divider(),
            ],
            if (_historyMore)
              _button(
                'Earlier revisions',
                _historyBusy
                    ? null
                    : () => unawaited(
                        _loadHistory(
                          _historyTarget!.receiptId,
                          _historyTarget!.lineIndex,
                          more: true,
                        ),
                      ),
              ),
            _button(
              'Close revision history',
              _historyBusy
                  ? null
                  : () => setState(() {
                      _historyGeneration++;
                      _historyTarget = null;
                      _history = [];
                    }),
            ),
          ]),
      ],
    );
  }
}
