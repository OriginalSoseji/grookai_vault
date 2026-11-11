import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';
import '../../services/square/square_service.dart';

class SquareScreen extends StatefulWidget {
  const SquareScreen({super.key});
  static const routeName = '/vault/square';
  static bool isOpen = false;
  @override
  State<SquareScreen> createState() => _SquareScreenState();
}

class _SquareScreenState extends State<SquareScreen>
    with WidgetsBindingObserver {
  late final SquareService _service;
  Map<String, dynamic>? _workspace;
  List<Map<String, dynamic>> _locations = [];
  String? _location;
  bool _busy = false, _automatic = false, _selling = false;
  String? _error, _message;
  List<Map<String, dynamic>> _adoptions = [];

  @override
  void initState() {
    super.initState();
    SquareScreen.isOpen = true;
    final client = Supabase.instance.client;
    _service = SquareService(
      client,
      ownerId: client.auth.currentUser?.id ?? '',
    );
    WidgetsBinding.instance.addObserver(this);
    _run(_reload);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    SquareScreen.isOpen = false;
    _service.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_busy) _run(_reload);
  }

  List<Map<String, dynamic>> _rows(dynamic value) => value is List
      ? value
            .whereType<Map>()
            .map((row) => Map<String, dynamic>.from(row))
            .toList()
      : [];
  Map<String, dynamic>? get _connection {
    final rows = _rows(_workspace?['connections']);
    for (final row in rows) {
      if (row['status'] == 'connected' && row['environment'] == 'production') {
        return row;
      }
    }
    return rows.where((row) => row['status'] == 'connected').firstOrNull ??
        rows.firstOrNull;
  }

  Map<String, dynamic>? get _commerce {
    for (final row in _rows(
      (_workspace?['commerce'] as Map?)?['connections'],
    )) {
      if (row['id'] == _connection?['id']) return row;
    }
    return null;
  }

  Future<void> _reload() async {
    final value = await _service.workspace();
    if (!mounted) return;
    setState(() {
      _workspace = value;
      _location = _connection?['locationId'] as String?;
      _automatic = _commerce?['autoEnroll'] == true;
      _selling = _commerce?['sellOnSquare'] == true;
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Bad state: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _connect() async {
    final result = await _service.call('link', {'clientReturn': 'native'});
    final uri = Uri.parse(result['launchUrl'] as String);
    if (uri.scheme != 'https' ||
        uri.host != 'grookaivault.com' ||
        uri.path != '/api/square/oauth/launch') {
      throw StateError('Square connection is unavailable.');
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw StateError('Could not open Square.');
    }
  }

  Future<bool> _confirmReturn() async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Receive returned card'),
          content: const Text(
            'Confirm you have the physical card back. The original Square sale stays in your history. The returned card receives a new grookai QR and starts private in your Vault.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Card received'),
            ),
          ],
        ),
      ) ??
      false;
  Future<void> _syncPending(dynamic connectionId) async {
    final value = await _service.call('process', {
      'connectionId': connectionId,
    });
    if (mounted) {
      setState(() => _adoptions = _rows(value['adoptions']));
    }
    await _reload();
  }

  Future<bool> _confirmRelease() async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Release Square stock'),
          content: const Text(
            'Confirm your Square register is online and you still have this physical card. The server will check that Square stock is zero and reconcile recent sales before releasing it.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirm card and register'),
            ),
          ],
        ),
      ) ??
      false;

  @override
  Widget build(BuildContext context) {
    final connection = _connection, commerce = _commerce;
    final id = connection?['id'];
    final connected = connection?['status'] == 'connected';
    final enabled = (_workspace?['commerce'] as Map?)?['enabled'] == true;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Square'),
        actions: [
          IconButton(
            onPressed: _busy ? null : () => _run(_reload),
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Square status',
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Sell your grookai cards with Square',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            const Text(
              'Keep your grookai QR. A phone opens the card page; Square scans it to find the item and price.',
            ),
            if (_busy)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: LinearProgressIndicator(),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            if (_message != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(_message!),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy || _workspace?['linkingEnabled'] != true
                  ? null
                  : () => _run(_connect),
              child: Text(
                connected ? 'Reconnect Square' : 'Connect Square account',
              ),
            ),
            if (!connected)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Text(
                  'Connect your Square account, then return here to choose your location.',
                ),
              ),
            if (connected) ...[
              const SizedBox(height: 24),
              Text(
                'Location and automatic updates',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              TextButton(
                onPressed: _busy
                    ? null
                    : () => _run(() async {
                        final value = await _service.call('locations', {
                          'connectionId': id,
                        });
                        if (!mounted) return;
                        setState(() {
                          _locations = _rows(value['locations']);
                          _location ??=
                              _locations.firstOrNull?['id'] as String?;
                        });
                      }),
                child: const Text('Load Square locations'),
              ),
              if (_locations.isNotEmpty)
                DropdownButtonFormField<String>(
                  initialValue: _location,
                  decoration: const InputDecoration(
                    labelText: 'Square location',
                  ),
                  items: _locations
                      .map(
                        (row) => DropdownMenuItem(
                          value: row['id'] as String,
                          child: Text(row['name'] as String),
                        ),
                      )
                      .toList(),
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _location = value),
                ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Automatically include public sale cards'),
                subtitle: const Text(
                  'Include current and future public For sale cards with a valid asking price. Private collection cards stay private.',
                ),
                value: _automatic,
                onChanged: _busy || !enabled
                    ? null
                    : (value) => setState(() => _automatic = value),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Make these cards sellable in Square'),
                subtitle: const Text(
                  'Assign each physical card to Square. It cannot be sold through another grookai channel until sold or safely removed from Square.',
                ),
                value: _selling,
                onChanged: _busy || !enabled
                    ? null
                    : (value) => setState(() => _selling = value),
              ),
              if (!enabled)
                const Text(
                  'Square stock and sales are not enabled for this account yet.',
                ),
              FilledButton(
                onPressed: _busy || !enabled || _location == null
                    ? null
                    : () => _run(() async {
                        await _service.call('configure', {
                          'connectionId': id,
                          'locationId': _location,
                          'autoSync': _automatic || _selling,
                        });
                        await _service.call('preferences', {
                          'connectionId': id,
                          'autoEnroll': _automatic,
                          'sellOnSquare': _selling,
                          'confirmed': true,
                        });
                        await _syncPending(id);
                        if (mounted) {
                          setState(
                            () => _message =
                                'Preferences saved. Check the ready and review counts below.',
                          );
                        }
                      }),
                child: const Text('Save and sync'),
              ),
              const SizedBox(height: 20),
              Text(
                '${commerce?['allocated'] ?? 0} ready in Square · ${commerce?['pending'] ?? 0} pending · ${commerce?['reviews'] ?? 0} need review',
              ),
              Text(
                '${commerce?['sales'] ?? 0} recorded Square sales · ${commerce?['refunds'] ?? 0} refunds reported',
              ),
              Wrap(
                spacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: _busy
                        ? null
                        : () => _run(() async {
                            await _syncPending(id);
                          }),
                    child: const Text('Sync now'),
                  ),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => _run(() async {
                            await _service.call('reconcile', {
                              'connectionId': id,
                            });
                            await _reload();
                          }),
                    child: const Text('Check Square sales'),
                  ),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => _run(() async {
                            await _service.call('pause', {'connectionId': id});
                            await _reload();
                          }),
                    child: const Text('Pause automatic sync'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              for (final review in _adoptions)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Link existing Square item',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        '${(review['observed'] as Map?)?['name'] ?? 'Existing item'} uses this card’s grookai QR. Confirm the link to keep one item for this exact card.',
                      ),
                      OutlinedButton(
                        onPressed: _busy
                            ? null
                            : () => _run(() async {
                                await _service.call('adopt', {
                                  'connectionId': id,
                                  'targetId': review['targetId'],
                                  'itemId': review['itemId'],
                                  'variationId': review['variationId'],
                                  'expectedReviewHash': review['reviewHash'],
                                  'confirmed': true,
                                  'requestId': const Uuid().v4(),
                                });
                                await _syncPending(id);
                              }),
                        child: const Text('Confirm and link existing item'),
                      ),
                    ],
                  ),
                ),
              for (final row in _rows(commerce?['allocations']))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${row['name'] ?? row['gvvi']} · ${row['state'] == 'active'
                            ? 'Ready in Square'
                            : row['state'] == 'review'
                            ? 'Needs review'
                            : 'Pending'}',
                      ),
                      Text(row['gvvi']?.toString() ?? ''),
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => _run(() async {
                                await _service.call('withdraw', {
                                  'connectionId': id,
                                  'targetId': row['targetId'],
                                });
                                await _reload();
                              }),
                        child: const Text('Remove from Square stock'),
                      ),
                      if (row['state'] == 'review' && row['quantity'] == 0)
                        OutlinedButton(
                          onPressed: _busy
                              ? null
                              : () => _run(() async {
                                  if (!await _confirmRelease()) return;
                                  await _service.call('releaseStock', {
                                    'connectionId': id,
                                    'targetId': row['targetId'],
                                    'confirmed': true,
                                    'physicalCopyPresent': true,
                                    'registerOnline': true,
                                  });
                                  await _reload();
                                }),
                          child: const Text('Confirm stock release'),
                        ),
                    ],
                  ),
                ),
              for (final sale in _rows(commerce?['recentSales']))
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    'Square sale · \$${((sale['saleCents'] as num) / 100).toStringAsFixed(2)}',
                  ),
                  subtitle: Text(
                    sale['returned'] == true
                        ? 'Returned to Vault with a new QR'
                        : sale['refundReported'] == true
                        ? 'Refund reported. Confirm physical return before restocking.'
                        : 'Sale recorded in your Vault history',
                  ),
                  trailing:
                      sale['refundReported'] == true && sale['returned'] != true
                      ? TextButton(
                          onPressed: _busy
                              ? null
                              : () => _run(() async {
                                  if (!await _confirmReturn()) return;
                                  await _service.call('return', {
                                    'connectionId': id,
                                    'saleId': sale['id'],
                                    'confirmed': true,
                                  });
                                  await _reload();
                                }),
                          child: const Text('Receive return'),
                        )
                      : null,
                ),
            ],
          ],
        ),
      ),
    );
  }
}
