import 'package:flutter/foundation.dart';
import 'models/scan_candidate.dart';

class ScanController extends ChangeNotifier {
  List<ScanCandidate> candidates = const [];
  bool loading = false;

  Future<void> resolve({required String name, required String number, String lang = 'en'}) async {
    loading = true;
    notifyListeners();
    try {
      // TODO: call ScanResolver (existing) or Supabase function
      await Future<void>.delayed(const Duration(milliseconds: 120));
      candidates = [
        ScanCandidate(cardId: 'id1', name: name, setCode: 'SV2', number: number, confidence: 0.91, imageUrl: null),
        ScanCandidate(cardId: 'id2', name: '$name (Alt)', setCode: 'SVP', number: number, confidence: 0.83, imageUrl: null),
      ];
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}

