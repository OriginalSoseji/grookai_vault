import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'dart:io';
import 'package:grookai_vault/models/vault/collection_project.dart';
import 'package:grookai_vault/screens/vault/collection_projects_screen.dart';
import 'package:grookai_vault/services/vault/collection_project_service.dart';

void main() {
  group('CollectionProject', () {
    test('uses finish-aware set progress and fixed milestones', () {
      final project = CollectionProject(
        watchId: 'watch-1',
        subjectType: CollectionProjectSubjectType.set,
        subjectId: 'set-1',
        title: 'Base Set',
        routeKey: 'base1',
        totalCount: 20,
        ownedCount: 10,
      );

      expect(project.completionPercent, 50);
      expect(project.nextMilestone, 75);
      expect(project.progressLabel, '10 of 20 finish options');
      expect(project.isComplete, isFalse);
    });

    test('uses distinct card-print language for completed species', () {
      final project = CollectionProject(
        watchId: 'watch-2',
        subjectType: CollectionProjectSubjectType.species,
        subjectId: 'species-1',
        title: 'Pikachu',
        routeKey: 'pikachu',
        totalCount: 12,
        ownedCount: 15,
      );

      expect(project.safeOwnedCount, 12);
      expect(project.completionPercent, 100);
      expect(project.nextMilestone, isNull);
      expect(project.progressLabel, '12 of 12 card prints');
      expect(project.isComplete, isTrue);
    });
  });

  group('CollectionProjectService', () {
    test(
      'hydrates only watched species and reuses one owner slab scan for sets',
      () {
        final source = File(
          'lib/services/vault/collection_project_service.dart',
        ).readAsStringSync();
        final vaultService = File(
          'lib/services/vault/vault_card_service.dart',
        ).readAsStringSync();

        expect(source, isNot(contains('GrookaiDexService.fetchSpeciesPage')));
        expect(source, contains(".inFilter('species_id', chunk)"));
        expect(source, contains('fetchOwnedSlabOnlyCompletionCopies'));
        expect(source, contains('ownerSlabOnlyCopies: ownerSlabOnlyCopies'));
        expect(vaultService, contains('fetchOwnedSlabOnlyCompletionCopies'));
        expect(vaultService, contains(".filter('card_print_id', 'is', null)"));
      },
    );

    test(
      'hydrates owner watches, drops unresolved targets, and sorts progress',
      () async {
        final source = _FakeProjectDataSource(
          watches: <CollectionProjectWatchRecord>[
            CollectionProjectWatchRecord(
              id: 'watch-complete',
              subjectType: CollectionProjectSubjectType.set,
              subjectId: 'set-1',
              createdAt: DateTime.utc(2026, 7, 20),
            ),
            CollectionProjectWatchRecord(
              id: 'watch-active',
              subjectType: CollectionProjectSubjectType.species,
              subjectId: 'species-1',
              createdAt: DateTime.utc(2026, 7, 19),
            ),
            const CollectionProjectWatchRecord(
              id: 'watch-orphan',
              subjectType: CollectionProjectSubjectType.set,
              subjectId: 'missing-set',
            ),
          ],
          setTargets: const <String, CollectionProjectTargetProgress>{
            'set-1': CollectionProjectTargetProgress(
              subjectId: 'set-1',
              title: 'Base Set',
              routeKey: 'base1',
              totalCount: 12,
              ownedCount: 12,
            ),
          },
          speciesTargets: const <String, CollectionProjectTargetProgress>{
            'species-1': CollectionProjectTargetProgress(
              subjectId: 'species-1',
              title: 'Pikachu',
              routeKey: 'pikachu',
              totalCount: 100,
              ownedCount: 40,
            ),
          },
          wantedCardCount: 7,
        );
        final service = CollectionProjectService(dataSource: source);

        final dashboard = await service.loadDashboard();

        expect(dashboard.wantedCardCount, 7);
        expect(dashboard.projects.map((project) => project.title), <String>[
          'Pikachu',
          'Base Set',
        ]);
        expect(source.requestedSetIds, <String>{'set-1', 'missing-set'});
        expect(source.requestedSpeciesIds, <String>{'species-1'});
        expect(source.loadedWatchUserId, 'user-1');
      },
    );

    test(
      'validates a canonical target before starting a manual watch',
      () async {
        final source = _FakeProjectDataSource(targetExists: false);
        final service = CollectionProjectService(dataSource: source);

        await expectLater(
          service.startProject(
            subjectType: CollectionProjectSubjectType.set,
            subjectId: 'unknown-set',
          ),
          throwsA(isA<CollectionProjectTargetNotFoundException>()),
        );
        expect(source.upsertedWatches, isEmpty);

        source.targetExistsValue = true;
        await service.startProject(
          subjectType: CollectionProjectSubjectType.set,
          subjectId: ' set-1 ',
        );

        expect(source.upsertedWatches, hasLength(1));
        expect(source.upsertedWatches.single.userId, 'user-1');
        expect(
          source.upsertedWatches.single.subjectType,
          CollectionProjectSubjectType.set,
        );
        expect(source.upsertedWatches.single.subjectId, 'set-1');
      },
    );

    test(
      'stopping deletes only the exact manual project so future interest can return',
      () async {
        final source = _FakeProjectDataSource();
        final service = CollectionProjectService(dataSource: source);

        await service.stopProject(
          subjectType: CollectionProjectSubjectType.species,
          subjectId: ' species-25 ',
        );

        expect(source.deletedWatches, hasLength(1));
        expect(source.deletedWatches.single.userId, 'user-1');
        expect(
          source.deletedWatches.single.subjectType,
          CollectionProjectSubjectType.species,
        );
        expect(source.deletedWatches.single.subjectId, 'species-25');
        expect(source.upsertedWatches, isEmpty);
      },
    );

    test(
      'keeps Projects available when the optional Wants count fails',
      () async {
        final source = _FakeProjectDataSource(
          wantedCountError: StateError('no'),
        );
        final service = CollectionProjectService(dataSource: source);

        final dashboard = await service.loadDashboard();

        expect(dashboard.projects, isEmpty);
        expect(dashboard.wantedCardCount, isNull);
      },
    );

    test('requires authentication for owner project operations', () async {
      final source = _FakeProjectDataSource(currentUserId: null);
      final service = CollectionProjectService(dataSource: source);

      await expectLater(
        service.loadDashboard(),
        throwsA(isA<CollectionProjectAuthenticationException>()),
      );
      await expectLater(
        service.startProject(
          subjectType: CollectionProjectSubjectType.set,
          subjectId: 'set-1',
        ),
        throwsA(isA<CollectionProjectAuthenticationException>()),
      );
    });
  });

  group('CollectionProjectsScreen', () {
    testWidgets('renders private, Wants, active, and completed states', (
      tester,
    ) async {
      final service = _FakeScreenProjectService(
        snapshot: CollectionProjectsSnapshot(
          wantedCardCount: 3,
          projects: <CollectionProject>[
            const CollectionProject(
              watchId: 'watch-active',
              subjectType: CollectionProjectSubjectType.species,
              subjectId: 'species-1',
              title: 'Pikachu',
              routeKey: 'pikachu',
              totalCount: 4,
              ownedCount: 2,
            ),
            const CollectionProject(
              watchId: 'watch-complete',
              subjectType: CollectionProjectSubjectType.set,
              subjectId: 'set-1',
              title: 'Base Set',
              routeKey: 'base1',
              totalCount: 12,
              ownedCount: 12,
            ),
          ],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(home: CollectionProjectsScreen(service: service)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Private by default'), findsOneWidget);
      expect(find.text('Wanted Cards'), findsOneWidget);
      expect(find.text('3 wanted cards · Only visible to you'), findsOneWidget);
      expect(find.text('In progress'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
      expect(find.text('Pikachu'), findsOneWidget);
      expect(find.text('2 of 4 card prints'), findsOneWidget);
      expect(find.text('Base Set'), findsOneWidget);
      expect(find.text('12 of 12 finish options'), findsOneWidget);
    });

    testWidgets('renders the private empty state without hiding Wants', (
      tester,
    ) async {
      final service = _FakeScreenProjectService(
        snapshot: const CollectionProjectsSnapshot(
          projects: <CollectionProject>[],
          wantedCardCount: 0,
        ),
      );

      await tester.pumpWidget(
        MaterialApp(home: CollectionProjectsScreen(service: service)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Wanted Cards'), findsOneWidget);
      expect(find.text('0 wanted cards · Only visible to you'), findsOneWidget);
      expect(find.text('No Binders yet'), findsOneWidget);
    });

    testWidgets('confirms stop and reloads after deleting a manual project', (
      tester,
    ) async {
      final service = _FakeScreenProjectService(
        snapshot: const CollectionProjectsSnapshot(
          projects: <CollectionProject>[
            CollectionProject(
              watchId: 'watch-1',
              subjectType: CollectionProjectSubjectType.set,
              subjectId: 'set-1',
              title: 'Base Set',
              routeKey: 'base1',
              totalCount: 12,
              ownedCount: 4,
            ),
          ],
          wantedCardCount: 0,
        ),
      );

      await tester.pumpWidget(
        MaterialApp(home: CollectionProjectsScreen(service: service)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Stop tracking Base Set'));
      await tester.pumpAndSettle();
      expect(find.text('Stop tracking this Binder?'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Stop tracking'));
      await tester.pumpAndSettle();

      expect(service.stoppedSubjectIds, <String>['set-1']);
      expect(find.text('No Binders yet'), findsOneWidget);
    });
  });
}

class _FakeProjectDataSource implements CollectionProjectDataSource {
  _FakeProjectDataSource({
    this.currentUserId = 'user-1',
    this.watches = const <CollectionProjectWatchRecord>[],
    this.setTargets = const <String, CollectionProjectTargetProgress>{},
    this.speciesTargets = const <String, CollectionProjectTargetProgress>{},
    this.wantedCardCount = 0,
    this.wantedCountError,
    bool targetExists = true,
  }) : targetExistsValue = targetExists;

  @override
  final String? currentUserId;
  final List<CollectionProjectWatchRecord> watches;
  final Map<String, CollectionProjectTargetProgress> setTargets;
  final Map<String, CollectionProjectTargetProgress> speciesTargets;
  final int wantedCardCount;
  final Object? wantedCountError;
  bool targetExistsValue;
  String? loadedWatchUserId;
  Set<String> requestedSetIds = <String>{};
  Set<String> requestedSpeciesIds = <String>{};
  final List<_WatchMutation> upsertedWatches = <_WatchMutation>[];
  final List<_WatchMutation> deletedWatches = <_WatchMutation>[];

  @override
  Future<bool> hasActiveManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    return watches.any(
      (watch) =>
          watch.subjectType == subjectType && watch.subjectId == subjectId,
    );
  }

  @override
  Future<List<CollectionProjectWatchRecord>> loadActiveManualWatches(
    String userId,
  ) async {
    loadedWatchUserId = userId;
    return watches;
  }

  @override
  Future<Map<String, CollectionProjectTargetProgress>> loadSetTargets({
    required String userId,
    required Set<String> subjectIds,
  }) async {
    requestedSetIds = Set<String>.from(subjectIds);
    final resolved = <String, CollectionProjectTargetProgress>{};
    for (final id in subjectIds) {
      final target = setTargets[id];
      if (target != null) {
        resolved[id] = target;
      }
    }
    return resolved;
  }

  @override
  Future<Map<String, CollectionProjectTargetProgress>> loadSpeciesTargets({
    required Set<String> subjectIds,
  }) async {
    requestedSpeciesIds = Set<String>.from(subjectIds);
    final resolved = <String, CollectionProjectTargetProgress>{};
    for (final id in subjectIds) {
      final target = speciesTargets[id];
      if (target != null) {
        resolved[id] = target;
      }
    }
    return resolved;
  }

  @override
  Future<int> loadWantedCardCount(String userId) async {
    final error = wantedCountError;
    if (error != null) {
      throw error;
    }
    return wantedCardCount;
  }

  @override
  Future<void> deleteManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    deletedWatches.add(
      _WatchMutation(
        userId: userId,
        subjectType: subjectType,
        subjectId: subjectId,
      ),
    );
  }

  @override
  Future<bool> targetExists({
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    return targetExistsValue;
  }

  @override
  Future<void> upsertManualWatch({
    required String userId,
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    upsertedWatches.add(
      _WatchMutation(
        userId: userId,
        subjectType: subjectType,
        subjectId: subjectId,
      ),
    );
  }
}

class _WatchMutation {
  const _WatchMutation({
    required this.userId,
    required this.subjectType,
    required this.subjectId,
  });

  final String userId;
  final CollectionProjectSubjectType subjectType;
  final String subjectId;
}

class _FakeScreenProjectService extends CollectionProjectService {
  _FakeScreenProjectService({required CollectionProjectsSnapshot snapshot})
    : _snapshot = snapshot,
      super(dataSource: _FakeProjectDataSource());

  CollectionProjectsSnapshot _snapshot;
  final List<String> stoppedSubjectIds = <String>[];

  @override
  Future<CollectionProjectsSnapshot> loadDashboard() async => _snapshot;

  @override
  Future<void> stopProject({
    required CollectionProjectSubjectType subjectType,
    required String subjectId,
  }) async {
    stoppedSubjectIds.add(subjectId);
    _snapshot = CollectionProjectsSnapshot(
      projects: _snapshot.projects
          .where(
            (project) =>
                project.subjectType != subjectType ||
                project.subjectId != subjectId,
          )
          .toList(growable: false),
      wantedCardCount: _snapshot.wantedCardCount,
    );
  }
}
