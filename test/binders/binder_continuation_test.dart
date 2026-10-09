import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/controllers/binders/binder_continuation_controller.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/vault/binder_continuation_panel.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';

BinderSummary goal(
  String id, {
  String lifecycle = 'active',
  int done = 2,
  int total = 10,
  String role = 'owner',
}) => BinderSummary.fromJson({
  'id': 'internal-$id',
  'public_id': id,
  'title': 'Collect $id',
  'target_kind': 'species',
  'checklist_mode': 'card_prints',
  'completed_slots': done,
  'total_slots': total,
  'viewer_role': role,
  'lifecycle': lifecycle,
  'read_access': 'private',
  'discoverability': 'unlisted',
  'join_policy': 'invite_only',
  'contribution_policy': 'members_direct',
  'moderation_state': 'clear',
});

class ReadOnlyGoals implements BinderRepository {
  @override
  String? currentUserId = 'owner';
  BinderLibraryPage page = const BinderLibraryPage(binders: []);
  Future<BinderLibraryPage> Function()? read;
  int calls = 0;
  int? lastLimit;
  @override
  Future<BinderLibraryPage> loadLibrary({
    BinderCursor? cursor,
    int limit = 20,
  }) {
    calls++;
    lastLimit = limit;
    expect(cursor, null);
    return read?.call() ?? Future.value(page);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected operation: ${invocation.memberName}');
}

void main() {
  late ReadOnlyGoals repository;
  late BinderContinuationController controller;
  setUp(() {
    repository = ReadOnlyGoals();
    controller = BinderContinuationController(
      ownerId: 'owner',
      repository: repository,
    );
  });
  tearDown(() => controller.dispose());

  test('empty is known only after a complete bounded dashboard read', () async {
    expect(controller.hasNoBinders, false);
    await controller.load();
    expect(repository.calls, 1);
    expect(repository.lastLimit, 20);
    expect(controller.status, BinderContinuationStatus.ready);
    expect(controller.hasNoBinders, true);
  });

  test('archived-only first page never claims there are no goals', () async {
    repository.page = BinderLibraryPage(
      binders: [goal('old', lifecycle: 'archived')],
      hasMore: true,
    );
    await controller.load();
    expect(controller.visible, isEmpty);
    expect(controller.hasMore, true);
    expect(controller.hasNoBinders, false);
  });

  test(
    'server order is retained across personal and shared unfinished goals',
    () async {
      repository.page = BinderLibraryPage(
        binders: [
          goal('archived', lifecycle: 'archived'),
          goal('finished', done: 10),
          goal('first'),
          goal('shared', role: 'contributor'),
          goal('empty', total: 0),
          goal('fourth'),
        ],
      );
      await controller.load();
      expect(controller.visible.map((b) => b.publicId), [
        'first',
        'shared',
        'empty',
      ]);
      expect(controller.hasMore, true);
    },
  );

  test('a late earlier refresh cannot replace current progress', () async {
    final old = Completer<BinderLibraryPage>();
    repository.read = () => old.future;
    final pending = controller.load();
    repository.read = null;
    repository.page = BinderLibraryPage(binders: [goal('latest')]);
    await controller.load();
    old.complete(BinderLibraryPage(binders: [goal('stale')]));
    await pending;
    expect(controller.visible.single.publicId, 'latest');
  });

  test(
    'an account change discards an in-flight private response permanently',
    () async {
      final pending = Completer<BinderLibraryPage>();
      repository.read = () => pending.future;
      final loading = controller.load();
      repository.currentUserId = 'different';
      pending.complete(BinderLibraryPage(binders: [goal('private')]));
      await loading;
      expect(controller.status, BinderContinuationStatus.closed);
      expect(controller.page, null);
      repository.currentUserId = 'owner';
      await controller.load();
      expect(repository.calls, 1);
    },
  );

  test(
    'read failure remains unavailable rather than a zero-goal claim',
    () async {
      repository.read = () => Future.error(StateError('offline'));
      await controller.load();
      expect(controller.status, BinderContinuationStatus.unavailable);
      expect(controller.hasNoBinders, false);
      expect(controller.page, null);
    },
  );

  test(
    'disposing a reader prevents notification from a late response',
    () async {
      final pending = Completer<BinderLibraryPage>();
      repository.read = () => pending.future;
      final reader = BinderContinuationController(
        ownerId: 'owner',
        repository: repository,
      );
      var notifications = 0;
      reader.addListener(() => notifications++);
      final loading = reader.load();
      reader.dispose();
      pending.complete(BinderLibraryPage(binders: [goal('private')]));
      await loading;
      expect(notifications, 1);
      expect(reader.page, null);
    },
  );

  Future<void> show(
    WidgetTester tester, {
    Stream<void>? changes,
    Future<void> Function(String)? open,
    double scale = 1,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(scale)),
          child: Scaffold(
            body: SingleChildScrollView(
              child: BinderContinuationPanel(
                ownerId: 'owner',
                repository: repository,
                ownerChanges: changes,
                onOpenBinder: open ?? (_) async {},
                onOpenLibrary: () async {},
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('resume opens the exact existing goal and refreshes on return', (
    tester,
  ) async {
    repository.page = BinderLibraryPage(binders: [goal('pikachu')]);
    String? selected;
    await show(
      tester,
      open: (id) async {
        selected = id;
      },
    );
    await tester.tap(find.text('Collect pikachu'));
    await tester.pumpAndSettle();
    expect(selected, 'pikachu');
    expect(repository.calls, 2);
    expect(find.text('2 of 10 card prints'), findsOneWidget);
  });

  testWidgets('one goal stays visible and expansion preserves exact targets', (
    tester,
  ) async {
    repository.page = BinderLibraryPage(
      binders: [goal('first'), goal('second'), goal('third')],
    );
    String? selected;
    await show(
      tester,
      open: (id) async {
        selected = id;
      },
    );
    expect(find.text('Collect first'), findsOneWidget);
    expect(find.text('Collect second'), findsNothing);
    expect(find.text('Collect third'), findsNothing);
    await tester.tap(find.text('Show 2 more goals'));
    await tester.pumpAndSettle();
    expect(find.text('Collect second'), findsOneWidget);
    await tester.tap(find.text('Collect third'));
    await tester.pumpAndSettle();
    expect(selected, 'third');
    await tester.tap(find.text('Show fewer goals'));
    await tester.pumpAndSettle();
    expect(find.text('Collect second'), findsNothing);
    expect(find.text('All Binders'), findsOneWidget);
  });

  testWidgets('auth change immediately removes rendered private goals', (
    tester,
  ) async {
    final changes = StreamController<void>.broadcast(sync: true);
    repository.page = BinderLibraryPage(binders: [goal('private')]);
    await show(tester, changes: changes.stream);
    expect(find.text('Collect private'), findsOneWidget);
    repository.currentUserId = null;
    changes.add(null);
    await tester.pump();
    expect(find.text('Collect private'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await changes.close();
  });

  testWidgets('narrow enlarged-text layout keeps real progress readable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    repository.page = BinderLibraryPage(
      binders: [goal('a very long collection goal')],
    );
    await show(tester, scale: 2);
    expect(tester.takeException(), null);
    expect(find.text('2 of 10 card prints'), findsOneWidget);
  });
}
