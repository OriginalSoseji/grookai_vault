import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/import/collection_import_service.dart';
import '../../services/import/collection_import_source_session.dart';
import 'import_collection_history_screen.dart';

enum _ImportPreviewFilter { all, matched, needsReview }

class ImportCollectionScreen extends StatefulWidget {
  const ImportCollectionScreen({
    super.key,
    this.client,
    this.sourceAwareImport = true,
  });

  final SupabaseClient? client;
  final bool sourceAwareImport;

  @override
  State<ImportCollectionScreen> createState() => _ImportCollectionScreenState();
}

class _ImportCollectionScreenState extends State<ImportCollectionScreen> {
  late final SupabaseClient _client = widget.client ?? Supabase.instance.client;

  String? _fileName;
  bool _matching = false;
  bool _importing = false;
  String? _error;
  bool _retryImport = false;
  CollectionImportPreview? _preview;
  CollectionImportSourceSession? _sourceSession;
  CollectionImportResult? _result;
  _ImportPreviewFilter _filter = _ImportPreviewFilter.all;
  int _displayLimit = 50;

  Future<void> _pickCsv() async {
    if (_importing || _matching) return;
    setState(() {
      _matching = true;
      _error = null;
    });

    try {
      final picked = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['csv'],
        withData: true,
      );

      if (picked == null || picked.files.isEmpty) {
        if (!mounted) {
          return;
        }
        setState(() {
          _matching = false;
        });
        return;
      }

      final file = picked.files.first;
      final bytes =
          file.bytes ??
          (file.path == null ? null : await File(file.path!).readAsBytes());

      if (bytes == null) {
        throw Exception('The selected file could not be read.');
      }

      final csvText = CollectionImportService.decodeCsvBytes(bytes);
      final sourceSession = widget.sourceAwareImport
          ? await CollectionImportSourceSession.prepare(
              client: _client,
              csvText: csvText,
            )
          : null;
      final preview =
          sourceSession?.preview ??
          await CollectionImportService.buildPreview(
            client: _client,
            csvText: csvText,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _fileName = file.name;
        _preview = preview;
        _sourceSession = sourceSession;
        _result = null;
        _retryImport = false;
        _filter = _ImportPreviewFilter.all;
        _displayLimit = 50;
        _matching = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _matching = false;
        _error = error is Error ? error.toString() : error.toString();
      });
    }
  }

  Future<void> _import() async {
    final preview = _preview;
    if (preview == null || _importing || _matching) {
      return;
    }

    setState(() {
      _importing = true;
      _error = null;
      _result = null;
    });

    try {
      final result = _sourceSession != null
          ? await _sourceSession!.save(_client)
          : await CollectionImportService.importPreview(
              client: _client,
              preview: preview,
            );
      if (!mounted) {
        return;
      }

      setState(() {
        _result = result;
        _importing = false;
        _retryImport = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _importing = false;
        _retryImport = true;
        _error = error is Error ? error.toString() : error.toString();
      });
    }
  }

  List<CollectionImportPreviewRow> get _filteredRows {
    final preview = _preview;
    if (preview == null) {
      return const [];
    }

    switch (_filter) {
      case _ImportPreviewFilter.matched:
        return preview.rows.where((row) => row.canImport).toList();
      case _ImportPreviewFilter.needsReview:
        return preview.rows.where((row) => !row.canImport).toList();
      case _ImportPreviewFilter.all:
        return preview.rows;
    }
  }

  @override
  Widget build(BuildContext context) {
    final preview = _preview;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final matchedCount = preview?.summary.matchedRows ?? 0;
    final filteredRows = _filteredRows;
    final visibleRows = filteredRows.take(_displayLimit).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Import Collection'),
        actions: [
          if (widget.sourceAwareImport)
            IconButton(
              tooltip: 'Saved imports',
              icon: const Icon(Icons.history),
              onPressed: _importing || _matching
                  ? null
                  : () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            ImportCollectionHistoryScreen(client: _client),
                      ),
                    ),
            ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
          children: [
            _ToolSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Import your collection',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Upload a Collectr CSV to match your cards, review the results, and bring them into your vault.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.72),
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _matching || _importing ? null : _pickCsv,
                          icon: const Icon(Icons.upload_file_outlined),
                          label: Text(
                            _fileName == null ? 'Choose CSV' : 'Replace CSV',
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_fileName != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      'File: $_fileName',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.68),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              _StatusSurface(tone: _StatusTone.error, message: _error!),
            ],
            if (_matching) ...[
              const SizedBox(height: 12),
              const _StatusSurface(
                tone: _StatusTone.pending,
                message: 'Matching your cards against Grookai’s catalog…',
              ),
            ],
            if (preview != null) ...[
              const SizedBox(height: 12),
              _ToolSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Import Preview',
                                style: theme.textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Review matched rows before anything is written to your vault.',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.7,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        _ReportPill(
                          label: 'Read',
                          value: preview.report.rowsRead.toString(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _sourceSession != null
                          ? '${preview.report.sourceQuantity} items in the CSV. Existing matching copies are checked when you import. '
                                'Original rows, grades and portfolio names are saved privately for review. Rows needing review are not added as owned cards.'
                          : '${preview.report.sourceQuantity} ${preview.report.sourceQuantity == 1 ? 'item' : 'items'} in the CSV. '
                                '${preview.report.rowsAlreadyOwned} source rows already owned. '
                                'Rows needing review are kept here and will not be imported.',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _FilterChip(
                          label: 'All ${preview.summary.totalRows}',
                          selected: _filter == _ImportPreviewFilter.all,
                          onTap: () => setState(
                            () => _filter = _ImportPreviewFilter.all,
                          ),
                        ),
                        _FilterChip(
                          label: 'Ready ${preview.summary.matchedRows}',
                          selected: _filter == _ImportPreviewFilter.matched,
                          onTap: () => setState(
                            () => _filter = _ImportPreviewFilter.matched,
                          ),
                        ),
                        _FilterChip(
                          label:
                              'Need Review ${preview.summary.multipleRows + preview.summary.unmatchedRows}',
                          selected: _filter == _ImportPreviewFilter.needsReview,
                          onTap: () => setState(
                            () => _filter = _ImportPreviewFilter.needsReview,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    for (
                      var index = 0;
                      index < visibleRows.length;
                      index++
                    ) ...[
                      _ImportPreviewTile(row: visibleRows[index]),
                      if (index < visibleRows.length - 1)
                        const SizedBox(height: 10),
                    ],
                    if (visibleRows.length < filteredRows.length)
                      TextButton(
                        onPressed: () => setState(() => _displayLimit += 50),
                        child: Text(
                          'Show more (${filteredRows.length - visibleRows.length} remaining)',
                        ),
                      ),
                    const SizedBox(height: 14),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _result != null && _sourceSession != null
                                    ? 'Import saved'
                                    : 'Ready to import',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _result != null && _sourceSession != null
                                    ? 'Imported ${_result!.importedCards} cards. ${_result!.needsManualMatch} original rows need review in Saved imports.'
                                    : matchedCount > 0
                                    ? '$matchedCount matched ${matchedCount == 1 ? 'row is' : 'rows are'} ready for import.'
                                    : 'No matched rows are ready to import yet.',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.72,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        FilledButton(
                          onPressed:
                              (matchedCount == 0 && _sourceSession == null) ||
                                  _importing ||
                                  _matching ||
                                  _result != null
                              ? null
                              : _import,
                          child: Text(
                            _importing
                                ? 'Importing…'
                                : _retryImport
                                ? 'Retry import'
                                : matchedCount == 0 && _sourceSession != null
                                ? 'Save for review'
                                : 'Import to Vault',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            if (_result != null && _sourceSession == null) ...[
              const SizedBox(height: 12),
              _StatusSurface(
                tone: _StatusTone.success,
                message:
                    'Imported ${_result!.importedCards} ${_result!.importedCards == 1 ? 'card' : 'cards'} across ${_result!.importedEntries} ${_result!.importedEntries == 1 ? 'vault entry' : 'vault entries'}. ${_result!.needsManualMatch} ${_result!.needsManualMatch == 1 ? 'row needs' : 'rows need'} manual review.',
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ToolSurface extends StatelessWidget {
  const _ToolSurface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.14)),
      ),
      child: child,
    );
  }
}

enum _StatusTone { success, error, pending }

class _StatusSurface extends StatelessWidget {
  const _StatusSurface({required this.tone, required this.message});

  final _StatusTone tone;
  final String message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final (background, foreground, border) = switch (tone) {
      _StatusTone.success => (
        colorScheme.primary.withValues(alpha: 0.08),
        colorScheme.primary,
        colorScheme.primary.withValues(alpha: 0.18),
      ),
      _StatusTone.pending => (
        Colors.lightBlue.withValues(alpha: 0.1),
        Colors.lightBlue.shade800,
        Colors.lightBlue.withValues(alpha: 0.18),
      ),
      _StatusTone.error => (
        Colors.red.withValues(alpha: 0.08),
        Colors.red.shade700,
        Colors.red.withValues(alpha: 0.18),
      ),
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: foreground,
          height: 1.35,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _ReportPill extends StatelessWidget {
  const _ReportPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label $value',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: colorScheme.primary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ImportPreviewTile extends StatelessWidget {
  const _ImportPreviewTile({required this.row});

  final CollectionImportPreviewRow row;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final tone = row.reviewReasons.isNotEmpty
        ? (
            Colors.amber.withValues(alpha: 0.12),
            Colors.amber.shade800,
            'Needs review',
          )
        : switch (row.status) {
            CollectionImportMatchStatus.matched => (
              colorScheme.primary.withValues(alpha: 0.08),
              colorScheme.primary,
              'Matched',
            ),
            CollectionImportMatchStatus.multiple => (
              Colors.amber.withValues(alpha: 0.12),
              Colors.amber.shade800,
              'Needs review',
            ),
            CollectionImportMatchStatus.missing => (
              colorScheme.surfaceContainerHighest,
              colorScheme.onSurface.withValues(alpha: 0.72),
              'Missing match',
            ),
          };

    final metadata = <String>[
      row.row.displaySet,
      row.row.displayNumber,
      'Qty ${row.desiredQuantity}',
      if (row.row.displayGame.isNotEmpty) row.row.displayGame,
      if (row.row.finish.isNotEmpty) row.row.finish,
      if (row.row.grade.isNotEmpty) row.row.grade,
      if (row.row.portfolio.isNotEmpty) 'Portfolio: ${row.row.portfolio}',
      'CSV row${row.row.sourceRows.length == 1 ? '' : 's'} ${row.row.sourceRows.join(', ')}',
    ].where((value) => value.trim().isNotEmpty && value != '—').toList();

    String support;
    if (row.reviewReasons.isNotEmpty) {
      support = row.reviewReasons.join('\n');
    } else if (row.status == CollectionImportMatchStatus.matched &&
        row.match != null) {
      support = row.match!.gvId;
    } else if (row.status == CollectionImportMatchStatus.multiple) {
      support = '${row.matches.length} possible matches';
    } else {
      support = 'No catalog match yet';
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  row.row.displayName,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  metadata.join(' • '),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  support,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.62),
                  ),
                ),
                if (row.row.sourceRecords.isNotEmpty)
                  TextButton(
                    onPressed: () => showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      builder: (context) => DraggableScrollableSheet(
                        expand: false,
                        initialChildSize: 0.7,
                        builder: (context, controller) => ListView(
                          controller: controller,
                          padding: const EdgeInsets.all(20),
                          children: [
                            Text(
                              'CSV details',
                              style: theme.textTheme.titleLarge,
                            ),
                            for (final source in row.row.sourceRecords) ...[
                              const SizedBox(height: 16),
                              Text(
                                'CSV row ${source.sourceRow}',
                                style: theme.textTheme.titleSmall,
                              ),
                              for (final field in source.sourceFields.entries)
                                ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  title: Text(field.key),
                                  subtitle: SelectableText(
                                    field.value.isEmpty ? '—' : field.value,
                                  ),
                                ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    child: const Text('View CSV details'),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: tone.$1,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              tone.$3,
              style: theme.textTheme.labelSmall?.copyWith(
                color: tone.$2,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
