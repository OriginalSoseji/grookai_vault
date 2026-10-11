import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/import/collection_import_archive.dart';

/// Owner-only source history, separate from current inventory and valuation.
class ImportCollectionHistoryScreen extends StatefulWidget {
  const ImportCollectionHistoryScreen({
    super.key,
    required this.client,
    this.sourceSha256,
    this.shareSource,
  });
  final SupabaseClient client;
  final String? sourceSha256;
  final Future<void> Function(String contents, String filename, Rect? origin)?
  shareSource;
  @override
  State<ImportCollectionHistoryScreen> createState() =>
      _ImportCollectionHistoryScreenState();
}

class _ImportCollectionHistoryScreenState
    extends State<ImportCollectionHistoryScreen> {
  final _documents = <Map<String, dynamic>>[];
  late final String? _owner = widget.client.auth.currentUser?.id;
  StreamSubscription<AuthState>? _subscription;
  CollectionImportArchive? _archive;
  bool _loading = false, _more = true, _closed = false, _sharing = false;
  int _revision = 0, _limit = 50;
  String? _error, _after;
  String _filter = 'review', _search = '';
  static final _hash = RegExp(r'^[a-f0-9]{64}$');

  @override
  void initState() {
    super.initState();
    _subscription = widget.client.auth.onAuthStateChange.listen((state) {
      if (state.session?.user.id != _owner) _close();
    });
    unawaited(_load());
  }

  bool _valid() =>
      mounted &&
      !_closed &&
      _owner != null &&
      widget.client.auth.currentUser?.id == _owner;
  bool _current(int revision) => _valid() && revision == _revision;
  void _close() {
    if (!mounted || _closed) return;
    setState(() {
      _closed = true;
      _revision++;
      _documents.clear();
      _archive = null;
      _after = null;
      _search = '';
      _loading = _sharing = false;
      _error = null;
    });
  }

  @override
  void dispose() {
    _revision++;
    unawaited(_subscription?.cancel());
    super.dispose();
  }

  Future<void> _load({bool append = false}) async {
    if (!_valid()) {
      _close();
      return;
    }
    if (_loading) return;
    final revision = ++_revision, source = widget.sourceSha256;
    setState(() {
      _loading = true;
      _error = null;
      if (!append) {
        _documents.clear();
        _archive = null;
        _after = null;
        _more = true;
      }
    });
    try {
      if (source != null) {
        final archive = await CollectionImportArchive.read(
          ownerId: _owner!,
          sourceSha256: source,
          isCurrentOwner: () => _current(revision),
          readDocument: () async => await widget.client
              .from('vault_collection_import_documents_v2')
              .select('user_id,source_sha256,created_at,source_rows')
              .eq('user_id', _owner)
              .eq('source_sha256', source)
              .single(),
          readGroupPage: (after) async {
            var query = widget.client
                .from('vault_collection_import_groups_v2')
                .select(
                  'user_id,source_sha256,group_key,source_indices,instance_ids,added_count,target',
                )
                .eq('user_id', _owner)
                .eq('source_sha256', source);
            if (after != null) query = query.gt('group_key', after);
            return await query.order('group_key', ascending: true).limit(500);
          },
        );
        if (!_current(revision)) return;
        setState(() {
          _archive = archive;
          _filter = archive.reviewIndices.isEmpty ? 'all' : 'review';
          _limit = 50;
        });
      } else {
        var query = widget.client
            .from('vault_collection_import_documents_v2')
            .select('user_id,source_sha256,created_at')
            .eq('user_id', _owner!);
        if (_after != null) query = query.gt('source_sha256', _after!);
        final page = await query
            .order('source_sha256', ascending: true)
            .limit(20);
        var after = _after;
        for (final doc in page) {
          final hash = doc['source_sha256'], created = doc['created_at'];
          if (doc['user_id'] != _owner ||
              hash is! String ||
              !_hash.hasMatch(hash) ||
              (after != null && hash.compareTo(after) <= 0) ||
              created is! String ||
              DateTime.tryParse(created) == null) {
            throw const FormatException('Invalid saved import page');
          }
          after = hash;
        }
        if (!_current(revision)) return;
        setState(() {
          _documents.addAll(page);
          _after = after;
          _more = page.isNotEmpty;
        });
      }
    } catch (_) {
      if (_current(revision)) {
        setState(
          () => _error =
              'Saved import details could not be loaded. Retry to confirm the complete result.',
        );
      }
    } finally {
      if (_current(revision)) {
        setState(() => _loading = false);
      } else if (mounted && !_valid()) {
        _close();
      }
    }
  }

  Future<void> _share(BuildContext anchor) async {
    final archive = _archive;
    if (!_valid()) {
      _close();
      return;
    }
    if (archive == null || _sharing || _loading) return;
    final revision = _revision;
    setState(() => _sharing = true);
    try {
      final contents = archive.toSourceJson();
      final filename =
          'grookai-saved-import-${archive.sourceSha256.substring(0, 12)}.json';
      final box = anchor.findRenderObject() as RenderBox?;
      final origin = box == null
          ? null
          : box.localToGlobal(Offset.zero) & box.size;
      if (!_current(revision)) return;
      if (widget.shareSource != null) {
        await widget.shareSource!(contents, filename, origin);
      } else {
        await SharePlus.instance.share(
          ShareParams(
            files: [
              XFile.fromData(
                utf8.encode(contents),
                mimeType: 'application/json',
              ),
            ],
            fileNameOverrides: [filename],
            sharePositionOrigin: origin,
          ),
        );
      }
    } catch (_) {
      if (_current(revision)) {
        setState(
          () => _error = 'The source file could not be prepared. Please retry.',
        );
      }
    } finally {
      if (_current(revision)) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final archive = _archive, source = widget.sourceSha256;
    final review = archive?.reviewIndices.toSet() ?? <int>{};
    final terms = _search
        .trim()
        .toLowerCase()
        .split(RegExp(r'\s+'))
        .where((v) => v.isNotEmpty);
    final indices = archive == null
        ? <int>[]
        : [
            for (var i = 0; i < archive.rows.length; i++)
              if ((_filter == 'all' ||
                      (_filter == 'review'
                          ? review.contains(i)
                          : !review.contains(i))) &&
                  terms.every(
                    (term) => archive.rows[i].values
                        .join(' ')
                        .toLowerCase()
                        .contains(term),
                  ))
                i,
          ];
    return Scaffold(
      appBar: AppBar(
        title: Text(source == null ? 'Saved imports' : 'Saved import details'),
      ),
      body: _closed
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Your account changed. Reopen saved imports.'),
              ),
            )
          : SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Your saved source rows and unresolved items. Review rows are not inventory.',
                  ),
                  const SizedBox(height: 16),
                  if (_error != null) ...[
                    Text(_error!),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () => _load(
                              append: source == null && _documents.isNotEmpty,
                            ),
                      child: const Text('Retry loading'),
                    ),
                  ],
                  if (_loading)
                    const Center(child: CircularProgressIndicator()),
                  if (source == null) ...[
                    if (_documents.isEmpty && !_loading && _error == null)
                      const Text('No saved imports yet.'),
                    for (final document in _documents)
                      ListTile(
                        leading: const Icon(Icons.description_outlined),
                        title: Text(
                          'Imported ${(document['created_at'] as String).split('T').first}',
                        ),
                        subtitle: const Text(
                          'View original rows and review status',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          if (!_valid()) {
                            _close();
                            return;
                          }
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => ImportCollectionHistoryScreen(
                                client: widget.client,
                                sourceSha256:
                                    document['source_sha256'] as String,
                                shareSource: widget.shareSource,
                              ),
                            ),
                          );
                        },
                      ),
                    if (_documents.isNotEmpty && _more && _error == null)
                      TextButton(
                        onPressed: _loading ? null : () => _load(append: true),
                        child: const Text('Show more imports'),
                      ),
                  ],
                  if (archive != null) ...[
                    Text(
                      'Source reconciliation',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${archive.rows.length} source rows · ${archive.reconciledRows} previously reconciled · ${archive.reviewIndices.length} need review',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Historical mappings: ${archive.cardCopies} card copies · ${archive.sealedCopies} sealed copies',
                    ),
                    ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      title: const Text('Download source and retry options'),
                      children: [
                        Text(
                          '${archive.addedCopies} copies were added by this source; ${archive.reusedCopies} were already accounted for. Mapped copies may since have been sold, archived or edited.',
                        ),
                        Builder(
                          builder: (anchor) => OutlinedButton.icon(
                            onPressed: _sharing || _loading
                                ? null
                                : () => _share(anchor),
                            icon: const Icon(Icons.download_outlined),
                            label: const Text('Save source JSON'),
                          ),
                        ),
                        const Text(
                          'Includes all stored source fields and historical mappings, regardless of these filters. This is not the original CSV or a current collection export.',
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'To try matching again, choose the unchanged original CSV in Import Collection. A downloaded subset is a different import and cannot recover an uncertain save.',
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final value in ['review', 'reconciled', 'all'])
                          ChoiceChip(
                            label: Text(
                              value == 'review'
                                  ? 'Needs review (${archive.reviewIndices.length})'
                                  : value == 'reconciled'
                                  ? 'Reconciled (${archive.reconciledRows})'
                                  : 'All rows (${archive.rows.length})',
                            ),
                            selected: _filter == value,
                            onSelected: (_) => setState(() {
                              _filter = value;
                              _limit = 50;
                            }),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(
                        labelText: 'Search saved source fields',
                      ),
                      onChanged: (value) => setState(() {
                        _search = value;
                        _limit = 50;
                      }),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Showing ${indices.take(_limit).length} of ${indices.length} matching source rows',
                    ),
                    if (indices.isEmpty)
                      const Text(
                        'No rows match this view. Change the filter or clear the search.',
                      ),
                    for (final index in indices.take(_limit))
                      _SourceRow(
                        row: archive.rows[index],
                        index: index,
                        review: review.contains(index),
                      ),
                    if (indices.length > _limit)
                      TextButton(
                        onPressed: () => setState(() => _limit += 50),
                        child: const Text('Show more rows'),
                      ),
                  ],
                ],
              ),
            ),
    );
  }
}

class _SourceRow extends StatelessWidget {
  const _SourceRow({
    required this.row,
    required this.index,
    required this.review,
  });
  final Map<String, String> row;
  final int index;
  final bool review;
  @override
  Widget build(BuildContext context) {
    final title = row.entries
        .where(
          (e) => [
            'product name',
            'card name',
          ].contains(e.key.trim().toLowerCase()),
        )
        .firstOrNull
        ?.value;
    return ExpansionTile(
      key: ValueKey(index),
      title: Text(title == null || title.isEmpty ? 'Source row' : title),
      subtitle: Text(
        'Source row ${index + 2} · ${review ? 'Needs review; not added from this row' : 'Previously reconciled'}',
      ),
      children: [
        for (final entry in row.entries)
          ListTile(
            title: Text(entry.key),
            subtitle: SelectableText(entry.value.isEmpty ? '—' : entry.value),
          ),
      ],
    );
  }
}
