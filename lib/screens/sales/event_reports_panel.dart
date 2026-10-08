import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/sales/event_service.dart';
import '../../services/sales/event_report_loader.dart';
import '../../services/sales/event_report.dart';
import '../../services/sales/vendor_events.dart';
import '../../services/sales/sales_profit.dart';
import '../../services/sales/sales_purchase.dart';
import '../../services/sales/sales_payments.dart';
import 'event_edit_panel.dart';

const kVendorEventsEnabled = bool.fromEnvironment('GV_VENDOR_EVENTS_V1');

class EventReportsPanel extends StatefulWidget {
  const EventReportsPanel({
    super.key,
    required this.service,
    required this.reader,
    this.allowNewEdits = true,
  });
  final EventService service;
  final EventReportSource reader;
  final bool allowNewEdits;
  @override
  State<EventReportsPanel> createState() => _EventReportsPanelState();
}

class _EventReportsPanelState extends State<EventReportsPanel> {
  Map<String, dynamic>? _state, _journal, _data, _report, _history;
  EventEditDraft? _edit;
  String? _selectedId;
  String _section = 'Totals',
      _query = '',
      _method = '',
      _scope = 'suggested',
      _error = '',
      _reportError = '',
      _historyError = '',
      _message = '';
  bool _loading = true, _busy = false, _closed = false, _historyLoading = false;
  int _generation = 0, _receiptLimit = 200;
  final _chosen = <String>{};
  final _search = TextEditingController();
  final _scroll = ScrollController();
  StreamSubscription<void>? _subscription;
  Map? get _event =>
      (_state?['events'] as List?)
              ?.where((e) => e['eventId'] == _selectedId)
              .firstOrNull
          as Map?;
  Map? get _selection => _state?['selected']?['eventId'] == _selectedId
      ? (_state?['selected'] as Map?)
      : null;
  Map? get _pending => _journal?['pending'] as Map?;
  bool get _editable =>
      widget.allowNewEdits &&
      _state?['entryEnabled'] == true &&
      !_loading &&
      !_busy &&
      _pending == null &&
      _error.isEmpty;
  bool get _openEditable => _editable && _event?['status'] == 'open';
  bool _current(int generation) =>
      mounted && !_closed && generation == _generation;
  @override
  void initState() {
    super.initState();
    _subscription = widget.service.accountChanges.listen((_) {
      if (!mounted) return;
      _generation++;
      setState(() {
        _closed = true;
        _state = null;
        _data = null;
        _report = null;
        _journal = null;
        _history = null;
        _edit = null;
        _search.clear();
        _chosen.clear();
      });
    });
    unawaited(_load());
  }

  @override
  void dispose() {
    _generation++;
    unawaited(_subscription?.cancel());
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<bool> _load({String? eventId, bool retainSelection = true}) async {
    if (_closed) return false;
    final generation = ++_generation,
        id = retainSelection ? (eventId ?? _selectedId) : eventId;
    setState(() {
      _selectedId = id;
      _loading = true;
      _error = '';
      _reportError = '';
      _data = null;
      _report = null;
      _chosen.clear();
      _receiptLimit = 200;
      _history = null;
      _historyError = '';
      _historyLoading = false;
    });
    try {
      final journal = widget.service.journal().then((row) {
        if (_current(generation)) setState(() => _journal = row);
        return row;
      });
      final replies = await Future.wait<Object?>([
        widget.service.read(id),
        journal,
      ]);
      widget.service.checkOwner();
      if (!_current(generation)) return false;
      final state = replies[0] as Map<String, dynamic>;
      setState(() => _state = state);
      if (id != null && state['receiptAccess'] == true) {
        try {
          final data = await widget.reader.report(
            id,
            state: state,
            isCurrent: () => _current(generation),
          );
          widget.service.checkOwner();
          if (!_current(generation)) return false;
          setState(() {
            _data = data;
            _compute();
          });
        } catch (_) {
          widget.service.checkOwner();
          if (_current(generation)) {
            setState(
              () => _reportError =
                  'Receipt or private cost history could not load. Totals are unavailable until this event refreshes.',
            );
          }
        }
      }
      if (_section == 'History') {
        unawaited(_loadHistory());
      }
      return true;
    } catch (_) {
      if (_current(generation)) {
        setState(
          () => _error =
              'Events could not refresh. Saved receipts and event edits are retained.',
        );
      }
      return false;
    } finally {
      if (_current(generation)) setState(() => _loading = false);
    }
  }

  void _compute() {
    final data = _data;
    if (data == null) {
      _report = null;
      return;
    }
    try {
      _report = eventReport(
        state: data['state'],
        ownerId: widget.service.ownerId,
        eventId: _selectedId!,
        bookRevision: data['bookRevision'] as String,
        receipts: data['receipts'] as List,
        snapshots: data['snapshots'] as List,
        query: _query,
        method: _method,
      );
      _reportError = '';
    } catch (_) {
      _report = null;
      _reportError =
          'Saved receipt or cost data needs review before event totals can be shown.';
    }
  }

  void _start(String type, Map<String, String> values) {
    if (_state == null) return;
    setState(() {
      _error = '';
      _message = '';
      _edit = EventEditDraft(
        type: type,
        values: values,
        serverRevision: _state!['revision'] as String,
        localRevision: _journal?['localRevision'] as String?,
      );
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) {
        unawaited(
          _scroll.animateTo(
            0,
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
          ),
        );
      }
    });
  }

  String _today() => DateTime.now().toIso8601String().substring(0, 10);
  void _newEvent() => _start('event_create', {
    'eventId': newEventId(),
    'name': '',
    'startDate': _today(),
    'endDate': _today(),
    'timeZone': '',
    'notes': '',
  });
  void _expense([Map? expense]) {
    final event = _event;
    if (event == null) return;
    _start(expense == null ? 'expense_create' : 'expense_update', {
      'eventId': event['eventId'] as String,
      'expenseId': expense?['expenseId'] as String? ?? newEventId(),
      'description': expense?['description'] as String? ?? '',
      'category': expense?['category'] as String? ?? 'booth',
      'amount': expense == null
          ? ''
          : eventMoneyText(expense['amountMinor'] as String),
      'incurredOn':
          expense?['incurredOn'] as String? ?? event['startDate'] as String,
      'reason': '',
    });
  }

  Future<void> _attempt(EventAttempt result) async {
    widget.service.checkOwner();
    if (!mounted || _closed) return;
    setState(() => _journal = result.journal);
    if (result.status == 'saved') {
      final op = result.acknowledgement!['operation'] as Map;
      setState(() {
        _edit = null;
        _message = 'Event change saved.';
      });
      await _load(
        eventId: op['type'] == 'event_create'
            ? op['eventId'] as String
            : _selectedId,
      );
      if (op['type'] == 'event_create' && mounted && _scroll.hasClients) {
        _scroll.jumpTo(0);
      }
    } else if (result.status == 'unconfirmed') {
      setState(
        () => _error =
            result.message ??
            'The exact request is saved. Check its result before another edit.',
      );
    } else if (result.status == 'rejected') {
      setState(
        () => _error = result.code == 'PT409'
            ? 'Events changed. Your proposed edit is retained for review.'
            : result.code == '42501'
            ? 'New event edits are unavailable. Your proposed edit is retained.'
            : 'This edit needs review. Your proposed change is retained.',
      );
    }
    if ((result.status == 'unconfirmed' || result.status == 'rejected') &&
        mounted &&
        _scroll.hasClients) {
      _scroll.jumpTo(0);
    }
  }

  Future<void> _save(
    Map<String, dynamic> operation,
    String revision,
    String? localRevision,
  ) async {
    if (_busy || _closed) return;
    setState(() {
      _busy = true;
      _error = '';
      _message = '';
    });
    try {
      await _attempt(
        await widget.service.begin(operation, revision, localRevision),
      );
    } catch (_) {
      try {
        widget.service.checkOwner();
        final row = await widget.service.journal();
        if (mounted && !_closed) {
          setState(() {
            _journal = row;
            _error =
                'The edit could not be safely saved. Refresh to review its saved request before trying again.';
          });
        }
      } catch (_) {
        /* Retain saved bytes; account changes clear this view. */
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _submit() {
    final edit = _edit;
    if (edit == null) return;
    try {
      final op = edit.operation();
      unawaited(_save(op, edit.serverRevision, edit.localRevision));
    } on FormatException catch (error) {
      setState(
        () => _error = error.message.startsWith('Enter a USD')
            ? error.message
            : 'Review the event dates, time zone and required details before saving.',
      );
    }
  }

  Future<void> _recover() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      await _attempt(await widget.service.recover());
    } catch (_) {
      if (mounted && !_closed) {
        setState(
          () => _error =
              'The saved request could not be checked. Its payload is retained.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _review() async {
    final old = _journal;
    if (old?['pending'] == null || old?['rejection'] == null || _busy) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final op = Map<String, dynamic>.from(old!['pending']['operation'] as Map),
          type = op['type'];
      final target = type == 'event_create'
          ? null
          : type == 'receipts_assign'
          ? (op['eventId'] ?? op['receipts'][0]['previousEventId'])
          : op['eventId'];
      if (!await _load(eventId: target as String?, retainSelection: false)) {
        throw StateError('Refresh required');
      }
      final cleared = await widget.service.discardRejected(
        old['localRevision'] as String,
      );
      widget.service.checkOwner();
      if (!mounted || _closed) return;
      setState(() {
        _journal = cleared;
        if (type == 'receipts_assign') {
          _edit = null;
          _section = 'Receipts';
          _scope = 'all';
          _chosen.addAll(
            (op['receipts'] as List).map((r) => r['receiptId'] as String),
          );
          _message =
              'Review current receipt assignments, then apply your selection.';
        } else {
          final values = {
            for (final entry in op.entries)
              if (entry.key != 'type' && entry.value is String)
                entry.key: entry.value as String,
          };
          if (type == 'expense_create' || type == 'expense_update') {
            values['amount'] = eventMoneyText(op['amountMinor'] as String);
          }
          _edit = EventEditDraft(
            type: type as String,
            values: values,
            serverRevision: _state!['revision'] as String,
            localRevision: cleared['localRevision'] as String,
          );
        }
      });
    } catch (_) {
      if (mounted && !_closed) {
        setState(
          () => _error =
              'The proposed edit could not reopen. Refresh and check its saved status.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _loadHistory([String? cursor]) async {
    final id = _selectedId, generation = _generation;
    if (id == null || _historyLoading) return;
    setState(() {
      _historyLoading = true;
      _historyError = '';
    });
    try {
      final page = await widget.reader.history(id, beforeRevision: cursor);
      widget.service.checkOwner();
      if (!_current(generation)) return;
      setState(
        () => _history = cursor != null && _history != null
            ? {
                ...page,
                'rows': [..._history!['rows'] as List, ...page['rows'] as List],
              }
            : page,
      );
    } catch (_) {
      if (_current(generation)) {
        setState(
          () => _historyError = 'Change history could not load. Try again.',
        );
      }
    } finally {
      if (_current(generation)) setState(() => _historyLoading = false);
    }
  }

  Future<void> _assign(bool remove) async {
    final data = _data, event = _event;
    if (data == null || event == null) return;
    final assigned = {
          for (final a in data['state']['selected']['assignments'] as List)
            a['receiptId']: a['eventId'],
        },
        ids = _chosen.toList()..sort();
    final receipts = ids
        .where(
          (id) => remove
              ? assigned[id] == _selectedId
              : assigned[id] != _selectedId,
        )
        .map((id) => {'receiptId': id, 'previousEventId': assigned[id]})
        .toList();
    if (receipts.isEmpty) {
      setState(
        () => _error = 'Choose receipts whose event assignment will change.',
      );
      return;
    }
    if (receipts.length > 100) {
      setState(() => _error = 'Choose up to 100 receipts for one change.');
      return;
    }
    await _save(
      {
        'type': 'receipts_assign',
        'eventId': remove ? null : _selectedId,
        'receipts': receipts,
      },
      data['state']['revision'] as String,
      _journal?['localRevision'] as String?,
    );
  }

  Future<void> _export(BuildContext anchor) async {
    final report = _report;
    if (report == null) return;
    final box = anchor.findRenderObject()! as RenderBox;
    try {
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile.fromData(
              Uint8List.fromList(utf8.encode(eventReportCsv(report))),
              mimeType: 'text/csv',
            ),
          ],
          fileNameOverrides: [
            'Grookai-event-${report['event']['startDate']}.csv',
          ],
          sharePositionOrigin: box.localToGlobal(Offset.zero) & box.size,
        ),
      );
    } catch (_) {
      if (mounted && !_closed) {
        setState(() => _error = 'Export could not open. Please try again.');
      }
    }
  }

  Widget _notice(String text, {bool error = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Semantics(
      liveRegion: true,
      child: Text(
        text,
        style: error
            ? TextStyle(color: Theme.of(context).colorScheme.error)
            : null,
      ),
    ),
  );
  Widget _button(String text, VoidCallback? action) =>
      OutlinedButton(onPressed: action, child: Text(text));
  Widget _filters() => ExpansionTile(
    key: ValueKey('filters-$_section'),
    initiallyExpanded: _section == 'Receipts',
    tilePadding: EdgeInsets.zero,
    title: Text(
      _report?['receiptsFiltered'] == true
          ? 'Receipt filters · Active'
          : 'Filter receipts',
    ),
    children: [
      TextField(
        controller: _search,
        decoration: const InputDecoration(
          labelText: 'Search event receipts',
          hintText: 'Receipt, customer or item',
        ),
        onChanged: (value) => setState(() {
          _query = value;
          _receiptLimit = 200;
          _compute();
        }),
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(
        initialValue: _method,
        decoration: const InputDecoration(labelText: 'Receipt payment filter'),
        isExpanded: true,
        items: [
          const DropdownMenuItem(value: '', child: Text('All methods')),
          ...salesTenderMethods.map(
            (method) => DropdownMenuItem(value: method, child: Text(method)),
          ),
        ],
        onChanged: (value) => setState(() {
          _method = value ?? '';
          _receiptLimit = 200;
          _compute();
        }),
      ),
      const SizedBox(height: 12),
    ],
  );
  Widget _totals() {
    final report = _report!, profit = report['profit'] as Map;
    final metrics = {
      'Item sales': 'salesMinor',
      'Money received': 'receivedMinor',
      'Money paid out': 'paidMinor',
      'Inventory purchases': 'inventoryPurchaseMinor',
      'Trade credit given': 'tradeCreditMinor',
      'Operating expenses': 'operatingExpenseMinor',
      'Tax recorded': 'taxMinor',
      'Cash tendered (known)': 'knownCashTenderedMinor',
      'Cash change (known)': 'knownCashChangeMinor',
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Known-cost event subtotal'),
                Text(
                  report['knownCostEventSubtotalMinor'] == null
                      ? 'Unavailable'
                      : profitMoney(
                          report['knownCostEventSubtotalMinor'] as String,
                        ),
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  profit['knownLines'] == profit['totalLines'] &&
                          profit['totalLines'] > 0
                      ? 'All selected sale lines covered'
                      : 'Partial cost coverage',
                ),
                const SizedBox(height: 8),
                Text(
                  '${profit['knownLines']} of ${profit['totalLines']} sale lines have qualified historical cost. ${profitMoney(profit['unknownSalesMinor'] as String)} in item sales remains uncovered.',
                ),
                const SizedBox(height: 8),
                Text(
                  profit['knownProfitMinor'] == null
                      ? 'No qualified sales profit is available.'
                      : '${profitMoney(profit['knownProfitMinor'] as String)} known gross profit minus ${profitMoney(report['operatingExpenseMinor'] as String)} in all active event expenses.',
                ),
                if ((profit['reasons'] as List).isNotEmpty)
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: const Text('Why costs are incomplete'),
                    children: [
                      for (final reason in profit['reasons'] as List)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(costGapLabel(reason['reason'] as String)),
                          subtitle: Text(
                            '${profitMoney(reason['salesMinor'] as String)} (${reason['lines']} sale lines)',
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        if (report['receiptsFiltered'] == true)
          _notice(
            'Receipt filters are active. All active event expenses remain included in the subtotal and CSV.',
          ),
        LayoutBuilder(
          builder: (context, constraints) => Wrap(
            spacing: 8,
            runSpacing: 8,
            children: metrics.entries
                .map(
                  (entry) => SizedBox(
                    width: (constraints.maxWidth - 8) / 2,
                    child: Card(
                      margin: EdgeInsets.zero,
                      child: Padding(
                        padding: const EdgeInsets.all(13),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(entry.key),
                            const SizedBox(height: 8),
                            Text(
                              profitMoney(report[entry.value] as String),
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ),
        _notice(
          '${report['transactions']} displayed receipts of ${report['assignedReceipts']} assigned. ${report['unknownCashTenderReceipts'] > 0 ? '${report['unknownCashTenderReceipts']} older cash receipts do not record tender or change.' : ''}',
        ),
        Builder(
          builder: (anchor) => _button(
            'Export this event CSV',
            _loading ? null : () => unawaited(_export(anchor)),
          ),
        ),
        _notice(
          'Based on recorded receipts, historical costs and event expenses. Refunds, online orders and processor settlements are outside this report.',
        ),
      ],
    );
  }

  Widget _receipts() {
    final data = _data,
        selected = data?['state']['selected'] as Map?,
        assigned = {
          for (final a in selected?['assignments'] as List? ?? [])
            a['receiptId']: a['eventId'],
        },
        candidates = {
          for (final c in selected?['candidates'] as List? ?? [])
            c['receiptId']: c['localDate'],
        };
    final unique = {
      for (final r in data?['receipts'] as List? ?? [])
        (r['id'] as String).toLowerCase(): r,
    };
    final rows =
        _report == null
              ? <dynamic>[]
              : unique.values.where((r) {
                  final id = (r['id'] as String).toLowerCase();
                  if (_scope == 'suggested' && !candidates.containsKey(id)) {
                    return false;
                  }
                  if (_scope == 'assigned' && assigned[id] != _selectedId) {
                    return false;
                  }
                  if (_method.isNotEmpty &&
                      r['method'] != _method &&
                      !receiptTenders(r).any((t) => t['method'] == _method)) {
                    return false;
                  }
                  return [
                        r['number'],
                        r['customerName'],
                        ...(r['items'] as List).map((i) => i['description']),
                        ...((r['tradeIn']?['items'] ?? []) as List).map(
                          (i) => i['description'],
                        ),
                      ]
                      .join(' ')
                      .toLowerCase()
                      .contains(_query.trim().toLowerCase());
                }).toList()
          ..sort(
            (a, b) => DateTime.parse(
              b['createdAt'] as String,
            ).compareTo(DateTime.parse(a['createdAt'] as String)),
          );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _notice(
          'Dates suggest receipts. Only saved assignments count toward this event.',
        ),
        DropdownButtonFormField<String>(
          initialValue: _scope,
          decoration: const InputDecoration(labelText: 'Show receipts'),
          isExpanded: true,
          items: const [
            DropdownMenuItem(
              value: 'suggested',
              child: Text('Suggested by event dates'),
            ),
            DropdownMenuItem(
              value: 'assigned',
              child: Text('Assigned to this event'),
            ),
            DropdownMenuItem(value: 'all', child: Text('All saved receipts')),
          ],
          onChanged: (value) => setState(() {
            _scope = value ?? 'suggested';
            _chosen.clear();
            _receiptLimit = 200;
          }),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _button(
              'Add selected to event',
              _openEditable && _chosen.isNotEmpty && _edit == null
                  ? () => unawaited(_assign(false))
                  : null,
            ),
            _button(
              'Remove selected from event',
              _openEditable && _chosen.isNotEmpty && _edit == null
                  ? () => unawaited(_assign(true))
                  : null,
            ),
          ],
        ),
        _notice('${_chosen.length} selected · Up to 100 per change'),
        for (final r in rows.take(_receiptLimit))
          Builder(
            builder: (context) {
              final id = (r['id'] as String).toLowerCase(),
                  event = (_state?['events'] as List? ?? [])
                      .where((e) => e['eventId'] == assigned[id])
                      .firstOrNull;
              return Card(
                child: CheckboxListTile(
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _chosen.contains(id),
                  onChanged:
                      !_openEditable ||
                          _edit != null ||
                          (!_chosen.contains(id) && _chosen.length >= 100)
                      ? null
                      : (checked) => setState(() {
                          if (checked == true) {
                            _chosen.add(id);
                          } else {
                            _chosen.remove(id);
                          }
                        }),
                  title: Text(r['number'] as String),
                  subtitle: Text(
                    '${r['customerName'] ?? ''}\n${candidates[id] != null ? '${candidates[id]} event date' : '${DateTime.parse(r['createdAt'] as String).toUtc().toIso8601String().substring(0, 10)} UTC'}\n${assigned[id] == null ? 'Unassigned' : 'Assigned to ${event?['name'] ?? 'an event'}'}\n${profitMoney('${isPurchaseReceipt(r) ? r['purchaseMinor'] : r['totalMinor']}')} · ${isPurchaseReceipt(r)
                        ? 'purchase'
                        : r['tradeIn'] != null
                        ? 'sale before trade credit'
                        : 'sale incl. tax'}',
                  ),
                ),
              );
            },
          ),
        if (rows.length > _receiptLimit)
          _button(
            'Show more matching receipts',
            () => setState(() => _receiptLimit += 200),
          ),
        if (!_loading && rows.isEmpty)
          _notice(
            'No receipts in this view. Try all saved receipts or adjust your search.',
          ),
      ],
    );
  }

  Widget _expenses() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _notice(
        'Record booth, travel and other operating expenses. Inventory purchases and trade payouts stay in receipts.',
      ),
      _button(
        'Add expense',
        _openEditable && _edit == null ? () => _expense() : null,
      ),
      for (final expense in _selection?['expenses'] as List? ?? [])
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${expense['description']}${expense['voided'] == true ? ' · Voided' : ''}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text('${expense['category']} · ${expense['incurredOn']}'),
                Text(profitMoney(expense['amountMinor'] as String)),
                if ((expense['lastReason'] as String).isNotEmpty)
                  Text(expense['lastReason'] as String),
                if (expense['voided'] != true)
                  Wrap(
                    spacing: 8,
                    children: [
                      _button(
                        'Amend ${expense['description']}',
                        _openEditable && _edit == null
                            ? () => _expense(expense as Map)
                            : null,
                      ),
                      _button(
                        'Void ${expense['description']}',
                        _openEditable && _edit == null
                            ? () => _start('expense_void', {
                                'eventId': expense['eventId'] as String,
                                'expenseId': expense['expenseId'] as String,
                                'reason': '',
                              })
                            : null,
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      if ((_selection?['expenses'] as List? ?? []).isEmpty)
        _notice('No event expenses recorded.'),
    ],
  );
  Widget _changes() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (_historyLoading) const LinearProgressIndicator(),
      if (_historyError.isNotEmpty) ...[
        _notice(_historyError, error: true),
        _button(
          'Try history again',
          () => unawaited(_loadHistory(_history?['nextRevision'] as String?)),
        ),
      ],
      for (final row in _history?['rows'] as List? ?? [])
        Builder(
          builder: (context) {
            final op = row['operation'] as Map;
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      eventOperationLabels[op['type']] ?? 'Event changed',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      DateTime.parse(
                        row['createdAt'] as String,
                      ).toLocal().toString(),
                    ),
                    if (op['name'] != null)
                      Text(
                        '${op['name']} · ${op['startDate']} – ${op['endDate']} · ${op['timeZone']}',
                      ),
                    if (op['description'] != null)
                      Text(
                        '${op['description']} · ${profitMoney(op['amountMinor'] as String)}',
                      ),
                    if (op['reason'] != null) Text(op['reason'] as String),
                    if (op['type'] == 'receipts_assign')
                      Text(
                        '${(op['receipts'] as List).length} receipt assignments changed.',
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      if (_history?['nextRevision'] != null)
        _button(
          'Load earlier changes',
          _historyLoading
              ? null
              : () => unawaited(
                  _loadHistory(_history!['nextRevision'] as String),
                ),
        ),
    ],
  );
  @override
  Widget build(BuildContext context) {
    if (_closed) {
      return const Center(child: Text('Your account changed. Reopen Reports.'));
    }
    final event = _event;
    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      children: [
        DropdownButtonFormField<String>(
          key: ValueKey(_selectedId),
          initialValue: event == null ? null : _selectedId,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Event',
            border: OutlineInputBorder(),
          ),
          items: [
            for (final e in _state?['events'] as List? ?? [])
              DropdownMenuItem(
                value: e['eventId'] as String,
                child: Text(
                  '${e['name']}${e['status'] == 'closed' ? ' · Closed' : ''}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
          onChanged: _busy || _edit != null
              ? null
              : (id) {
                  _search.clear();
                  _query = '';
                  _method = '';
                  _section = 'Totals';
                  unawaited(_load(eventId: id, retainSelection: false));
                },
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: _editable && _edit == null ? _newEvent : null,
              child: const Text('Create event'),
            ),
            _button(
              'Refresh events',
              _loading || _busy ? null : () => unawaited(_load()),
            ),
          ],
        ),
        if (_message.isNotEmpty) _notice(_message),
        if (_error.isNotEmpty) _notice(_error, error: true),
        if (_pending != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _journal?['rejection'] != null
                        ? 'An event edit needs review'
                        : 'An event save needs checking',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '${eventOperationLabels[_pending!['operation']['type']]}. The exact request is saved on this device. Check its result before starting another edit.',
                  ),
                  Wrap(
                    spacing: 8,
                    children: [
                      _button(
                        'Check saved result',
                        _busy ? null : () => unawaited(_recover()),
                      ),
                      if (_journal?['rejection'] != null)
                        _button(
                          'Review proposed edit',
                          _busy || _loading ? null : () => unawaited(_review()),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        if (_edit != null)
          EventEditPanel(
            key: ObjectKey(_edit),
            draft: _edit!,
            disabled:
                _busy ||
                _pending != null ||
                !widget.allowNewEdits ||
                _state?['entryEnabled'] != true,
            busy: _busy,
            save: _submit,
            close: () => setState(() => _edit = null),
          ),
        if (_loading) const LinearProgressIndicator(),
        if (!_loading &&
            _state != null &&
            (!widget.allowNewEdits || _state!['entryEnabled'] != true))
          _notice(
            'New event edits are currently unavailable. Saved events and request recovery remain accessible.',
          ),
        if (event == null && !_loading) ...[
          Text(
            (_state?['events'] as List? ?? []).isEmpty
                ? 'Close out your next show'
                : 'Choose an event',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          _notice(
            'Connect saved receipts, record operating expenses and review the costs behind your results.',
          ),
        ],
        if (event != null) ...[
          const SizedBox(height: 12),
          Text(
            event['name'] as String,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(
            '${event['status'] == 'closed' ? 'Closed' : 'Open'} · ${event['startDate']} – ${event['endDate']} · ${event['timeZone']}',
          ),
          Wrap(
            spacing: 8,
            children: [
              _button(
                'Edit details',
                _openEditable && _edit == null
                    ? () => _start('event_update', {
                        for (final key in [
                          'eventId',
                          'name',
                          'startDate',
                          'endDate',
                          'timeZone',
                          'notes',
                        ])
                          key: event[key] as String,
                      })
                    : null,
              ),
              _button(
                event['status'] == 'closed' ? 'Reopen event' : 'Close event',
                _editable && _edit == null
                    ? () => _start(
                        event['status'] == 'closed'
                            ? 'event_reopen'
                            : 'event_close',
                        {'eventId': event['eventId'] as String, 'reason': ''},
                      )
                    : null,
              ),
            ],
          ),
          Wrap(
            spacing: 5,
            runSpacing: 5,
            children: ['Totals', 'Receipts', 'Expenses', 'History']
                .map(
                  (section) => ChoiceChip(
                    label: Text(section),
                    selected: _section == section,
                    onSelected: (_) {
                      setState(() => _section = section);
                      if (section == 'History' &&
                          _history == null &&
                          !_historyLoading) {
                        unawaited(_loadHistory());
                      }
                    },
                  ),
                )
                .toList(),
          ),
          if (_section == 'Totals' || _section == 'Receipts') _filters(),
          if (_reportError.isNotEmpty) _notice(_reportError, error: true),
          if (_state?['receiptAccess'] != true)
            _notice(
              'Receipt access is currently unavailable. Saved assignments, expenses and change history remain private and available.',
            ),
          if (_section == 'Totals' && _report != null) _totals(),
          if (_section == 'Receipts') _receipts(),
          if (_section == 'Expenses') _expenses(),
          if (_section == 'History') _changes(),
        ],
      ],
    );
  }
}
