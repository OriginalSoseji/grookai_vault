import 'dart:async';
import 'package:flutter/foundation.dart';
import 'owned_sealed_service_v1.dart';

double? combineCollectionUsd(double? cards, OwnedSealedTotals? sealed) {
  final value = sealed?.usd;
  if (cards == null && value == null) return null;
  return (((cards ?? 0) * 100).round() + ((value ?? 0) * 100).round()) / 100;
}

// Collection-wide totals must not depend on a visible, filtered inventory page.
class OwnedSealedTotalsController extends ChangeNotifier {
  OwnedSealedTotalsController(this.service, {Stream<String>? changes}) {
    _changes = (changes ?? OwnedSealedService.changes).listen((owner) {
      if (owner == service.userId()) unawaited(refresh());
    });
  }

  final OwnedSealedService service;
  late final StreamSubscription<String> _changes;
  OwnedSealedTotals? totals;
  bool loading = false, failed = false;
  int _generation = 0;
  bool _disposed = false;

  Future<void> refresh() async {
    if (_disposed) return;
    final generation = ++_generation;
    final owner = service.userId();
    totals = null;
    failed = false;
    loading = owner != null;
    notifyListeners();
    if (owner == null) return;
    try {
      final result = await service.totals();
      if (_disposed || generation != _generation) return;
      if (owner == service.userId()) totals = result;
    } catch (_) {
      if (_disposed || generation != _generation) return;
      failed = owner == service.userId();
    } finally {
      if (!_disposed && generation == _generation) {
        loading = false;
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _generation++;
    unawaited(_changes.cancel());
    super.dispose();
  }
}
