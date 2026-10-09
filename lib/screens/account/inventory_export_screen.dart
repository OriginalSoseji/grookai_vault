import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/vault/inventory_export.dart';
import '../../services/vault/inventory_export_service.dart';

typedef InventoryFileSaver =
    Future<bool> Function(String name, Uint8List bytes);

class InventoryExportScreen extends StatefulWidget {
  const InventoryExportScreen({super.key, this.service, this.saveFile});
  final InventoryExportService? service;
  final InventoryFileSaver? saveFile;
  @override
  State<InventoryExportScreen> createState() => _InventoryExportScreenState();
}

class _InventoryExportScreenState extends State<InventoryExportScreen> {
  late final _service =
      widget.service ?? InventoryExportService(Supabase.instance.client);
  String? _owner;
  StreamSubscription<String?>? _subscription;
  InventoryExport? _snapshot;
  String? _error, _notice;
  bool _busy = false, _closed = false, _saving = false;
  int _revision = 0;

  @override
  void initState() {
    super.initState();
    _owner = _service.ownerId;
    _closed = _owner == null;
    _subscription = _service.ownerChanges.listen((id) {
      if (mounted && id != _owner) _close();
    });
  }

  void _close() {
    _revision += 1;
    setState(() {
      _closed = true;
      _busy = false;
      _saving = false;
      _snapshot = null;
      _error = null;
      _notice = null;
    });
  }

  bool _current(int revision) =>
      mounted &&
      !_closed &&
      revision == _revision &&
      _owner != null &&
      _service.ownerId == _owner;

  @override
  void dispose() {
    _revision += 1;
    _subscription?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    if (_busy || _closed) return;
    if (_service.ownerId != _owner || _owner == null) {
      _close();
      return;
    }
    final revision = ++_revision;
    setState(() {
      _busy = true;
      _saving = false;
      _snapshot = null;
      _error = null;
      _notice = null;
    });
    try {
      final snapshot = await _service.read(_owner!);
      if (!_current(revision)) return;
      if (snapshot.ownerId != _owner) {
        throw const FormatException('Wrong export owner');
      }
      setState(() => _snapshot = snapshot);
    } catch (error) {
      if (_current(revision)) {
        setState(() => _error = InventoryExportService.errorMessage(error));
      }
    } finally {
      if (mounted && !_closed && _service.ownerId != _owner) _close();
      if (_current(revision)) setState(() => _busy = false);
    }
  }

  Future<bool> _saveToDevice(String name, Uint8List bytes) async {
    if (kIsWeb) throw UnsupportedError('Use the web inventory export page.');
    final mobile = Platform.isAndroid || Platform.isIOS;
    final path = await FilePicker.platform.saveFile(
      dialogTitle: 'Save inventory export',
      fileName: name,
      type: FileType.custom,
      allowedExtensions: [name.split('.').last],
      bytes: mobile ? bytes : null,
    );
    if (path == null) return false;
    if (!mobile) await File(path).writeAsBytes(bytes, flush: true);
    return true;
  }

  Future<void> _save(String format) async {
    final snapshot = _snapshot;
    if (_busy || _closed || snapshot == null) return;
    if (_service.ownerId != _owner) {
      _close();
      return;
    }
    final revision = _revision;
    setState(() {
      _busy = true;
      _saving = true;
      _error = null;
      _notice = null;
    });
    try {
      final bytes = Uint8List.fromList(
        utf8.encode(
          format == 'json' ? snapshot.toJsonString() : snapshot.toCsvString(),
        ),
      );
      if (!_current(revision)) return;
      final saved = await (widget.saveFile ?? _saveToDevice)(
        snapshot.fileName(format),
        bytes,
      );
      if (_current(revision)) {
        setState(
          () => _notice = saved ? 'Inventory file saved.' : 'Save cancelled.',
        );
      }
    } catch (_) {
      if (_current(revision)) {
        setState(() => _error = 'The file could not be saved. Please retry.');
      }
    } finally {
      if (mounted && !_closed && _service.ownerId != _owner) _close();
      if (_current(revision)) {
        setState(() {
          _busy = false;
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = _snapshot;
    return Scaffold(
      appBar: AppBar(title: const Text('Export inventory')),
      body: _closed
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Your account changed. Return to Account and reopen inventory export.',
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  'Save your collection records',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Save every active card, slab and sealed copy with identity, notes and known costs.',
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : _load,
                  child: Text(
                    _busy
                        ? (_saving ? 'Saving…' : 'Preparing…')
                        : snapshot == null
                        ? 'Prepare export'
                        : 'Refresh inventory',
                  ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(_error!, semanticsLabel: _error),
                  ),
                if (_notice != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(_notice!),
                  ),
                if (snapshot != null) ...[
                  const SizedBox(height: 20),
                  Text(
                    snapshot.copyCount == 0
                        ? 'Your active inventory is empty'
                        : '${snapshot.copyCount} copies ready',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Cards: ${snapshot.cardCount} · Slabs: ${snapshot.slabCount} · Sealed: ${snapshot.sealedCount}',
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Captured ${snapshot.capturedAt.replaceFirst('T', ' ').replaceFirst('Z', ' UTC')}. Both files use this same snapshot.',
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      FilledButton.icon(
                        onPressed: _busy ? null : () => _save('json'),
                        icon: const Icon(Icons.save_alt),
                        label: const Text('Save JSON'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _busy ? null : () => _save('csv'),
                        icon: const Icon(Icons.table_view_outlined),
                        label: const Text('Save CSV'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'JSON keeps the full exported record and exact decimal values. CSV is a spreadsheet summary; formula-like text is prefixed with an apostrophe. Spreadsheets may reinterpret numeric text.',
                  ),
                ],
                const SizedBox(height: 24),
                const Text(
                  'Vault filters do not limit this export. Includes private collection information and photo links, but no photo files, sold or archived copies, goals or receipts. This is a record export, not a supported Grookai restore format or market valuation.',
                ),
              ],
            ),
    );
  }
}
