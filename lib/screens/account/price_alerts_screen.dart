import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../services/notifications/price_target_service.dart';
import '../../services/notifications/price_targets.dart';
import 'notification_settings_screen.dart';

String _compactPrintingIdentifier(String value) {
  if (value.length <= 21) return value;
  return '${value.substring(0, 10)}…${value.substring(value.length - 8)}';
}

class PriceAlertsScreen extends StatefulWidget {
  const PriceAlertsScreen({super.key, this.service, this.initialTargetId});
  final PriceTargetService? service;
  final String? initialTargetId;
  @override
  State<PriceAlertsScreen> createState() => _PriceAlertsScreenState();
}

class _PriceAlertsScreenState extends State<PriceAlertsScreen> {
  PriceTargetService? _service;
  PriceTargets? _model;
  final _query = TextEditingController(), _amount = TextEditingController();
  final _scroll = ScrollController();
  final _targetKeys = <String, GlobalKey>{};
  bool _busy = false, _closed = false, _opened = false, _creating = false;
  String? _error, _notice, _printing;
  String _direction = 'at_or_below';
  Map<String, dynamic>? _catalog, _card, _pending;
  PriceTarget? _selected;
  int _offset = 0;
  @override
  void initState() {
    super.initState();
    _service = widget.service;
    if (_service == null) {
      final owner = Supabase.instance.client.auth.currentUser?.id;
      if (owner != null) _service = PriceTargetService(ownerId: owner);
    }
    _service?.addListener(_ownerChanged);
    if (_service == null) {
      _closed = true;
    } else {
      _load();
    }
  }

  void _ownerChanged() {
    if (!mounted || _service?.closed != true) return;
    setState(() {
      _closed = true;
      _model = null;
      _catalog = null;
      _card = null;
      _selected = null;
      _pending = null;
      _amount.clear();
      _query.clear();
    });
  }

  bool get _current => mounted && !_closed && _service?.closed == false;
  bool get _locked => _busy || _pending != null;
  Future<void> _load() async {
    if (!_current || _busy || _pending != null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final next = await _service!.read();
      if (_current) {
        setState(() {
          _model = next;
          _selected = null;
          _amount.clear();
        });
        _openTarget();
      }
    } catch (_) {
      if (_current) {
        setState(() => _error = 'Price alerts could not load. Please retry.');
      }
    } finally {
      if (_current) setState(() => _busy = false);
    }
  }

  void _openTarget() {
    if (_opened ||
        widget.initialTargetId == null ||
        !(_model?.targets.any((t) => t.id == widget.initialTargetId) ??
            false)) {
      return;
    }
    _opened = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_current) return;
      final context = _targetKeys[widget.initialTargetId]?.currentContext;
      if (context != null) {
        Scrollable.ensureVisible(
          context,
          duration: const Duration(milliseconds: 200),
        );
      }
    });
  }

  Future<void> _search([int offset = 0]) async {
    if (!_current || _locked) return;
    if (_query.text.trim().length < 2) {
      setState(() => _error = 'Enter at least two characters to search.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final next = await _service!.catalog(_query.text.trim(), offset);
      if (_current) {
        setState(() {
          _catalog = next;
          _offset = offset;
        });
      }
    } catch (_) {
      if (_current) {
        setState(() => _error = 'Catalog search could not load. Please retry.');
      }
    } finally {
      if (_current) setState(() => _busy = false);
    }
  }

  Future<void> _save({
    bool enabled = true,
    PriceTarget? target,
    bool edit = false,
  }) async {
    if (!_current ||
        _busy ||
        (_pending == null && !(_model?.editEnabled ?? false))) {
      return;
    }
    try {
      _pending ??= Map.unmodifiable(<String, dynamic>{
        'requestId': const Uuid().v4(),
        'id': target?.id ?? const Uuid().v4(),
        'expectedRevision': target?.revision ?? '0',
        'printingId': target?.printingId ?? _printing,
        'direction': edit ? _direction : target?.direction ?? _direction,
        'amount': priceTargetAmount(
          edit ? _amount.text : target?.amount ?? _amount.text,
        ),
        'currency': 'USD',
        'enabled': enabled,
      });
    } on FormatException catch (e) {
      setState(() => _error = e.message);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final selectedEnabled = _pending!['enabled'] == true;
      await _service!.save(_pending!);
      if (!_current) return;
      setState(() {
        _pending = null;
        _creating = false;
        _catalog = null;
        _query.clear();
        _selected = null;
        _card = null;
        _printing = null;
        _amount.clear();
        _notice = selectedEnabled
            ? 'Target saved. It can notify once when an eligible reference matches.'
            : 'Target paused.';
      });
      try {
        final next = await _service!.read();
        if (_current) setState(() => _model = next);
      } catch (_) {
        if (_current) {
          setState(
            () => _error =
                'Your target was saved. Reload alerts to see its current status.',
          );
        }
      }
    } catch (e) {
      if (!_current) return;
      setState(() {
        if (e is PriceTargetFailure && e.definitive) _pending = null;
        _error = e is PriceTargetFailure
            ? e.message
            : 'The save could not be confirmed. Keep this screen open and retry the same request.';
      });
    } finally {
      if (_current) setState(() => _busy = false);
    }
  }

  void _edit(PriceTarget t) {
    setState(() {
      _selected = t;
      _amount.text = t.amount;
      _direction = t.direction;
      _error = null;
      _notice = null;
    });
    _scroll.animateTo(
      0,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  @override
  void dispose() {
    _service?.removeListener(_ownerChanged);
    if (widget.service == null) _service?.dispose();
    _query.dispose();
    _amount.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Widget _panel(List<Widget> children, {Key? key}) => Card(
    key: key,
    margin: const EdgeInsets.symmetric(vertical: 10),
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    ),
  );
  Widget _text(String text, {bool heading = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Text(
      text,
      style: heading ? Theme.of(context).textTheme.titleMedium : null,
    ),
  );
  @override
  Widget build(BuildContext context) {
    final model = _model;
    final cards = (_catalog?['cards'] as List? ?? const []).cast<Map>();
    final printings = (_card?['printings'] as List? ?? const []).cast<Map>();
    Map? selectedPrinting;
    for (final printing in printings) {
      if (printing['id'] == _printing) {
        selectedPrinting = printing;
        break;
      }
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Price alerts'),
        actions: [
          IconButton(
            tooltip: 'Notification settings',
            onPressed: _pending == null
                ? () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const NotificationSettingsScreen(),
                    ),
                  )
                : null,
            icon: const Icon(Icons.notifications_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: _closed
            ? const Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Your account changed. Reopen price alerts from Account.',
                ),
              )
            : ListView(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
                children: [
                  _text(
                    'Get one notification when a fresh TCGPlayer Market reference meets your USD target for an exact raw-card printing.',
                  ),
                  _text(
                    'Uses fresh TCGPlayer Market references. Raw-card references are not slab values, condition-specific valuations or guaranteed sale prices. Quiet hours, card mutes and notification limits apply.',
                  ),
                  if (_error != null)
                    Semantics(liveRegion: true, child: _text(_error!)),
                  if (_notice != null)
                    Semantics(liveRegion: true, child: _text(_notice!)),
                  OutlinedButton(
                    onPressed: _locked ? null : _load,
                    child: Text(_busy ? 'Working…' : 'Reload alerts'),
                  ),
                  if (_pending != null)
                    _panel([
                      _text('Confirm your last save', heading: true),
                      _text(
                        'Keep this screen open. Retry checks the same request without creating another target. Editing stays paused until the result is known.',
                      ),
                      FilledButton(
                        onPressed: _busy ? null : () => _save(),
                        child: const Text('Retry the same save'),
                      ),
                    ]),
                  if (model != null && !model.editEnabled)
                    _text(
                      'Price alert editing is not available yet. Your saved targets remain visible.',
                    ),
                  if (model?.editEnabled == true &&
                      model!.targets.isNotEmpty &&
                      !_creating &&
                      _selected == null &&
                      _pending == null)
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() {
                              _creating = true;
                              _notice = null;
                            }),
                      child: const Text('New price target'),
                    ),
                  if (model?.editEnabled == true &&
                      _pending == null &&
                      (model!.targets.isEmpty ||
                          _creating ||
                          _selected != null))
                    _panel([
                      _text(
                        _selected == null
                            ? 'New price target'
                            : 'Edit price target',
                        heading: true,
                      ),
                      if (_selected != null) ...[
                        _text('${_selected!.name} · ${_selected!.finish}'),
                        _text(_selected!.printingGvId),
                        TextButton(
                          onPressed: _busy
                              ? null
                              : () => setState(() {
                                  _selected = null;
                                  _amount.clear();
                                }),
                          child: const Text('Cancel edit'),
                        ),
                      ] else ...[
                        TextField(
                          controller: _query,
                          enabled: !_busy,
                          maxLength: 120,
                          decoration: const InputDecoration(
                            labelText: 'Search card name or GV-ID',
                          ),
                          onSubmitted: (_) => _search(),
                        ),
                        OutlinedButton(
                          onPressed: _busy ? null : () => _search(),
                          child: const Text('Find cards'),
                        ),
                        for (final c in cards)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: OutlinedButton(
                              onPressed:
                                  _busy || (c['printings'] as List).isEmpty
                                  ? null
                                  : () => setState(() {
                                      _card = Map<String, dynamic>.from(c);
                                      _printing = null;
                                    }),
                              child: Padding(
                                padding: const EdgeInsets.all(8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(c['name'] as String),
                                    Text('${c['set_code']} · ${c['number']}'),
                                    Text(c['gv_id'] as String),
                                    if (_card?['id'] == c['id'])
                                      const Text('Selected card'),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        if (_catalog != null && cards.isEmpty)
                          _text('No cards found. Try the card name or GV-ID.'),
                        if (_catalog != null)
                          Wrap(
                            spacing: 8,
                            children: [
                              TextButton(
                                onPressed: _busy || _offset == 0
                                    ? null
                                    : () => _search(
                                        (_offset - 20).clamp(0, 10000),
                                      ),
                                child: const Text('Previous results'),
                              ),
                              TextButton(
                                onPressed: _busy || _catalog?['more'] != true
                                    ? null
                                    : () => _search(_offset + 20),
                                child: const Text('Next results'),
                              ),
                            ],
                          ),
                        if (_card != null)
                          DropdownButtonFormField<String>(
                            key: ValueKey('printing-${_card!['id']}'),
                            isExpanded: true,
                            initialValue: _printing,
                            decoration: const InputDecoration(
                              labelText: 'Exact printing',
                            ),
                            hint: const Text('Choose a printing'),
                            selectedItemBuilder: (context) => [
                              for (final p in printings)
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    '${p['finish_label']} · ${_compactPrintingIdentifier(p['printing_gv_id']?.toString() ?? 'Unknown')}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                            ],
                            items: [
                              for (final p in printings)
                                DropdownMenuItem(
                                  value: p['id'] as String,
                                  child: Text(
                                    '${p['finish_label']} · ${p['printing_gv_id']}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                            ],
                            onChanged: _busy
                                ? null
                                : (value) => setState(() => _printing = value),
                          ),
                        if (selectedPrinting != null)
                          _text(
                            'Selected printing ID: ${selectedPrinting['printing_gv_id']}',
                          ),
                      ],
                      if (_selected != null || _printing != null) ...[
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          key: ValueKey(
                            'direction-${_selected?.id ?? 'new'}-$_direction',
                          ),
                          isExpanded: true,
                          initialValue: _direction,
                          decoration: const InputDecoration(
                            labelText: 'Notify me when the reference is',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'at_or_below',
                              child: Text('At or below my target'),
                            ),
                            DropdownMenuItem(
                              value: 'at_or_above',
                              child: Text('At or above my target'),
                            ),
                          ],
                          onChanged: _busy
                              ? null
                              : (value) => setState(() => _direction = value!),
                        ),
                        TextField(
                          controller: _amount,
                          enabled: !_busy,
                          maxLength: 1024,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Target amount (USD)',
                          ),
                        ),
                        _text(
                          'Saving starts a new target revision that can notify once, even if the previous target matched.',
                        ),
                        FilledButton(
                          onPressed: _busy
                              ? null
                              : () => _save(target: _selected, edit: true),
                          child: const Text('Save price target'),
                        ),
                      ],
                    ]),
                  if (model != null) ...[
                    _text(
                      'Your targets (${model.targets.length})',
                      heading: true,
                    ),
                    if (model.targets.isEmpty) _text('No price targets yet.'),
                    for (final t in model.targets)
                      _panel([
                        _text(t.name, heading: true),
                        _text(
                          '${t.finish} · ${t.direction == 'at_or_below' ? 'At or below' : 'At or above'} USD ${t.amount}',
                        ),
                        _text(t.printingGvId),
                        _text(t.status),
                        if (t.data['reference'] is Map)
                          _text(
                            'Last eligible reference: USD ${t.data['reference']['amount']}, observed ${t.data['reference']['observedAt']}.',
                          ),
                        if (t.data['triggeredAt'] != null)
                          _text(
                            'Matched ${t.data['triggeredAt']}. Notification delivery depends on your settings and device.',
                          ),
                        Wrap(
                          spacing: 8,
                          children: [
                            OutlinedButton(
                              onPressed: _locked || !model.editEnabled
                                  ? null
                                  : () => _edit(t),
                              child: const Text('Edit or start again'),
                            ),
                            if (t.enabled)
                              OutlinedButton(
                                onPressed: _locked || !model.editEnabled
                                    ? null
                                    : () => _save(enabled: false, target: t),
                                child: const Text('Pause target'),
                              ),
                          ],
                        ),
                      ], key: _targetKeys.putIfAbsent(t.id, () => GlobalKey())),
                  ],
                ],
              ),
      ),
    );
  }
}
