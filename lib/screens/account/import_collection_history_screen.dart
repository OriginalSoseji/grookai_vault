import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Private source evidence is readable by its owner only. These rows are not
/// inventory and must not contribute to portfolio quantities or valuation.
class ImportCollectionHistoryScreen extends StatefulWidget {
  const ImportCollectionHistoryScreen({super.key, required this.client});
  final SupabaseClient client;
  @override
  State<ImportCollectionHistoryScreen> createState() =>
      _ImportCollectionHistoryScreenState();
}

class _ImportCollectionHistoryScreenState
    extends State<ImportCollectionHistoryScreen> {
  final _documents = <Map<String, dynamic>>[];
  late final String? _owner = widget.client.auth.currentUser?.id;
  bool _loading = false, _more = true;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_loading || !_more) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_owner == null || widget.client.auth.currentUser?.id != _owner) {
        throw StateError('account changed');
      }
      final rows = await widget.client
          .from('vault_collection_import_documents_v2')
          .select('source_sha256,created_at')
          .eq('user_id', _owner)
          .order('created_at', ascending: false)
          .order('source_sha256', ascending: true)
          .range(_documents.length, _documents.length + 19);
      if (!mounted) return;
      if (widget.client.auth.currentUser?.id != _owner) {
        throw StateError('account changed');
      }
      setState(() {
        _documents.addAll(rows);
        _more = rows.isNotEmpty;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Saved imports could not be loaded. Check your account and retry.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Saved imports')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Your original CSV details are private. Review rows are not counted as owned cards. To retry matching, choose the original CSV from Import Collection.',
        ),
        const SizedBox(height: 16),
        if (_documents.isEmpty && !_loading && _error == null)
          const Text('No saved imports yet.'),
        for (final document in _documents)
          ListTile(
            leading: const Icon(Icons.description_outlined),
            title: Text(
              'Imported ${(document['created_at'] as String).split('T').first}',
            ),
            subtitle: const Text('View original rows and review status'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => _SavedImportDetails(
                  client: widget.client,
                  owner: _owner!,
                  sourceHash: document['source_sha256'] as String,
                ),
              ),
            ),
          ),
        if (_error != null) Text(_error!),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_more)
          TextButton(
            onPressed: _load,
            child: Text(_error == null ? 'Show more' : 'Retry'),
          ),
      ],
    ),
  );
}

class _SavedImportDetails extends StatefulWidget {
  const _SavedImportDetails({
    required this.client,
    required this.owner,
    required this.sourceHash,
  });
  final SupabaseClient client;
  final String owner, sourceHash;
  @override
  State<_SavedImportDetails> createState() => _SavedImportDetailsState();
}

class _SavedImportDetailsState extends State<_SavedImportDetails> {
  List<Map<String, dynamic>>? _rows;
  final _savedIndices = <int>{};
  String? _error;
  bool _reviewOnly = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
      _rows = null;
    });
    try {
      if (widget.client.auth.currentUser?.id != widget.owner) {
        throw StateError('account changed');
      }
      final document = await widget.client
          .from('vault_collection_import_documents_v2')
          .select('source_rows')
          .eq('user_id', widget.owner)
          .eq('source_sha256', widget.sourceHash)
          .single();
      final rows = (document['source_rows'] as List)
          .map((r) => Map<String, dynamic>.from(r as Map))
          .toList();
      final saved = <int>{};
      String? after;
      while (true) {
        var query = widget.client
            .from('vault_collection_import_groups_v2')
            .select('group_key,source_indices')
            .eq('user_id', widget.owner)
            .eq('source_sha256', widget.sourceHash);
        if (after != null) query = query.gt('group_key', after);
        final page = await query.order('group_key', ascending: true).limit(500);
        if (page.isEmpty) break;
        for (final group in page) {
          final key = group['group_key'] as String;
          if (after != null && key.compareTo(after) <= 0) {
            throw StateError('pagination failed');
          }
          after = key;
          saved.addAll((group['source_indices'] as List).cast<int>());
        }
      }
      if (!mounted) return;
      if (widget.client.auth.currentUser?.id != widget.owner) {
        throw StateError('account changed');
      }
      setState(() {
        _rows = rows;
        _savedIndices
          ..clear()
          ..addAll(saved);
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'This saved import could not be loaded. Please retry.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    final indices = rows == null
        ? <int>[]
        : [
            for (var i = 0; i < rows.length; i++)
              if (!_reviewOnly || !_savedIndices.contains(i)) i,
          ];
    return Scaffold(
      appBar: AppBar(title: const Text('Original CSV details')),
      body: _error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_error!),
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            )
          : rows == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                SwitchListTile(
                  title: Text(
                    'Needs review (${rows.length - _savedIndices.length})',
                  ),
                  value: _reviewOnly,
                  onChanged: (value) => setState(() => _reviewOnly = value),
                ),
                if (indices.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No rows in this view.'),
                  ),
                Expanded(
                  child: ListView.builder(
                    itemCount: indices.length,
                    itemBuilder: (context, position) {
                      final index = indices[position], row = rows[index];
                      final name =
                          row.entries
                              .where(
                                (e) =>
                                    e.key.trim().toLowerCase() ==
                                    'product name',
                              )
                              .firstOrNull
                              ?.value ??
                          'Original row';
                      return ExpansionTile(
                        key: ValueKey(index),
                        title: Text('$name'),
                        subtitle: Text(
                          'CSV row ${index + 2} · ${_savedIndices.contains(index) ? 'Reconciled to owned copies' : 'Needs review; not owned'}',
                        ),
                        children: [
                          for (final entry in row.entries)
                            ListTile(
                              title: Text(entry.key),
                              subtitle: SelectableText(
                                entry.value.toString().isEmpty
                                    ? '—'
                                    : entry.value.toString(),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
