import 'package:flutter/foundation.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_private_cache.dart';
import '../../services/binders/binder_repository.dart';

enum BinderLoadStatus { initial, loading, ready, failed }

class BinderLibraryController extends ChangeNotifier {
  BinderLibraryController({required this.repository})
    : _ownerId = repository.currentUserId;

  final BinderRepository repository;
  final String? _ownerId;
  int _generation = 0;
  bool _disposed = false;

  bool _current(int generation) =>
      !_disposed &&
      generation == _generation &&
      repository.currentUserId == _ownerId;

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    page = const BinderLibraryPage(binders: <BinderSummary>[]);
    super.dispose();
  }

  BinderLoadStatus status = BinderLoadStatus.initial;
  BinderLibraryPage page = const BinderLibraryPage(binders: <BinderSummary>[]);
  BinderException? error;
  bool isStale = false;
  bool loadingMore = false;
  bool loadingMoreInvitations = false;
  bool loadingMoreSuspended = false;

  bool get hasSafeContent => page.binders.isNotEmpty;

  Future<void> load({bool refresh = false}) async {
    if (_disposed || repository.currentUserId != _ownerId) return;
    final generation = ++_generation;
    loadingMore = false;
    loadingMoreInvitations = false;
    loadingMoreSuspended = false;
    final userId = _ownerId;
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
      final cached = await BinderPrivateCache.readLibrary(
        userId,
        isCurrent: () => _current(generation),
      );
      if (!_current(generation)) return;
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
      if (!_current(generation)) return;
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
      await BinderPrivateCache.writeLibrary(
        userId,
        page,
        isCurrent: () => _current(generation),
      );
    } on BinderException catch (failure) {
      if (!_current(generation)) return;
      error = failure;
      if (failure.kind == BinderFailureKind.noAccess) {
        await BinderPrivateCache.purgeUser(userId);
        if (!_current(generation)) return;
        page = const BinderLibraryPage(binders: <BinderSummary>[]);
      }
      isStale = hasSafeContent;
      status = hasSafeContent
          ? BinderLoadStatus.ready
          : BinderLoadStatus.failed;
    } finally {
      if (_current(generation)) notifyListeners();
    }
  }

  Future<void> loadMore() async {
    final generation = _generation;
    if (!_current(generation) || status != BinderLoadStatus.ready) return;
    final cursor = page.nextCursor;
    if (cursor == null || loadingMore) return;
    loadingMore = true;
    notifyListeners();
    try {
      final next = await repository.loadLibrary(cursor: cursor);
      if (!_current(generation)) return;
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
      if (!_current(generation)) return;
      error = failure;
    } finally {
      if (_current(generation)) {
        loadingMore = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadMoreInvitations() async {
    final generation = _generation;
    if (!_current(generation) || status != BinderLoadStatus.ready) return;
    final cursor = page.invitationNextCursor;
    if (cursor == null || loadingMoreInvitations) return;
    loadingMoreInvitations = true;
    notifyListeners();
    try {
      final next = await repository.loadInvitationInbox(cursor: cursor);
      if (!_current(generation)) return;
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
      if (!_current(generation)) return;
      error = failure;
    } finally {
      if (_current(generation)) {
        loadingMoreInvitations = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadMoreSuspended() async {
    final generation = _generation;
    if (!_current(generation) || status != BinderLoadStatus.ready) return;
    final cursor = page.suspendedNextCursor;
    if (cursor == null || loadingMoreSuspended) return;
    loadingMoreSuspended = true;
    notifyListeners();
    try {
      final next = await repository.loadSuspendedBinders(cursor: cursor);
      if (!_current(generation)) return;
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
      if (!_current(generation)) return;
      error = failure;
    } finally {
      if (_current(generation)) {
        loadingMoreSuspended = false;
        notifyListeners();
      }
    }
  }
}

class BinderDetailController extends ChangeNotifier {
  BinderDetailController({
    required this.publicId,
    required this.repository,
    this.external = false,
  }) : _ownerId = repository.currentUserId;

  final String publicId;
  final BinderRepository repository;
  final bool external;
  final String? _ownerId;
  bool _disposed = false;
  bool _ownerLost = false;
  int _loadGeneration = 0;
  int _checklistGeneration = 0;
  int _activityGeneration = 0;
  int _membersGeneration = 0;
  int _mutationGeneration = 0;
  int _refreshGeneration = 0;
  bool _loadingChecklist = false;
  bool _loadingActivity = false;
  bool _loadingMembers = false;

  // Public projections do not depend on the signed-in collector. Private
  // controllers belong to one session and cannot be reused after replacement.
  bool get _active {
    if (_disposed || _ownerLost) return false;
    if (!external && repository.currentUserId != _ownerId) {
      _ownerLost = true;
      _clearContent();
      status = BinderLoadStatus.failed;
      error = const BinderException(
        BinderFailureKind.authentication,
        'Sign in again to view this Binder.',
      );
      notifyListeners();
      return false;
    }
    return true;
  }

  void _clearContent() {
    _loadGeneration++;
    _checklistGeneration++;
    _activityGeneration++;
    _membersGeneration++;
    _mutationGeneration++;
    _refreshGeneration++;
    detail = null;
    checklist = const BinderChecklistPage(items: <BinderChecklistItem>[]);
    activity = const BinderPage(items: <BinderActivityEvent>[]);
    members = const BinderPage(items: <BinderMember>[]);
    activityLoaded = false;
    membersLoaded = false;
    mutationBusy = false;
    loadingMoreActivity = false;
    loadingMoreMembers = false;
    _loadingChecklist = false;
    _loadingActivity = false;
    _loadingMembers = false;
    _realtimeRefreshBusy = false;
  }

  void _recordFailure(BinderException failure) {
    error = failure;
    if (failure.kind == BinderFailureKind.noAccess ||
        failure.kind == BinderFailureKind.authentication) {
      _clearContent();
      status = BinderLoadStatus.failed;
      // Clearing invalidates every pending lane, including this request.
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _clearContent();
    super.dispose();
  }

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
    if (!_active) return;
    final generation = ++_loadGeneration;
    final checklistGeneration = ++_checklistGeneration;
    bool current() => _active && generation == _loadGeneration;
    _loadingChecklist = true;
    if (!preserveContent || detail == null) {
      status = BinderLoadStatus.loading;
      notifyListeners();
    }
    try {
      if (external) {
        final result = await repository.loadPublicDetail(publicId);
        if (!current()) return;
        detail = result;
        checklist = detail!.externalChecklist;
      } else {
        final results = await Future.wait<Object>([
          repository.loadDetail(publicId),
          repository.loadChecklist(publicId: publicId, filter: checklistFilter),
        ]);
        if (!current()) return;
        detail = results[0] as BinderDetail;
        if (checklistGeneration == _checklistGeneration) {
          checklist = results[1] as BinderChecklistPage;
        }
      }
      status = BinderLoadStatus.ready;
      error = null;
    } on BinderException catch (failure) {
      if (!current()) return;
      _recordFailure(failure);
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
      if (current()) {
        if (checklistGeneration == _checklistGeneration) {
          _loadingChecklist = false;
        }
        notifyListeners();
      }
    }
  }

  Future<void> setChecklistFilter(BinderChecklistFilter filter) async {
    if (!_active || external) return;
    if (filter == checklistFilter) return;
    final generation = ++_checklistGeneration;
    bool current() => _active && generation == _checklistGeneration;
    _loadingChecklist = true;
    checklistFilter = filter;
    checklist = const BinderChecklistPage(items: <BinderChecklistItem>[]);
    notifyListeners();
    try {
      final result = await repository.loadChecklist(
        publicId: publicId,
        filter: filter,
      );
      if (!current()) return;
      checklist = result;
      error = null;
    } on BinderException catch (failure) {
      if (current()) _recordFailure(failure);
    } finally {
      if (current()) {
        _loadingChecklist = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadMoreChecklist() async {
    if (!_active || external || _loadingChecklist) return;
    final cursor = checklist.nextCursor;
    if (cursor == null) return;
    final generation = ++_checklistGeneration;
    bool current() => _active && generation == _checklistGeneration;
    _loadingChecklist = true;
    try {
      final next = await repository.loadChecklist(
        publicId: publicId,
        filter: checklistFilter,
        cursor: cursor,
      );
      if (!current()) return;
      final ids = checklist.items.map((item) => item.slotId).toSet();
      checklist = BinderChecklistPage(
        items: <BinderChecklistItem>[
          ...checklist.items,
          ...next.items.where((item) => ids.add(item.slotId)),
        ],
        nextCursor: next.nextCursor,
        hasMore: next.hasMore,
        memberCompletedSlots:
            next.memberCompletedSlots ?? checklist.memberCompletedSlots,
        externalCompletedSlots:
            next.externalCompletedSlots ?? checklist.externalCompletedSlots,
      );
    } on BinderException catch (failure) {
      if (current()) _recordFailure(failure);
    } finally {
      if (current()) {
        _loadingChecklist = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadActivity({bool refresh = false}) async {
    if (!_active || external) return;
    if ((activityLoaded || _loadingActivity) && !refresh) return;
    final generation = ++_activityGeneration;
    bool current() => _active && generation == _activityGeneration;
    _loadingActivity = true;
    loadingMoreActivity = false;
    try {
      final result = await repository.loadActivity(publicId: publicId);
      if (!current()) return;
      activity = result;
      activityLoaded = true;
      error = null;
    } on BinderException catch (failure) {
      if (current()) _recordFailure(failure);
    } finally {
      if (current()) {
        _loadingActivity = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadMembers({bool refresh = false}) async {
    if (!_active || external) return;
    if ((membersLoaded || _loadingMembers) && !refresh) return;
    final generation = ++_membersGeneration;
    bool current() => _active && generation == _membersGeneration;
    _loadingMembers = true;
    loadingMoreMembers = false;
    try {
      final result = await repository.loadMembers(publicId: publicId);
      if (!current()) return;
      members = result;
      membersLoaded = true;
      error = null;
    } on BinderException catch (failure) {
      if (current()) _recordFailure(failure);
    } finally {
      if (current()) {
        _loadingMembers = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadMoreActivity() async {
    if (!_active || _loadingActivity) return;
    final cursor = activity.nextCursor;
    if (external || cursor == null || loadingMoreActivity) return;
    final generation = ++_activityGeneration;
    bool current() => _active && generation == _activityGeneration;
    loadingMoreActivity = true;
    notifyListeners();
    try {
      final next = await repository.loadActivity(
        publicId: publicId,
        cursor: cursor,
      );
      if (!current()) return;
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
      if (current()) _recordFailure(failure);
    } finally {
      if (current()) {
        loadingMoreActivity = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadMoreMembers() async {
    if (!_active || _loadingMembers) return;
    final cursor = members.nextCursor;
    if (external || cursor == null || loadingMoreMembers) return;
    final generation = ++_membersGeneration;
    bool current() => _active && generation == _membersGeneration;
    loadingMoreMembers = true;
    notifyListeners();
    try {
      final next = await repository.loadMembers(
        publicId: publicId,
        cursor: cursor,
      );
      if (!current()) return;
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
      if (current()) _recordFailure(failure);
    } finally {
      if (current()) {
        loadingMoreMembers = false;
        notifyListeners();
      }
    }
  }

  /// Guarded refresh target for sanitized Binder Realtime signals.
  ///
  /// Returns false when access disappeared so the subscription can stop.
  Future<bool> refreshFromSignal() async {
    if (!_active) return false;
    if (external || _realtimeRefreshBusy) return detail != null;
    final generation = ++_refreshGeneration;
    bool current() => _active && generation == _refreshGeneration;
    _realtimeRefreshBusy = true;
    try {
      await load(preserveContent: true);
      if (!current() ||
          detail == null ||
          status == BinderLoadStatus.failed ||
          error?.kind == BinderFailureKind.noAccess) {
        return false;
      }
      if (activityLoaded) await loadActivity(refresh: true);
      if (!current()) return false;
      if (membersLoaded) await loadMembers(refresh: true);
      return current() && detail != null;
    } finally {
      if (current()) _realtimeRefreshBusy = false;
    }
  }

  Future<bool> mutate(Future<void> Function() action) async {
    if (!_active || mutationBusy) return false;
    final generation = ++_mutationGeneration;
    bool current() => _active && generation == _mutationGeneration;
    mutationBusy = true;
    notifyListeners();
    try {
      await action();
      if (!current()) return false;
      error = null;
      await load(preserveContent: true);
      return current();
    } on BinderException catch (failure) {
      if (current()) _recordFailure(failure);
      return false;
    } finally {
      if (current()) {
        mutationBusy = false;
        notifyListeners();
      }
    }
  }
}
