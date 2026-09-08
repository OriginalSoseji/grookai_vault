import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/sealed/owned_sealed_service_v1.dart';

class SealedCopyDetailsDialog extends StatefulWidget {
  const SealedCopyDetailsDialog({super.key, required this.copy});
  final OwnedSealedCopy copy;
  @override
  State<SealedCopyDetailsDialog> createState() =>
      _SealedCopyDetailsDialogState();
}

class _SealedCopyDetailsDialogState extends State<SealedCopyDetailsDialog> {
  final _client = Supabase.instance.client;
  late final _notes = TextEditingController(text: widget.copy.text('notes'));
  late String? _front = widget.copy.data['personal_image_url'] as String?,
      _back = widget.copy.data['personal_back_image_url'] as String?;
  late bool _share = widget.copy.data['show_personal_photos'] == true;
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save({bool close = true}) async {
    await _client.rpc(
      'vault_save_sealed_details_v1',
      params: {
        'p_instance_id': widget.copy.id,
        'p_notes': _notes.text.trim(),
        'p_front_path': _front,
        'p_back_path': _back,
        'p_show_photos': _share,
      },
    );
    final rows = await OwnedSealedService.supabase().page(
      ids: [widget.copy.id],
    );
    if (rows.length != 1 ||
        rows.single.text('notes') != _notes.text.trim() ||
        rows.single.data['personal_image_url'] != _front ||
        rows.single.data['personal_back_image_url'] != _back ||
        rows.single.data['show_personal_photos'] != _share) {
      throw StateError('Detail readback mismatch');
    }
    if (close && mounted) Navigator.pop(context);
  }

  Future<void> _upload(bool back) async {
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 2200,
      imageQuality: 92,
    );
    if (file == null || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_client.auth.currentUser?.id != widget.copy.text('owner_id')) {
        throw StateError('Owner changed');
      }
      final bytes = await file.readAsBytes();
      if (bytes.length > 10 * 1024 * 1024) {
        throw StateError('Image exceeds 10 MB');
      }
      final path =
          '${widget.copy.text('owner_id')}/vault-instances/${widget.copy.id}/${back ? 'back' : 'front'}/current';
      final String mime;
      if (bytes.length >= 8 &&
          bytes.take(8).join(',') == '137,80,78,71,13,10,26,10') {
        mime = 'image/png';
      } else if (bytes.length >= 3 &&
          bytes[0] == 255 &&
          bytes[1] == 216 &&
          bytes[2] == 255) {
        mime = 'image/jpeg';
      } else if (bytes.length >= 12 &&
          String.fromCharCodes(bytes.take(4)) == 'RIFF' &&
          String.fromCharCodes(bytes.skip(8).take(4)) == 'WEBP') {
        mime = 'image/webp';
      } else {
        throw StateError('Use a JPEG, PNG or WebP image');
      }
      final codec = await ui.instantiateImageCodec(bytes, targetWidth: 1);
      try {
        final frame = await codec.getNextFrame();
        frame.image.dispose();
      } finally {
        codec.dispose();
      }
      await _client.storage
          .from('user-card-images')
          .uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(upsert: true, contentType: mime),
          );
      if (back) {
        _back = path;
      } else {
        _front = path;
      }
      await _save(close: false);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Photo could not be confirmed. Retry or save to confirm. Images must be 10 MB or smaller.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: const Text('Photos and private notes'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.copy.identity),
            TextField(
              controller: _notes,
              enabled: !_busy,
              maxLength: 2000,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Private notes'),
            ),
            Wrap(
              spacing: 12,
              children: [
                TextButton.icon(
                  icon: const Icon(Icons.add_photo_alternate_outlined),
                  label: Text(_front == null ? 'Add front' : 'Replace front'),
                  onPressed: _busy ? null : () => _upload(false),
                ),
                TextButton.icon(
                  icon: const Icon(Icons.add_photo_alternate_outlined),
                  label: Text(_back == null ? 'Add back' : 'Replace back'),
                  onPressed: _busy ? null : () => _upload(true),
                ),
              ],
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Show uploaded photos on shared copy'),
              value: _share,
              onChanged: _busy
                  ? null
                  : (v) => setState(() => _share = v == true),
            ),
            if (_error != null)
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Close'),
        ),
        FilledButton(
          onPressed: _busy
              ? null
              : () async {
                  setState(() {
                    _busy = true;
                    _error = null;
                  });
                  try {
                    await _save();
                  } catch (_) {
                    if (mounted) {
                      setState(
                        () => _error = 'Details could not be confirmed.',
                      );
                    }
                  } finally {
                    if (mounted) setState(() => _busy = false);
                  }
                },
          child: Text(_busy ? 'Saving...' : 'Save'),
        ),
      ],
    ),
  );
}

class SealedHistoryDialog extends StatefulWidget {
  const SealedHistoryDialog({super.key});
  @override
  State<SealedHistoryDialog> createState() => _SealedHistoryDialogState();
}

class _SealedHistoryDialogState extends State<SealedHistoryDialog> {
  int _offset = 0;
  late Future<List<Map<String, dynamic>>> _rows = OwnedSealedService.supabase()
      .history();
  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Sealed history'),
    content: SizedBox(
      width: 420,
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _rows,
        builder: (_, state) {
          if (state.hasError) return const Text('History could not load.');
          if (!state.hasData) {
            return const SizedBox(
              height: 64,
              child: Center(child: CircularProgressIndicator()),
            );
          }
          return SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (state.data!.isEmpty)
                  const Text('No transactions on this page.'),
                for (final row in state.data!)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row['name'].toString(),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '${row['package_form']} / ${row['language_code']}',
                        ),
                        Text('${row['operation']} / ${row['archived_at']}'),
                        if (row['sale_price_amount'] != null)
                          Text(
                            '${row['sale_price_currency']} ${row['sale_price_amount']}',
                          ),
                        if (row['counterparty'] != null)
                          Text('To: ${row['counterparty']}'),
                        if (row['trade_received'] != null)
                          Text('Received: ${row['trade_received']}'),
                        if (row['cash_amount'] != null)
                          Text(
                            'Cash ${row['cash_direction']}: ${row['cash_currency']} ${row['cash_amount']}',
                          ),
                      ],
                    ),
                  ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      tooltip: 'Previous page',
                      icon: const Icon(Icons.chevron_left),
                      onPressed: _offset == 0
                          ? null
                          : () => setState(() {
                              _offset -= 50;
                              _rows = OwnedSealedService.supabase().history(
                                offset: _offset,
                              );
                            }),
                    ),
                    Text('Page ${_offset ~/ 50 + 1}'),
                    IconButton(
                      tooltip: 'Next page',
                      icon: const Icon(Icons.chevron_right),
                      onPressed: state.data!.length < 50
                          ? null
                          : () => setState(() {
                              _offset += 50;
                              _rows = OwnedSealedService.supabase().history(
                                offset: _offset,
                              );
                            }),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Done'),
      ),
    ],
  );
}
