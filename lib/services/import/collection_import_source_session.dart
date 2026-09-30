import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'collection_import_service.dart';

/// One CSV selection and its retry identity. Uncertain outcomes keep the same
/// request; only a confirmed failed receipt starts a fresh attempt.
class CollectionImportSourceSession {
  CollectionImportSourceSession._(this.csvText, this.preview)
    : sourceSha256 = sha256.convert(utf8.encode(csvText)).toString();

  final String csvText;
  final String sourceSha256;
  final CollectionImportPreview preview;
  String _requestId = _newRequestId();

  static Future<CollectionImportSourceSession> prepare({
    required SupabaseClient client,
    required String csvText,
  }) async {
    if (utf8.encode(csvText).length > 1900000 ||
        CollectionImportService.parseCollectrCsv(csvText).length > 5000) {
      throw const CollectionImportFailure(
        'This CSV is too large. Split it into files of at most 5,000 rows.',
      );
    }
    final preview = await CollectionImportService.buildPreview(
      client: client,
      csvText: csvText,
      sourceAware: true,
    );
    return CollectionImportSourceSession._(csvText, preview);
  }

  static String _newRequestId() {
    final random = Random.secure();
    final bytes = List.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  static const _uncertain = CollectionImportFailure(
    'We could not confirm the import. Some cards may already be saved. '
    'Retry to check this same import without creating duplicates. '
    'If you close this screen, choose the original CSV again.',
  );

  Future<CollectionImportResult> save(SupabaseClient client) async {
    final owner = preview.ownerUserId;
    if (client.auth.currentUser?.id != owner) {
      throw const CollectionImportFailure(
        'Your account changed. Choose the CSV again for the signed-in account.',
      );
    }
    final ready = preview.rows.where((r) => r.canImport).toList();
    final expected = <String, CollectionImportPreviewRow>{
      for (final row in ready)
        _key(row.row.sourceRows.map((n) => n - 2).toList()): row,
    };
    final attempt = _requestId;
    try {
      final response = await client.functions.invoke(
        'vault-import-collection-v2',
        body: {
          'ownerUserId': owner,
          'requestId': attempt,
          'csvText': csvText,
          'targets': [
            for (final row in ready)
              {
                'sourceIndices': row.row.sourceRows.map((n) => n - 2).toList(),
                'cardId': row.match!.cardId,
                'gvId': row.match!.gvId,
                'cardPrintingId': row.cardPrintingId,
              },
          ],
        },
      );
      final data = response.data;
      if (response.status != 200 ||
          data is! Map ||
          data['success'] != true ||
          data['requestId'] != attempt ||
          data['sourceSha256'] != sourceSha256 ||
          data['sourceRows'] != preview.report.rowsRead ||
          data['targets'] is! List ||
          data['importedCards'] is! int ||
          data['importedEntries'] is! int ||
          data['reviewRows'] is! int) {
        throw _uncertain;
      }
      final added = data['importedCards'] as int,
          entries = data['importedEntries'] as int;
      final review = data['reviewRows'] as int;
      if (added < 0 ||
          added > ready.fold(0, (n, r) => n + r.desiredQuantity) ||
          entries < 0 ||
          entries > ready.length ||
          review < 0 ||
          review > preview.report.rowsRead) {
        throw _uncertain;
      }
      final ids = <String, CollectionImportPreviewRow>{};
      final returnedGroups = <String, List<String>>{};
      for (final target in data['targets'] as List) {
        if (target is! Map ||
            target['sourceIndices'] is! List ||
            target['instanceIds'] is! List) {
          throw _uncertain;
        }
        final key = _key(target['sourceIndices'] as List);
        final row = expected[key];
        if (row == null ||
            returnedGroups.containsKey(key) ||
            target['cardId'] != row.match!.cardId ||
            target['cardPrintingId'] != row.cardPrintingId ||
            (target['instanceIds'] as List).length != row.desiredQuantity) {
          throw _uncertain;
        }
        final groupIds = <String>[];
        for (final id in target['instanceIds'] as List) {
          if (id is! String ||
              !RegExp(r'^[0-9a-f-]{36}$').hasMatch(id) ||
              ids.containsKey(id)) {
            throw _uncertain;
          }
          ids[id] = row;
          groupIds.add(id);
        }
        returnedGroups[key] = groupIds;
      }
      if (returnedGroups.length != expected.length ||
          client.auth.currentUser?.id != owner) {
        throw _uncertain;
      }

      // Verify the saved private source independently under the owner's RLS.
      final document = await client
          .from('vault_collection_import_documents_v2')
          .select('source_rows')
          .eq('user_id', owner)
          .eq('source_sha256', sourceSha256)
          .single();
      final source = document['source_rows'];
      final original = CollectionImportService.parseCollectrCsv(csvText);
      if (source is! List || source.length != original.length) throw _uncertain;
      for (var i = 0; i < original.length; i++) {
        final saved = source[i], fields = original[i].sourceFields;
        if (saved is! Map ||
            saved.length != fields.length ||
            fields.entries.any((e) => saved[e.key] != e.value)) {
          throw _uncertain;
        }
      }

      // Confirm each group-to-copy mapping; never substitute a parent total.
      var mappedRows = 0;
      final verifiedGroups = <String>{};
      String? after;
      while (true) {
        var query = client
            .from('vault_collection_import_groups_v2')
            .select('group_key,source_indices,instance_ids,target')
            .eq('user_id', owner)
            .eq('source_sha256', sourceSha256);
        if (after != null) query = query.gt('group_key', after);
        final page = await query.order('group_key', ascending: true).limit(500);
        if (page.isEmpty) break;
        for (final group in page) {
          final key = group['group_key'];
          if (key is! String ||
              (after != null && key.compareTo(after) <= 0) ||
              group['source_indices'] is! List ||
              group['instance_ids'] is! List) {
            throw _uncertain;
          }
          after = key;
          mappedRows += (group['source_indices'] as List).length;
          final groupKey = _key(group['source_indices'] as List);
          if (returnedGroups.containsKey(groupKey)) {
            final savedIds = (group['instance_ids'] as List).cast<String>()
              ..sort();
            final responseIds = [...returnedGroups[groupKey]!]..sort();
            if (jsonEncode(savedIds) != jsonEncode(responseIds)) {
              throw _uncertain;
            }
            verifiedGroups.add(groupKey);
          }
        }
      }
      if (verifiedGroups.length != expected.length ||
          review != original.length - mappedRows) {
        throw _uncertain;
      }

      final allIds = ids.keys.toList();
      final verifiedIds = <String>{};
      for (var start = 0; start < allIds.length; start += 100) {
        final chunk = allIds.sublist(
          start,
          (start + 100).clamp(0, allIds.length),
        );
        final copies = await client
            .from('vault_item_instances')
            .select(
              'id,card_print_id,card_printing_id,condition_label,acquisition_cost,notes,created_at,is_graded',
            )
            .eq('user_id', owner)
            .inFilter('id', chunk);
        for (final copy in copies) {
          final row = ids[copy['id']];
          if (row == null ||
              !verifiedIds.add(copy['id'] as String) ||
              copy['card_print_id'] != row.match!.cardId ||
              copy['card_printing_id'] != row.cardPrintingId ||
              copy['is_graded'] == true) {
            throw _uncertain;
          }
          // Newly saved outcomes must read back acquisition details exactly.
          // On later retries users may already have edited their owned copies.
          if (added > 0 &&
              (copy['condition_label'] != row.row.condition ||
                  (copy['acquisition_cost'] as num?)?.toDouble() !=
                      row.row.cost ||
                  copy['notes'] != row.row.notes ||
                  (row.row.added != null &&
                      DateTime.parse(
                            copy['created_at'] as String,
                          ).toUtc().toIso8601String().substring(0, 10) !=
                          DateTime.parse(
                            row.row.added!,
                          ).toUtc().toIso8601String().substring(0, 10)))) {
            throw _uncertain;
          }
        }
      }
      if (verifiedIds.length != ids.length ||
          client.auth.currentUser?.id != owner) {
        throw _uncertain;
      }
      return CollectionImportResult(
        importedCards: added,
        importedEntries: entries,
        needsManualMatch: review,
        skippedRows: review,
      );
    } on FunctionException catch (error) {
      final code = error.details is Map
          ? (error.details as Map)['error']
          : null;
      if (error.status == 422) {
        _requestId = _newRequestId();
        throw CollectionImportFailure(
          code == 'vault_paused'
              ? 'Vault imports are temporarily paused. Keep the CSV and retry later.'
              : 'This attempt was not saved. Keep the CSV and retry.',
        );
      }
      if (error.status == 401 || code == 'import_account_changed') {
        throw const CollectionImportFailure(
          'Sign in to the original account, then choose the same CSV again.',
        );
      }
      if (error.status == 400 || code == 'import_request_conflict') {
        throw const CollectionImportFailure(
          'The import could not validate these rows. Choose the CSV again to refresh its matches; the file is unchanged.',
        );
      }
      throw _uncertain;
    } on CollectionImportFailure {
      rethrow;
    } catch (_) {
      throw _uncertain;
    }
  }

  static String _key(List indices) {
    if (indices.any((n) => n is! int)) throw _uncertain;
    final sorted = indices.cast<int>().toList()..sort();
    return jsonEncode(sorted);
  }
}
