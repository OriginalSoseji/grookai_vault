import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/controllers/binders/binder_controllers.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';

class DeferredDetailRepository extends Fake implements BinderRepository {
  @override
  String? currentUserId = 'owner';
  final details = <Completer<BinderDetail>>[];
  final checklists = <Completer<BinderChecklistPage>>[];
  final activities = <Completer<BinderPage<BinderActivityEvent>>>[];
  final memberships = <Completer<BinderPage<BinderMember>>>[];
  bool deferChecklist = false;

  @override
  Future<BinderDetail> loadPublicDetail(String publicId) =>
      loadDetail(publicId);
  @override
  Future<BinderDetail> loadDetail(String publicId) {
    final result = Completer<BinderDetail>();
    details.add(result);
    return result.future;
  }

  @override
  Future<BinderChecklistPage> loadChecklist({
    required String publicId,
    BinderChecklistFilter filter = BinderChecklistFilter.all,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    if (!deferChecklist) return const BinderChecklistPage(items: []);
    final result = Completer<BinderChecklistPage>();
    checklists.add(result);
    return result.future;
  }

  @override
  Future<BinderPage<BinderActivityEvent>> loadActivity({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) {
    final result = Completer<BinderPage<BinderActivityEvent>>();
    activities.add(result);
    return result.future;
  }

  @override
  Future<BinderPage<BinderMember>> loadMembers({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) {
    final result = Completer<BinderPage<BinderMember>>();
    memberships.add(result);
    return result.future;
  }
}

const cursor = BinderCursor(
  id: 'next',
  updatedAt: null,
  createdAt: null,
  position: 1,
);
BinderChecklistPage checklistPage(String id, {bool more = false}) =>
    BinderChecklistPage(
      items: [
        BinderChecklistItem.fromJson({'slot_id': id, 'name': id}),
      ],
      nextCursor: more ? cursor : null,
      hasMore: more,
    );
BinderPage<BinderActivityEvent> activityPage(String id, {bool more = false}) =>
    BinderPage(
      items: [
        BinderActivityEvent.fromJson({'id': id, 'message': id}),
      ],
      nextCursor: more ? cursor : null,
      hasMore: more,
    );
BinderPage<BinderMember> membersPage(String id, {bool more = false}) =>
    BinderPage(
      items: [
        BinderMember.fromJson({'id': id, 'display_label': id}),
      ],
      nextCursor: more ? cursor : null,
      hasMore: more,
    );

BinderDetail fixtureDetail(String title) => BinderDetail.fromJson({
  'binder': {
    'public_id': 'goal',
    'title': title,
    'target_kind': 'custom',
    'checklist_mode': 'custom',
    'lifecycle': 'active',
  },
});
void main() {
  test(
    'public detail remains readable when anonymous viewer signs in',
    () async {
      final repo = DeferredDetailRepository()..currentUserId = null;
      final controller = BinderDetailController(
        publicId: 'goal',
        repository: repo,
        external: true,
      );
      final request = controller.load();
      repo.currentUserId = 'new-owner';
      repo.details.single.complete(fixtureDetail('Public goal'));
      await request;
      expect(controller.detail!.summary.title, 'Public goal');
      controller.dispose();
    },
  );

  test(
    'new filter beats checklist returned with an older detail read',
    () async {
      final repo = DeferredDetailRepository()..deferChecklist = true;
      final controller = BinderDetailController(
        publicId: 'goal',
        repository: repo,
      );
      final load = controller.load();
      final filter = controller.setChecklistFilter(
        BinderChecklistFilter.missing,
      );
      repo.checklists[1].complete(checklistPage('missing'));
      await filter;
      repo.checklists[0].complete(checklistPage('old-all'));
      repo.details.single.complete(fixtureDetail('Goal'));
      await load;
      expect(controller.checklist.items.single.slotId, 'missing');
      expect(controller.checklistFilter, BinderChecklistFilter.missing);
      controller.dispose();
    },
  );

  test(
    'pagination is single flight and cannot overwrite a newer filter',
    () async {
      final repo = DeferredDetailRepository()..deferChecklist = true;
      final controller = BinderDetailController(
        publicId: 'goal',
        repository: repo,
      )..checklist = checklistPage('old-all', more: true);
      final more = controller.loadMoreChecklist();
      await controller.loadMoreChecklist();
      expect(repo.checklists, hasLength(1));
      final filter = controller.setChecklistFilter(
        BinderChecklistFilter.missing,
      );
      await controller.loadMoreChecklist();
      expect(repo.checklists, hasLength(2));
      repo.checklists[1].complete(checklistPage('missing'));
      await filter;
      repo.checklists[0].complete(checklistPage('old-page-two'));
      await more;
      expect(controller.checklist.items.single.slotId, 'missing');
      controller.dispose();
    },
  );

  for (final lane in [
    'filter',
    'checklist',
    'activity',
    'members',
    'moreActivity',
    'moreMembers',
  ]) {
    for (final close in ['dispose', 'owner']) {
      test('$lane discards delayed completion after $close', () async {
        final repo = DeferredDetailRepository()..deferChecklist = true;
        final controller =
            BinderDetailController(publicId: 'goal', repository: repo)
              ..detail = fixtureDetail('Private')
              ..checklist = checklistPage('private', more: true)
              ..activity = activityPage('private', more: true)
              ..members = membersPage('private', more: true);
        final request = switch (lane) {
          'filter' => controller.setChecklistFilter(
            BinderChecklistFilter.missing,
          ),
          'checklist' => controller.loadMoreChecklist(),
          'activity' => controller.loadActivity(),
          'members' => controller.loadMembers(),
          'moreActivity' => controller.loadMoreActivity(),
          _ => controller.loadMoreMembers(),
        };
        var notifications = 0;
        controller.addListener(() => notifications++);
        if (close == 'dispose') {
          controller.dispose();
        } else {
          repo.currentUserId = 'next-owner';
        }
        for (final pending in repo.checklists) {
          pending.complete(checklistPage('late'));
        }
        for (final pending in repo.activities) {
          pending.complete(activityPage('late'));
        }
        for (final pending in repo.memberships) {
          pending.complete(membersPage('late'));
        }
        await request;
        expect(controller.detail, isNull);
        expect(controller.checklist.items, isEmpty);
        expect(controller.activity.items, isEmpty);
        expect(controller.members.items, isEmpty);
        expect(notifications, close == 'dispose' ? 0 : 1);
        if (close != 'dispose') controller.dispose();
      });
    }
  }

  test(
    'activity and member refreshes discard older pagination responses',
    () async {
      final repo = DeferredDetailRepository();
      final controller =
          BinderDetailController(publicId: 'goal', repository: repo)
            ..activity = activityPage('before', more: true)
            ..members = membersPage('before', more: true);
      final oldActivity = controller.loadMoreActivity();
      final oldMembers = controller.loadMoreMembers();
      final newActivity = controller.loadActivity(refresh: true);
      final newMembers = controller.loadMembers(refresh: true);
      repo.activities[1].complete(activityPage('new'));
      repo.memberships[1].complete(membersPage('new'));
      await Future.wait([newActivity, newMembers]);
      repo.activities[0].complete(activityPage('old'));
      repo.memberships[0].complete(membersPage('old'));
      await Future.wait([oldActivity, oldMembers]);
      expect(controller.activity.items.single.id, 'new');
      expect(controller.members.items.single.membershipId, 'new');
      expect(controller.loadingMoreActivity, isFalse);
      expect(controller.loadingMoreMembers, isFalse);
      controller.dispose();
    },
  );

  test(
    'access loss clears all lanes and rejects pending private activity',
    () async {
      final repo = DeferredDetailRepository();
      final controller =
          BinderDetailController(publicId: 'goal', repository: repo)
            ..detail = fixtureDetail('Private')
            ..members = membersPage('private')
            ..membersLoaded = true;
      final activity = controller.loadActivity();
      final refresh = controller.refreshFromSignal();
      repo.details.single.completeError(
        const BinderException(BinderFailureKind.noAccess, 'No access'),
      );
      expect(await refresh, isFalse);
      repo.activities.single.complete(activityPage('late-private'));
      await activity;
      expect(controller.detail, isNull);
      expect(controller.activity.items, isEmpty);
      expect(controller.members.items, isEmpty);
      expect(controller.membersLoaded, isFalse);
      expect(controller.error!.kind, BinderFailureKind.noAccess);
      controller.dispose();
    },
  );

  for (final close in ['dispose', 'owner']) {
    test(
      'mutation after $close does not reload for a replacement owner',
      () async {
        final repo = DeferredDetailRepository();
        final controller = BinderDetailController(
          publicId: 'goal',
          repository: repo,
        );
        final action = Completer<void>();
        final mutation = controller.mutate(() => action.future);
        if (close == 'dispose') {
          controller.dispose();
        } else {
          repo.currentUserId = 'next-owner';
        }
        action.complete();
        expect(await mutation, isFalse);
        expect(repo.details, isEmpty);
        expect(controller.mutationBusy, isFalse);
        if (close != 'dispose') controller.dispose();
      },
    );
  }

  test(
    'successful mutation reloads once and releases the busy state',
    () async {
      final repo = DeferredDetailRepository();
      final controller = BinderDetailController(
        publicId: 'goal',
        repository: repo,
      );
      final mutation = controller.mutate(() async {});
      await Future<void>.delayed(Duration.zero);
      repo.details.single.complete(fixtureDetail('Updated'));
      expect(await mutation, isTrue);
      expect(controller.mutationBusy, isFalse);
      controller.dispose();
    },
  );

  test('disposed detail rejects a late response without notifying', () async {
    final repo = DeferredDetailRepository();
    final controller = BinderDetailController(
      publicId: 'goal',
      repository: repo,
    );
    final request = controller.load();
    controller.dispose();
    repo.details.single.complete(fixtureDetail('Old private goal'));
    await request;
    expect(controller.detail, isNull);
  });
  test('replaced owner cannot receive the previous detail response', () async {
    final repo = DeferredDetailRepository();
    final controller = BinderDetailController(
      publicId: 'goal',
      repository: repo,
    );
    final request = controller.load();
    repo.currentUserId = 'next-owner';
    repo.details.single.complete(fixtureDetail('Old private goal'));
    await request;
    expect(controller.detail, isNull);
    controller.dispose();
  });
  test('newer detail refresh wins over an older delayed request', () async {
    final repo = DeferredDetailRepository();
    final controller = BinderDetailController(
      publicId: 'goal',
      repository: repo,
    );
    final old = controller.load();
    final next = controller.load();
    repo.details[1].complete(fixtureDetail('New title'));
    await next;
    repo.details[0].complete(fixtureDetail('Old title'));
    await old;
    expect(controller.detail!.summary.title, 'New title');
    controller.dispose();
  });
}
