import 'package:flutter/foundation.dart';
import 'package:grookai_vault/services/supa_client.dart';
import 'package:grookai_vault/services/card_repository.dart';

class CardLookupController extends ChangeNotifier {
  final _repo = CardRepository(sb);
  Map<String, dynamic>? _card;
  String? _error;
  bool _loading = false;

  Map<String, dynamic>? get card => _card;
  String? get error => _error;
  bool get loading => _loading;

  Future<void> find(String setCode, String number, {String lang = 'en'}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _card = await _repo.getOrImportCard(
        setCode: setCode,
        number: number,
        lang: lang,
      );
      if (_card == null) {
        _error = 'Card not found after import attempt.';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
