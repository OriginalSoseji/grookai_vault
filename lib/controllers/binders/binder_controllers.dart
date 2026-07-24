import 'package:flutter/foundation.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_private_cache.dart';
import '../../services/binders/binder_repository.dart';

enum BinderLoadStatus { initial, loading, ready, failed }

class BinderLibraryController extends ChangeNotifier {
  BinderLibraryController({required this.repository});

  final BinderRepository repository;

  BinderLoadStatus status = BinderLoadStatus.initial;
  BinderLibraryPage page = const BinderLibraryPage(binders: <BinderSummary>[]);
  BinderException? error;
  bool isStale = false;
  bool loadingMore = false;
  bool loadingMoreInvitations = false;
  bool loadingMoreSuspended = false;

  bool get hasSafeContent => page.binders.isNotEmpty;

  Future<void> load({bool refresh = false}) async {
    final userId = repository.currentUserId;
    if (userId == null) {
      status = BinderLoadStatus.failed;
      error = const BinderException(
        BinderFailureKind.authentication,
        'Sign in to view Binders.',
      );
      notifyListeners();
      return;
    }

    if (!refresh && status == BinderLoadStatus.initial) {
      final cached = await BinderPrivateCache.readLibrary(userId);
      if (cached != null) {
        page = cached;
        isStale = true;
        status = BinderLoadStatus.ready;
        notifyListeners();
      }
    }
    if (!hasSafeContent) {
      status = BinderLoadStatus.loading;
      notifyListeners();
    }

    try {
      Future<BinderPage<BinderInvitation>?> invitationPageSafe() async {
        try {
          return await repository.loadInvitationInbox();
        } on BinderException {
          // Dashboard invitations remain a safe, bounded fallback.
          return null;
        }
      }

      Future<BinderPage<BinderSuspendedAccess>?> suspendedPageSafe() async {
        try {
          return await repository.loadSuspendedBinders();
        } on BinderException {
          // A failed action-only surface must not hide authorized Binders.
          return null;
        }
      }

      final results = await Future.wait<Object?>([
        repository.loadLibrary(),
        invitationPageSafe(),
        suspendedPageSafe(),
      ]);
      final dashboard = results[0] as BinderLibraryPage;
      final invitationPage = results[1] as BinderPage<BinderInvitation>?;
      final suspendedPage = results[2] as BinderPage<BinderSuspendedAccess>?;
      page = BinderLibraryPage(
        binders: dashboard.binders,
        invitations: invitationPage?.items ?? dashboard.invitations,
        suspendedBinders: suspendedPage?.items ?? dashboard.suspendedBinders,
        legacyCandidates: dashboard.legacyCandidates,
        nextCursor: dashboard.nextCursor,
        invitationNextCursor: invitationPage?.nextCursor,
        suspendedNextCursor: suspendedPage?.nextCursor,
        hasMore: dashboard.hasMore,
        invitationsHaveMore: invitationPage?.hasMore ?? false,
        suspendedHaveMore: suspendedPage?.hasMore ?? false,
        loadedAt: dashboard.loadedAt,
      );
      status = BinderLoadStatus.ready;
      isStale = false;
      error = null;
      await BinderPrivateCache.writeLibrary(userId, page);
    } on BinderException catch (failure) {
      error = failure;
      if (failure.kind == BinderFailureKind.noAccess) {
        await BinderPrivateCache.purgeUser(userId);
        page = const BinderLibraryPage(binders: <BinderSummary>[]);
      }
      isStale = hasSafeContent;
      status = hasSafeContent
          ? BinderLoadStatus.ready
          : BinderLoadStatus.failed;
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadMore() async {
    final cursor = page.nextCursor;
    if (cursor == null || loadingMore) return;
    loadingMore = true;
    notifyListeners();
    try {
      final next = await repository.loadLibrary(cursor: cursor);
      final byId = <String, BinderSummary>{
        for (final binder in page.binders) binder.id: binder,
        for (final binder in next.binders) binder.id: binder,
      };
      page = BinderLibraryPage(
        binders: byId.values.toList(growable: false),
        // Invitations have their own independently paginated lane. Every
        // dashboard page repeats only its bounded fallback inbox, so replacing
        // this list here would discard invitation pages already loaded.
        invitations: page.invitations,
        suspendedBinders: page.suspendedBinders,
        legacyCandidates: next.legacyCandidates.isEmpty
            ? page.legacyCandidates
            : next.legacyCandidates,
        nextCursor: next.nextCursor,
        invitationNextCursor: page.invitationNextCursor,
        suspendedNextCursor: page.suspendedNextCursor,
        hasMore: next.hasMore,
        invitationsHaveMore: page.invitationsHaveMore,
        suspendedHaveMore: page.suspendedHaveMore,
        loadedAt: next.loadedAt,
      );
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      loadingMore = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreInvitations() async {
    final cursor = page.invitationNextCursor;
    if (cursor == null || loadingMoreInvitations) return;
    loadingMoreInvitations = true;
    notifyListeners();
    try {
      final next = await repository.loadInvitationInbox(cursor: cursor);
      final byId = <String, BinderInvitation>{
        for (final item in page.invitations) item.id: item,
        for (final item in next.items) item.id: item,
      };
      page = BinderLibraryPage(
        binders: page.binders,
        invitations: byId.values.toList(growable: false),
        suspendedBinders: page.suspendedBinders,
        legacyCandidates: page.legacyCandidates,
        nextCursor: page.nextCursor,
        invitationNextCursor: next.nextCursor,
        suspendedNextCursor: page.suspendedNextCursor,
        hasMore: page.hasMore,
        invitationsHaveMore: next.hasMore,
        suspendedHaveMore: page.suspendedHaveMore,
        loadedAt: page.loadedAt,
      );
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      loadingMoreInvitations = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreSuspended() async {
    final cursor = page.suspendedNextCursor;
    if (cursor == null || loadingMoreSuspended) return;
    loadingMoreSuspended = true;
    notifyListeners();
    try {
      final next = await repository.loadSuspendedBinders(cursor: cursor);
      final byId = <String, BinderSuspendedAccess>{
        for (final item in page.suspendedBinders) item.publicId: item,
        for (final item in next.items) item.publicId: item,
      };
      page = BinderLibraryPage(
        binders: page.binders,
        invitations: page.invitations,
        suspendedBinders: byId.values.toList(growable: false),
        legacyCandidates: page.legacyCandidates,
        nextCursor: page.nextCursor,
        invitationNextCursor: page.invitationNextCursor,
        suspendedNextCursor: next.nextCursor,
        hasMore: page.hasMore,
        invitationsHaveMore: page.invitationsHaveMore,
        suspendedHaveMore: next.hasMore,
        loadedAt: page.loadedAt,
      );
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      loadingMoreSuspended = false;
      notifyListeners();
    }
  }
}

class BinderDetailController extends ChangeNotifier {
  BinderDetailController({
    required this.publicId,
    required this.repository,
    this.external = false,
  });

  final String publicId;
  final BinderRepository repository;
  final bool external;

  BinderLoadStatus status = BinderLoadStatus.initial;
  BinderDetail? detail;
  BinderChecklistPage checklist = const BinderChecklistPage(
    items: <BinderChecklistItem>[],
  );
  BinderPage<BinderActivityEvent> activity = const BinderPage(
    items: <BinderActivityEvent>[],
  );
  BinderPage<BinderMember> members = const BinderPage(items: <BinderMember>[]);
  BinderException? error;
  BinderChecklistFilter checklistFilter = BinderChecklistFilter.all;
  bool activityLoaded = false;
  bool membersLoaded = false;
  bool mutationBusy = false;
  bool loadingMoreActivity = false;
  bool loadingMoreMembers = false;
  bool _realtimeRefreshBusy = false;

  Future<void> load({bool preserveContent = false}) async {
    if (!preserveContent || detail == null) {
      status = BinderLoadStatus.loading;
      notifyListeners();
    }
    try {
      if (external) {
        detail = await repository.loadPublicDetail(publicId);
        checklist = detail!.externalChecklist;
      } else {
        final results = await Future.wait<Object>([
          repository.loadDetail(publicId),
          repository.loadChecklist(publicId: publicId, filter: checklistFilter),
        ]);
        detail = results[0] as BinderDetail;
        checklist = results[1] as BinderChecklistPage;
      }
      status = BinderLoadStatus.ready;
      error = null;
    } on BinderException catch (failure) {
      error = failure;
      if (detail == null || failure.kind == BinderFailureKind.noAccess) {
        status = BinderLoadStatus.failed;
        if (failure.kind == BinderFailureKind.noAccess) {
          detail = null;
          checklist = const BinderChecklistPage(items: <BinderChecklistItem>[]);
        }
      } else {
        status = BinderLoadStatus.ready;
      }
    } finally {
      notifyListeners();
    }
  }

  Future<void> setChecklistFilter(BinderChecklistFilter filter) async {
    if (external) return;
    if (filter == checklistFilter) return;
    checklistFilter = filter;
    notifyListeners();
    try {
      checklist = await repository.loadChecklist(
        publicId: publicId,
        filter: filter,
      );
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadMoreChecklist() async {
    if (external) return;
    final cursor = checklist.nextCursor;
    if (cursor == null) return;
    try {
      final next = await repository.loadChecklist(
        publicId: publicId,
        filter: checklistFilter,
        cursor: cursor,
      );
      checklist = BinderChecklistPage(
        items: <BinderChecklistItem>[...checklist.items, ...next.items],
        nextCursor: next.nextCursor,
        hasMore: next.hasMore,
        memberCompletedSlots:
            next.memberCompletedSlots ?? checklist.memberCompletedSlots,
        externalCompletedSlots:
            next.externalCompletedSlots ?? checklist.externalCompletedSlots,
      );
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadActivity({bool refresh = false}) async {
    if (external) return;
    if (activityLoaded && !refresh) return;
    try {
      activity = await repository.loadActivity(publicId: publicId);
      activityLoaded = true;
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadMembers({bool refresh = false}) async {
    if (external) return;
    if (membersLoaded && !refresh) return;
    try {
      members = await repository.loadMembers(publicId: publicId);
      membersLoaded = true;
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadMoreActivity() async {
    final cursor = activity.nextCursor;
    if (external || cursor == null || loadingMoreActivity) return;
    loadingMoreActivity = true;
    notifyListeners();
    try {
      final next = await repository.loadActivity(
        publicId: publicId,
        cursor: cursor,
      );
      final ids = activity.items.map((item) => item.id).toSet();
      activity = BinderPage<BinderActivityEvent>(
        items: <BinderActivityEvent>[
          ...activity.items,
          ...next.items.where((item) => ids.add(item.id)),
        ],
        nextCursor: next.nextCursor,
        hasMore: next.hasMore,
      );
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      loadingMoreActivity = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreMembers() async {
    final cursor = members.nextCursor;
    if (external || cursor == null || loadingMoreMembers) return;
    loadingMoreMembers = true;
    notifyListeners();
    try {
      final next = await repository.loadMembers(
        publicId: publicId,
        cursor: cursor,
      );
      final ids = members.items.map((item) => item.membershipId).toSet();
      members = BinderPage<BinderMember>(
        items: <BinderMember>[
          ...members.items,
          ...next.items.where((item) => ids.add(item.membershipId)),
        ],
        nextCursor: next.nextCursor,
        hasMore: next.hasMore,
      );
      error = null;
    } on BinderException catch (failure) {
      error = failure;
    } finally {
      loadingMoreMembers = false;
      notifyListeners();
    }
  }

  /// Guarded refresh target for sanitized Binder Realtime signals.
  ///
  /// Returns false when access disappeared so the subscription can stop.
  Future<bool> refreshFromSignal() async {
    if (external || _realtimeRefreshBusy) return detail != null;
    _realtimeRefreshBusy = true;
    try {
      await load(preserveContent: true);
      if (detail == null ||
          status == BinderLoadStatus.failed ||
          error?.kind == BinderFailureKind.noAccess) {
        return false;
      }
      if (activityLoaded) await loadActivity(refresh: true);
      if (membersLoaded) await loadMembers(refresh: true);
      return detail != null;
    } finally {
      _realtimeRefreshBusy = false;
    }
  }

  Future<bool> mutate(Future<void> Function() action) async {
    if (mutationBusy) return false;
    mutationBusy = true;
    notifyListeners();
    try {
      await action();
      error = null;
      await load(preserveContent: true);
      return true;
    } on BinderException catch (failure) {
      error = failure;
      return false;
    } finally {
      mutationBusy = false;
      notifyListeners();
    }
  }
}
