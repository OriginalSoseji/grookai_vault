import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/vault/collection_project.dart';
import '../../utils/display_image_contract.dart';
import 'vault_card_service.dart';

class CollectionProjectAuthenticationException implements Exception {
  const CollectionProjectAuthenticationException();

  @override
  String toString() => 'Sign in to manage collection projects.';
}

class CollectionProjectTargetNotFoundException implements Exception {
  const CollectionProjectTargetNotFoundException({
    required this.subjectType,
    required this.subjectId,
  });

  final CollectionProjectSubjectType subjectType;
  final String subjectId;

  @override
  String toString() =>
      'The ${subjectType.label.toLowerCase()} project target was not found.';
}

class CollectionProjectServiceException implements Exception {
  const CollectionProjectServiceException(this.operation, this.cause);

  final String operation;
  final Object cause;

  @override
  String toString() => 'CollectionProjectServiceException($operation): $cause';
}

class CollectionProjectWatchRecord {
  const CollectionProjectWatchRecord({
    required this.id,
    required this.subjectType,
    required this.subjectId,
    this.createdAt,
  });

  final String id;
  final CollectionProjectSubjectType subjectType;
  final String subjectId;
  final DateTime? createdAt;
}

class CollectionProjectTargetProgress {
  const CollectionProjectTargetProgress({
    required this.subjectId,
    required this.title,
    required this.routeKey,
    required this.totalCount,
    required this.ownedCount,
    this.imageUrl,
  });

  final String subjectId;
  final String title;
  final String routeKey;
  final int totalCount;
  final int ownedCount;
  final String? imageUrl;
}

abstract interface class CollectionProjectDataSource {
  String? get currentUserId;

  Future<List<CollectionProjectWatchRecord>> loadActiveManualWatches(
    String userId,
  );

  Future<Map<String, CollectionProjectTargetProgress>> loadSetTargets({
    required String userId,
    required Set<String> subjectIds,
  });

  Future<Map<String, CollectionProjectTargetProgress>> loadSpeciesTargets({
    required Set<String> subjectIds,
  });

  Future<bool> targetExists({
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  });

  Future<bool> hasActiveManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  });

  Future<void> upsertManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  });

  Future<void> deleteManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  });

  Future<int> loadWantedCardCount(String userId);
}

class SupabaseCollectionProjectDataSource
    implements CollectionProjectDataSource {
  SupabaseCollectionProjectDataSource({SupabaseClient? client})
    : _client = client ?? Supabase.instance.client;

  static const int _setProgressConcurrency = 4;

  final SupabaseClient _client;

  @override
  String? get currentUserId {
    final userId = (_client.auth.currentUser?.id ?? '').trim();
    return userId.isEmpty ? null : userId;
  }

  @override
  Future<List<CollectionProjectWatchRecord>> loadActiveManualWatches(
    String userId,
  ) async {
    final response = await _client
        .from('watches')
        .select('id,subject_type,subject_id,created_at')
        .eq('user_id', userId)
        .eq('reason', 'manual')
        .filter('muted_at', 'is', null)
        .inFilter('subject_type', const <String>['set', 'character'])
        .order('created_at', ascending: false);

    return _maps(response)
        .map((row) {
          final type = CollectionProjectSubjectType.fromDatabaseValue(
            row['subject_type'],
          );
          final id = _text(row['id']);
          final subjectId = _text(row['subject_id']);
          if (type == null || id.isEmpty || subjectId.isEmpty) {
            return null;
          }
          return CollectionProjectWatchRecord(
            id: id,
            subjectType: type,
            subjectId: subjectId,
            createdAt: _date(row['created_at']),
          );
        })
        .whereType<CollectionProjectWatchRecord>()
        .toList(growable: false);
  }

  @override
  Future<Map<String, CollectionProjectTargetProgress>> loadSetTargets({
    required String userId,
    required Set<String> subjectIds,
  }) async {
    if (subjectIds.isEmpty) {
      return const <String, CollectionProjectTargetProgress>{};
    }

    final response = await _client
        .from('sets')
        .select('id,code,name')
        .inFilter('id', subjectIds.toList(growable: false));
    final rows = _maps(response)
        .where(
          (row) =>
              _text(row['id']).isNotEmpty &&
              _text(row['code']).isNotEmpty &&
              _text(row['name']).isNotEmpty,
        )
        .toList(growable: false);
    if (rows.isEmpty) {
      return const <String, CollectionProjectTargetProgress>{};
    }

    // A dashboard can watch several sets. Resolve the owner's slab-only
    // copies once, then each set applies only its own bounded card universe.
    final ownerSlabOnlyCopies =
        await VaultCardService.fetchOwnedSlabOnlyCompletionCopies(
          client: _client,
          userId: userId,
        );

    final targets = <String, CollectionProjectTargetProgress>{};
    for (
      var offset = 0;
      offset < rows.length;
      offset += _setProgressConcurrency
    ) {
      final end = (offset + _setProgressConcurrency).clamp(0, rows.length);
      final chunk = rows.sublist(offset, end);
      final hydrated = await Future.wait(
        chunk.map(
          (row) => _loadSetTarget(
            userId: userId,
            row: row,
            ownerSlabOnlyCopies: ownerSlabOnlyCopies,
          ),
        ),
      );
      for (final target
          in hydrated.whereType<CollectionProjectTargetProgress>()) {
        targets[target.subjectId] = target;
      }
    }
    return targets;
  }

  Future<CollectionProjectTargetProgress?> _loadSetTarget({
    required String userId,
    required Map<String, dynamic> row,
    required Iterable<VaultSetCompletionCopy> ownerSlabOnlyCopies,
  }) async {
    final subjectId = _text(row['id']);
    final code = _text(row['code']).toLowerCase();
    final title = _text(row['name']);
    if (subjectId.isEmpty || code.isEmpty || title.isEmpty) {
      return null;
    }

    final progress = await VaultCardService.fetchSetCompletionSnapshot(
      client: _client,
      userId: userId,
      setId: subjectId,
      ownerSlabOnlyCopies: ownerSlabOnlyCopies,
    );
    return CollectionProjectTargetProgress(
      subjectId: subjectId,
      title: title,
      routeKey: code,
      totalCount: progress.variantOptionCount,
      ownedCount: progress.ownedVariantOptionCount,
      imageUrl: buildHostedSetLogoUrl(code),
    );
  }

  @override
  Future<Map<String, CollectionProjectTargetProgress>> loadSpeciesTargets({
    required Set<String> subjectIds,
  }) async {
    if (subjectIds.isEmpty) {
      return const <String, CollectionProjectTargetProgress>{};
    }
    final normalizedIds = subjectIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final speciesRows = <Map<String, dynamic>>[];
    for (final chunk in _chunks(normalizedIds)) {
      final response = await _client
          .from('v_grookai_dex_species_v1')
          .select('species_id,display_name,slug,total_print_count,active')
          .eq('active', true)
          .inFilter('species_id', chunk);
      speciesRows.addAll(_maps(response));
    }

    final cardPrintIdsBySpeciesId = <String, Set<String>>{};
    for (final chunk in _chunks(normalizedIds)) {
      for (var offset = 0; ; offset += 1000) {
        final response = await _client
            .from('v_grookai_dex_card_prints_v1')
            .select('species_id,card_print_id')
            .eq('mapping_active', true)
            .eq('counts_for_completion', true)
            .inFilter('species_id', chunk)
            .order('species_id', ascending: true)
            .order('card_print_id', ascending: true)
            .range(offset, offset + 999);
        final rows = _maps(response);
        for (final row in rows) {
          final speciesId = _text(row['species_id']);
          final cardPrintId = _text(row['card_print_id']);
          if (speciesId.isNotEmpty && cardPrintId.isNotEmpty) {
            (cardPrintIdsBySpeciesId[speciesId] ??= <String>{}).add(
              cardPrintId,
            );
          }
        }
        if (rows.length < 1000) {
          break;
        }
      }
    }
    final ownedCounts = await VaultCardService.getOwnedCountsIncludingSlabs(
      client: _client,
      cardPrintIds: cardPrintIdsBySpeciesId.values.expand((ids) => ids),
    );
    return <String, CollectionProjectTargetProgress>{
      for (final row in speciesRows)
        if (_text(row['species_id']).isNotEmpty)
          _text(row['species_id']): CollectionProjectTargetProgress(
            subjectId: _text(row['species_id']),
            title: _text(row['display_name']),
            routeKey: _text(row['slug']),
            totalCount: _int(row['total_print_count']),
            ownedCount:
                cardPrintIdsBySpeciesId[_text(row['species_id'])]
                    ?.where((id) => (ownedCounts[id] ?? 0) > 0)
                    .length ??
                0,
          ),
    };
  }

  @override
  Future<bool> targetExists({
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    final response = switch (subjectType) {
      CollectionProjectSubjectType.set =>
        await _client
            .from('sets')
            .select('id')
            .eq('id', subjectId)
            .limit(1)
            .maybeSingle(),
      CollectionProjectSubjectType.species =>
        await _client
            .from('pokemon_species')
            .select('id')
            .eq('id', subjectId)
            .eq('active', true)
            .limit(1)
            .maybeSingle(),
    };
    return response != null;
  }

  @override
  Future<bool> hasActiveManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    final response = await _client
        .from('watches')
        .select('id')
        .eq('user_id', userId)
        .eq('subject_type', subjectType.databaseValue)
        .eq('subject_id', subjectId)
        .eq('reason', 'manual')
        .filter('muted_at', 'is', null)
        .limit(1)
        .maybeSingle();
    return response != null;
  }

  @override
  Future<void> upsertManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    await _client.from('watches').upsert(<String, dynamic>{
      'user_id': userId,
      'subject_type': subjectType.databaseValue,
      'subject_id': subjectId,
      'reason': 'manual',
      'strength': 1.0,
      'origin': 'live',
      'muted_at': null,
    }, onConflict: 'user_id,subject_type,subject_id');
  }

  @override
  Future<void> deleteManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    // A project shares the interest graph's one-row-per-subject contract.
    // Deleting the explicit manual row lets later owned/inferred activity
    // recreate its own watch. Muting it would suppress those future signals
    // because the interest-graph upsert intentionally preserves muted state.
    await _client
        .from('watches')
        .delete()
        .eq('user_id', userId)
        .eq('subject_type', subjectType.databaseValue)
        .eq('subject_id', subjectId)
        .eq('reason', 'manual');
  }

  @override
  Future<int> loadWantedCardCount(String userId) {
    return _client
        .from('user_card_intents')
        .count(CountOption.exact)
        .eq('user_id', userId)
        .eq('want', true);
  }
}

class CollectionProjectService {
  CollectionProjectService({CollectionProjectDataSource? dataSource})
    : _dataSource = dataSource ?? SupabaseCollectionProjectDataSource();

  final CollectionProjectDataSource _dataSource;

  Future<CollectionProjectsSnapshot> loadDashboard() async {
    final userId = _requireUserId();
    try {
      final watchesFuture = _dataSource.loadActiveManualWatches(userId);
      final wantedCountFuture = _loadWantedCardCountSafely(userId);
      final watches = await watchesFuture;

      final setIds = <String>{
        for (final watch in watches)
          if (watch.subjectType == CollectionProjectSubjectType.set)
            watch.subjectId,
      };
      final speciesIds = <String>{
        for (final watch in watches)
          if (watch.subjectType == CollectionProjectSubjectType.species)
            watch.subjectId,
      };

      final setTargetsFuture = _dataSource.loadSetTargets(
        userId: userId,
        subjectIds: setIds,
      );
      final speciesTargetsFuture = _dataSource.loadSpeciesTargets(
        subjectIds: speciesIds,
      );
      final targetMaps =
          await Future.wait<Map<String, CollectionProjectTargetProgress>>([
            setTargetsFuture,
            speciesTargetsFuture,
          ]);
      final setTargets = targetMaps[0];
      final speciesTargets = targetMaps[1];

      final projects = <CollectionProject>[];
      for (final watch in watches) {
        final target = switch (watch.subjectType) {
          CollectionProjectSubjectType.set => setTargets[watch.subjectId],
          CollectionProjectSubjectType.species =>
            speciesTargets[watch.subjectId],
        };
        if (target == null) {
          continue;
        }
        projects.add(
          CollectionProject(
            watchId: watch.id,
            subjectType: watch.subjectType,
            subjectId: watch.subjectId,
            title: target.title,
            routeKey: target.routeKey,
            totalCount: target.totalCount,
            ownedCount: target.ownedCount,
            imageUrl: target.imageUrl,
            createdAt: watch.createdAt,
          ),
        );
      }
      projects.sort(_compareProjects);

      return CollectionProjectsSnapshot(
        projects: List<CollectionProject>.unmodifiable(projects),
        wantedCardCount: await wantedCountFuture,
      );
    } on CollectionProjectAuthenticationException {
      rethrow;
    } catch (error) {
      throw CollectionProjectServiceException('load_dashboard', error);
    }
  }

  Future<List<CollectionProject>> fetchActiveProjects() async {
    return (await loadDashboard()).projects;
  }

  Future<bool> isTracking({
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    final userId = _requireUserId();
    final normalizedSubjectId = subjectId.trim();
    if (normalizedSubjectId.isEmpty) {
      return false;
    }
    try {
      return await _dataSource.hasActiveManualWatch(
        userId: userId,
        subjectType: subjectType,
        subjectId: normalizedSubjectId,
      );
    } catch (error) {
      throw CollectionProjectServiceException('is_tracking', error);
    }
  }

  Future<void> startProject({
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    final userId = _requireUserId();
    final normalizedSubjectId = subjectId.trim();
    if (normalizedSubjectId.isEmpty) {
      throw CollectionProjectTargetNotFoundException(
        subjectType: subjectType,
        subjectId: normalizedSubjectId,
      );
    }

    try {
      final exists = await _dataSource.targetExists(
        subjectType: subjectType,
        subjectId: normalizedSubjectId,
      );
      if (!exists) {
        throw CollectionProjectTargetNotFoundException(
          subjectType: subjectType,
          subjectId: normalizedSubjectId,
        );
      }
      await _dataSource.upsertManualWatch(
        userId: userId,
        subjectType: subjectType,
        subjectId: normalizedSubjectId,
      );
    } on CollectionProjectTargetNotFoundException {
      rethrow;
    } catch (error) {
      throw CollectionProjectServiceException('start_project', error);
    }
  }

  Future<void> stopProject({
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    final userId = _requireUserId();
    final normalizedSubjectId = subjectId.trim();
    if (normalizedSubjectId.isEmpty) {
      return;
    }
    try {
      await _dataSource.deleteManualWatch(
        userId: userId,
        subjectType: subjectType,
        subjectId: normalizedSubjectId,
      );
    } catch (error) {
      throw CollectionProjectServiceException('stop_project', error);
    }
  }

  String _requireUserId() {
    final userId = (_dataSource.currentUserId ?? '').trim();
    if (userId.isEmpty) {
      throw const CollectionProjectAuthenticationException();
    }
    return userId;
  }

  Future<int?> _loadWantedCardCountSafely(String userId) async {
    try {
      return await _dataSource.loadWantedCardCount(userId);
    } catch (_) {
      return null;
    }
  }

  static int _compareProjects(CollectionProject left, CollectionProject right) {
    if (left.isComplete != right.isComplete) {
      return left.isComplete ? 1 : -1;
    }
    final leftCreatedAt = left.createdAt;
    final rightCreatedAt = right.createdAt;
    if (leftCreatedAt != null && rightCreatedAt != null) {
      final createdCompare = rightCreatedAt.compareTo(leftCreatedAt);
      if (createdCompare != 0) {
        return createdCompare;
      }
    } else if (leftCreatedAt != null) {
      return -1;
    } else if (rightCreatedAt != null) {
      return 1;
    }
    return left.title.toLowerCase().compareTo(right.title.toLowerCase());
  }
}

List<Map<String, dynamic>> _maps(dynamic value) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
  }
  if (value is Map) {
    return <Map<String, dynamic>>[Map<String, dynamic>.from(value)];
  }
  return const <Map<String, dynamic>>[];
}

String _text(dynamic value) => (value ?? '').toString().trim();

int _int(dynamic value) {
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(_text(value)) ?? 0;
}

Iterable<List<String>> _chunks(
  Iterable<String> values, {
  int size = 250,
}) sync* {
  var chunk = <String>[];
  for (final value in values) {
    chunk.add(value);
    if (chunk.length == size) {
      yield chunk;
      chunk = <String>[];
    }
  }
  if (chunk.isNotEmpty) {
    yield chunk;
  }
}

DateTime? _date(dynamic value) {
  if (value is DateTime) {
    return value;
  }
  return DateTime.tryParse(_text(value));
}
