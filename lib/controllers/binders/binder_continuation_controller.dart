import 'package:flutter/foundation.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_repository.dart';

enum BinderContinuationStatus { initial, loading, ready, unavailable, closed }

/// A bounded, private read of existing goals. It never creates or edits a Binder.
class BinderContinuationController extends ChangeNotifier {
  BinderContinuationController({
    required this.ownerId,
    required this.repository,
  });

  final String ownerId;
  final BinderRepository repository;
  BinderContinuationStatus status = BinderContinuationStatus.initial;
  BinderLibraryPage? page;
  int _generation = 0;
  bool _disposed = false;

  List<BinderSummary> get unfinished =>
      (page?.binders ?? const <BinderSummary>[])
          .where((item) => !item.isArchived && !item.isComplete)
          .toList(growable: false);
  List<BinderSummary> get visible => unfinished.take(3).toList(growable: false);
  bool get hasMore => (page?.hasMore ?? false) || unfinished.length > 3;
  bool get hasNoBinders => page != null && page!.binders.isEmpty && !hasMore;

  bool _accept(int generation) =>
      !_disposed &&
      status != BinderContinuationStatus.closed &&
      generation == _generation &&
      repository.currentUserId == ownerId;

  void checkOwner() {
    if (!_disposed && repository.currentUserId != ownerId) close();
  }

  void close() {
    if (_disposed || status == BinderContinuationStatus.closed) return;
    _generation++;
    page = null;
    status = BinderContinuationStatus.closed;
    notifyListeners();
  }

  Future<void> load() async {
    if (_disposed || status == BinderContinuationStatus.closed) return;
    checkOwner();
    if (status == BinderContinuationStatus.closed) return;
    final generation = ++_generation;
    page = null;
    status = BinderContinuationStatus.loading;
    notifyListeners();
    try {
      final next = await repository
          .loadLibrary(limit: 20)
          .timeout(const Duration(seconds: 12));
      if (!_accept(generation)) {
        checkOwner();
        return;
      }
      page = next;
      status = BinderContinuationStatus.ready;
    } catch (_) {
      if (!_accept(generation)) {
        checkOwner();
        return;
      }
      page = null;
      status = BinderContinuationStatus.unavailable;
    }
    if (_accept(generation)) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    page = null;
    super.dispose();
  }
}
