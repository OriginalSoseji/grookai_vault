import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/controllers/binders/binder_controllers.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_private_cache.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'binder_continuation_test.dart' show ReadOnlyGoals, goal;

class DelayedLibrary extends ReadOnlyGoals {
  final requests = <Completer<BinderLibraryPage>>[];
  @override
  Future<BinderLibraryPage> loadLibrary({
    BinderCursor? cursor,
    int limit = 20,
  }) {
    final request = Completer<BinderLibraryPage>();
    requests.add(request);
    return request.future;
  }

  @override
  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  }) async => const BinderPage(items: []);
  @override
  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 50,
  }) async => const BinderPage(items: []);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('disposed library cannot cache or notify a late response', () async {
    final repository = DelayedLibrary();
    final controller = BinderLibraryController(repository: repository);
    var notifications = 0;
    controller.addListener(() => notifications++);
    final request = controller.load(refresh: true);
    controller.dispose();
    final before = notifications;
    repository.requests.single.complete(
      BinderLibraryPage(binders: [goal('old')]),
    );
    await request;
    expect(notifications, before);
    expect(controller.page.binders, isEmpty);
    expect(await BinderPrivateCache.readLibrary('owner'), null);
  });

  test('old owner response cannot replace the new owner cache', () async {
    final repository = DelayedLibrary();
    final controller = BinderLibraryController(repository: repository);
    final request = controller.load(refresh: true);
    repository.currentUserId = 'next-owner';
    await BinderPrivateCache.writeLibrary(
      'next-owner',
      BinderLibraryPage(binders: [goal('next')]),
    );
    repository.requests.single.complete(
      BinderLibraryPage(binders: [goal('old')]),
    );
    await request;
    expect(controller.page.binders, isEmpty);
    expect(
      (await BinderPrivateCache.readLibrary(
        'next-owner',
      ))!.binders.single.publicId,
      'next',
    );
    controller.dispose();
  });

  test('new refresh wins over a slower older refresh', () async {
    final repository = DelayedLibrary();
    final controller = BinderLibraryController(repository: repository);
    final old = controller.load(refresh: true);
    final next = controller.load(refresh: true);
    repository.requests[1].complete(BinderLibraryPage(binders: [goal('next')]));
    await next;
    repository.requests[0].complete(BinderLibraryPage(binders: [goal('old')]));
    await old;
    expect(controller.page.binders.single.publicId, 'next');
    expect(
      (await BinderPrivateCache.readLibrary('owner'))!.binders.single.publicId,
      'next',
    );
    controller.dispose();
  });

  test('queued stale cache operations cannot change active account', () async {
    final next = BinderLibraryPage(binders: [goal('next')]);
    final write = BinderPrivateCache.writeLibrary('next-owner', next);
    final oldWrite = BinderPrivateCache.writeLibrary(
      'owner',
      BinderLibraryPage(binders: [goal('old')]),
      isCurrent: () => false,
    );
    final oldRead = BinderPrivateCache.readLibrary(
      'owner',
      isCurrent: () => false,
    );
    await Future.wait([write, oldWrite]);
    expect(await oldRead, null);
    expect(
      (await BinderPrivateCache.readLibrary(
        'next-owner',
      ))!.binders.single.publicId,
      'next',
    );
    await BinderPrivateCache.purgeCurrent();
    expect(await BinderPrivateCache.readLibrary('next-owner'), null);
  });
}
