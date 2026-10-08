import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/vault/copy_cost_journal.dart';
import '../../services/vault/copy_cost_service.dart';

const kCopyCostEntryEnabled = bool.fromEnvironment('GV_COPY_COST_V1');

/// Private owner route. Sharing and customer-facing routes never receive costs.
class CopyCostScreen extends StatefulWidget {
  const CopyCostScreen({
    super.key,
    required this.service,
    required this.instanceId,
    required this.gvviId,
    required this.title,
    this.entryEnabled = kCopyCostEntryEnabled,
  });
  final CopyCostService service;
  final String instanceId, gvviId, title;
  final bool entryEnabled;
  @override
  State<CopyCostScreen> createState() => _CopyCostScreenState();
}

class _CopyCostScreenState extends State<CopyCostScreen> {
  final _amount = TextEditingController();
  final _currency = TextEditingController();
  late final StreamSubscription<void> _account;
  Future<void> _writes = Future.value();
  CopyCostOpen? _opened;
  CopyCostDraft? _draft;
  bool _loading = true, _busy = false, _closed = false, _allowPop = false;
  String? _error, _storageError, _notice;

  @override
  void initState() {
    super.initState();
    _account = widget.service.accountChanges.listen((_) => _closeAccount());
    unawaited(_load());
  }

  @override
  void dispose() {
    unawaited(_account.cancel());
    _amount.dispose();
    _currency.dispose();
    super.dispose();
  }

  void _closeAccount() {
    if (!mounted || _closed) return;
    _amount.clear();
    _currency.clear();
    setState(() {
      _closed = true;
      _draft = null;
      _opened = null;
      _error = _storageError = _notice = null;
    });
  }

  bool get _active => mounted && !_closed;
  bool get _dirty =>
      _draft != null &&
      (_amount.text != _draft!.amountText ||
          _currency.text != _draft!.currencyText);
  bool get _canEdit =>
      widget.entryEnabled &&
      !_busy &&
      !_loading &&
      _draft != null &&
      _draft!.pending == null &&
      _opened?.current?.cost != null &&
      _opened?.current?.archived == false &&
      _opened?.current?.editEnabled == true;
  bool get _needsReview =>
      _draft?.needsReview == true ||
      (_draft != null &&
          _opened?.current?.cost != null &&
          (_draft!.expectedAmount != _opened!.current!.cost!.amount ||
              _draft!.expectedCurrency != _opened!.current!.cost!.currency));

  Future<void> _load() async {
    if (!_active) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final opened = await widget.service.open(
        instanceId: widget.instanceId,
        gvviId: widget.gvviId,
        title: widget.title,
      );
      if (!_active) return;
      _amount.text = opened.draft?.amountText ?? '';
      _currency.text = opened.draft?.currencyText ?? '';
      setState(() {
        _opened = opened;
        _draft = opened.draft;
        _storageError = null;
      });
    } catch (_) {
      if (_active) {
        setState(
          () => _error =
              'This saved edit could not load. Its data has been retained. Try again.',
        );
      }
    } finally {
      if (_active) setState(() => _loading = false);
    }
  }

  // Every keystroke is queued in order; saving or leaving drains this queue.
  // A failure keeps the visible proposal and prevents navigation from losing it.
  void _changed() {
    final amount = _amount.text, currency = _currency.text;
    setState(() {
      _notice = null;
      _error = null;
    });
    _writes = _writes.then((_) async {
      if (!_active || _draft == null) return;
      try {
        final saved = await widget.service.edit(_draft!, amount, currency);
        if (_active) {
          setState(() {
            _draft = saved;
            _storageError = null;
          });
        }
      } catch (_) {
        if (_active) {
          setState(
            () => _storageError =
                'This proposal has not saved on your device. Keep this screen open and retry.',
          );
        }
      }
    });
  }

  Future<bool> _flush() async {
    await _writes;
    return _active && !_dirty && _storageError == null;
  }

  Future<void> _leave() async {
    if (_closed) {
      Navigator.of(context).pop();
      return;
    }
    if (_busy || _loading) return;
    if (!await _flush() || !mounted) return;
    setState(() => _allowPop = true);
    // PopScope must rebuild with the new permission before navigator.pop.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  Future<void> _run(Future<CopyCostAttempt?> Function() action) async {
    if (_busy || !_active) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      if (!await _flush()) return;
      final attempt = await action();
      if (!_active) return;
      if (attempt != null) {
        setState(() {
          _draft = attempt.draft;
          _notice = attempt.message;
        });
      }
      await _load();
    } on FormatException catch (error) {
      if (_active) setState(() => _error = error.message);
    } catch (_) {
      if (_active) {
        // The request may have committed locally before the error. Read its
        // durable state so the next button cannot accidentally create a new ID.
        await _load();
        if (_active) {
          setState(
            () => _error =
                'The action could not finish. Your saved edit is retained; review its status before continuing.',
          );
        }
      }
    } finally {
      if (_active) setState(() => _busy = false);
    }
  }

  Future<void> _review() async {
    await _run(() async {
      final reviewed = await widget.service.reviewCurrent(_draft!);
      if (_active) setState(() => _draft = reviewed);
      return null;
    });
  }

  Future<void> _reloadStored() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reload the saved proposal?'),
        content: const Text(
          'This replaces the text on this screen with the proposal saved on this device. Pending saves are preserved.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep editing'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Reload saved proposal'),
          ),
        ],
      ),
    );
    if (yes == true && _active) {
      await _writes;
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pending = _draft?.pending;
    return PopScope(
      canPop: _allowPop || _closed,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) unawaited(_leave());
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Private cost'),
          leading: BackButton(onPressed: _leave),
        ),
        body: _closed
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Your account changed. Reopen private costs from Inventory.',
                  ),
                ),
              )
            : _loading
            ? const Center(child: CircularProgressIndicator())
            : Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 640),
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      Text(widget.title, style: theme.textTheme.headlineSmall),
                      Text(widget.gvviId, style: theme.textTheme.bodySmall),
                      const SizedBox(height: 12),
                      const Text(
                        'Only you can see this cost. It does not appear on customer receipts or shared cards.',
                      ),
                      const SizedBox(height: 20),
                      if (_opened?.current?.cost != null) ...[
                        Text(
                          'Recorded cost',
                          style: theme.textTheme.labelLarge,
                        ),
                        Text(
                          _opened!.current!.cost!.label,
                          key: const Key('copy_cost_recorded'),
                          style: theme.textTheme.titleLarge,
                        ),
                        if (_opened!.current!.cost!.status ==
                            'missing_currency')
                          Text(
                            'Recorded amount: ${_opened!.current!.cost!.amount ?? 'Unavailable'}',
                          ),
                      ],
                      if (_opened?.readError != null) Text(_opened!.readError!),
                      if (_opened?.current?.archived == true)
                        const Text(
                          'This copy is no longer active. Existing saves can still be recovered.',
                        ),
                      if (!widget.entryEnabled ||
                          _opened?.current?.editEnabled == false)
                        const Text(
                          'New cost edits are unavailable. Existing saves can still be recovered.',
                        ),
                      if (_draft != null) ...[
                        const SizedBox(height: 20),
                        TextField(
                          key: const Key('copy_cost_amount'),
                          controller: _amount,
                          enabled: _canEdit,
                          maxLength: 4096,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          onChanged: (_) => _changed(),
                          decoration: const InputDecoration(
                            labelText: 'Acquisition cost',
                            counterText: '',
                            hintText: 'Amount paid',
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          key: const Key('copy_cost_currency'),
                          controller: _currency,
                          enabled: _canEdit,
                          maxLength: 1000,
                          autocorrect: false,
                          textCapitalization: TextCapitalization.characters,
                          onChanged: (_) => _changed(),
                          decoration: const InputDecoration(
                            labelText: 'Cost currency',
                            counterText: '',
                            hintText: 'Three-letter code, e.g. USD',
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Zero means you paid nothing. Unknown means the cost has not been recorded. Currency is never assumed.',
                        ),
                        TextButton(
                          key: const Key('copy_cost_unknown'),
                          onPressed: _canEdit
                              ? () {
                                  _amount.clear();
                                  _currency.clear();
                                  _changed();
                                }
                              : null,
                          child: const Text('Mark cost unknown'),
                        ),
                      ],
                      if (_needsReview && pending == null) ...[
                        const SizedBox(height: 12),
                        const Text(
                          'The recorded cost changed or a save was rejected. Your proposal is kept. Review the current cost before applying it.',
                        ),
                        OutlinedButton(
                          onPressed: _canEdit ? _review : null,
                          child: const Text(
                            'Review current cost and keep proposal',
                          ),
                        ),
                      ],
                      if (pending != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Save awaiting confirmation',
                          style: theme.textTheme.titleMedium,
                        ),
                        Text(
                          pending.amount == null
                              ? 'Requested: cost unknown'
                              : 'Requested: ${pending.currency} ${pending.amount}',
                        ),
                        const Text(
                          'The request is saved on this device. Check its status or retry the same save.',
                        ),
                        const SizedBox(height: 8),
                        FilledButton(
                          key: const Key('copy_cost_recover'),
                          onPressed: _busy
                              ? null
                              : () => _run(
                                  () =>
                                      widget.service.recover(widget.instanceId),
                                ),
                          child: const Text('Check save status'),
                        ),
                        OutlinedButton(
                          key: const Key('copy_cost_retry'),
                          onPressed: _busy
                              ? null
                              : () => _run(
                                  () => widget.service.retry(widget.instanceId),
                                ),
                          child: const Text('Retry same save'),
                        ),
                      ] else if (_draft != null) ...[
                        const SizedBox(height: 16),
                        FilledButton(
                          key: const Key('copy_cost_save'),
                          onPressed: _canEdit && !_needsReview
                              ? () => _run(
                                  () => widget.service.beginSave(_draft!),
                                )
                              : null,
                          child: const Text('Save private cost'),
                        ),
                      ],
                      if (_storageError != null) ...[
                        Text(
                          _storageError!,
                          style: TextStyle(color: theme.colorScheme.error),
                        ),
                        OutlinedButton(
                          onPressed: _busy ? null : _changed,
                          child: const Text('Retry device save'),
                        ),
                        TextButton(
                          onPressed: _busy ? null : _reloadStored,
                          child: const Text('Review saved proposal'),
                        ),
                      ],
                      if (_error != null)
                        Text(
                          _error!,
                          key: const Key('copy_cost_error'),
                          style: TextStyle(color: theme.colorScheme.error),
                        ),
                      if (_notice != null)
                        Semantics(liveRegion: true, child: Text(_notice!)),
                      if (_busy) const LinearProgressIndicator(),
                      const SizedBox(height: 12),
                      TextButton(
                        key: const Key('copy_cost_refresh'),
                        onPressed: _busy
                            ? null
                            : () async {
                                if (await _flush()) await _load();
                              },
                        child: const Text('Refresh recorded cost'),
                      ),
                      const Text(
                        'Changes apply to this copy’s current cost. Previous sale costs remain unchanged.',
                      ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

/// Uses the owner journal rather than active inventory, so sold copies and a
/// disabled entry switch cannot strand an interrupted save.
class CopyCostRecoveryScreen extends StatefulWidget {
  const CopyCostRecoveryScreen({
    super.key,
    required this.service,
    this.entryEnabled = kCopyCostEntryEnabled,
  });
  final CopyCostService service;
  final bool entryEnabled;
  @override
  State<CopyCostRecoveryScreen> createState() => _CopyCostRecoveryScreenState();
}

class _CopyCostRecoveryScreenState extends State<CopyCostRecoveryScreen> {
  late final StreamSubscription<void> _account;
  final _rows = <CopyCostDraft>[];
  bool _busy = false, _closed = false;
  int _count = 0;
  String? _error;
  @override
  void initState() {
    super.initState();
    _account = widget.service.accountChanges.listen((_) {
      if (mounted) {
        setState(() {
          _closed = true;
          _rows.clear();
          _error = null;
          _count = 0;
        });
      }
    });
    unawaited(_load());
  }

  @override
  void dispose() {
    unawaited(_account.cancel());
    super.dispose();
  }

  Future<void> _load({bool more = false}) async {
    if (_busy || _closed) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final count = await widget.service.pendingCount();
      final rows = await widget.service.pending(
        after: more && _rows.isNotEmpty ? _rows.last.instanceId : null,
      );
      if (!mounted || _closed) return;
      setState(() {
        if (!more) _rows.clear();
        _rows.addAll(rows);
        _count = count;
      });
    } catch (_) {
      if (mounted && !_closed) {
        setState(
          () => _error =
              'Saved requests could not load. They have not been removed. Retry.',
        );
      }
    } finally {
      if (mounted && !_closed) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Recover cost saves')),
    body: _closed
        ? const Center(child: Text('Your account changed. Reopen Inventory.'))
        : ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'Private saves on this device, including copies that are no longer active.',
              ),
              if (_busy) const LinearProgressIndicator(),
              if (_error != null) Text(_error!),
              if (!_busy && _error == null)
                Text(
                  _count == 0
                      ? 'No pending cost saves.'
                      : '$_count ${_count == 1 ? 'save' : 'saves'} awaiting confirmation',
                ),
              for (final row in _rows)
                ListTile(
                  key: Key('recover_cost_${row.instanceId}'),
                  title: Text(row.title),
                  subtitle: Text(row.gvviId),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: _busy
                      ? null
                      : () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => CopyCostScreen(
                                service: widget.service,
                                instanceId: row.instanceId,
                                gvviId: row.gvviId,
                                title: row.title,
                                entryEnabled: widget.entryEnabled,
                              ),
                            ),
                          );
                          if (mounted && !_closed) await _load();
                        },
                ),
              if (_rows.length < _count)
                OutlinedButton(
                  onPressed: _busy ? null : () => _load(more: true),
                  child: const Text('Load more saves'),
                ),
              TextButton(
                onPressed: _busy ? null : _load,
                child: const Text('Refresh saved requests'),
              ),
            ],
          ),
  );
}
