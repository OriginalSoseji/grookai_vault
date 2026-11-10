import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../models/grookai_sale_listing.dart';
import '../../services/grookai_objects/grookai_object_export_service.dart';
import '../../widgets/grookai_objects/grookai_object_skin.dart';

/// Local, owner-bound context used only to restore an interrupted eBay return.
/// It contains no provider credentials, OAuth state, or launch capability.
class SaleCardHandoff {
  const SaleCardHandoff({
    required this.ownerId,
    required this.copy,
    required this.source,
    required this.skin,
    required this.condition,
    required this.priceText,
    required this.note,
    required this.firm,
    required this.allowDms,
    required this.showFront,
    required this.destination,
    required this.savedAtMillis,
  });

  final String ownerId;
  final SaleListingCopyContext copy;
  final GrookaiSaleListingSource source;
  final GrookaiObjectSkin skin;
  final String condition, priceText, note;
  final bool firm, allowDms, showFront;
  final GrookaiObjectExportDestination destination;
  final int savedAtMillis;

  Map<String, dynamic> toJson() => {
    'version': 1,
    'ownerId': ownerId,
    'instanceId': copy.instanceId,
    'gvviId': copy.gvviId,
    'vaultItemId': copy.vaultItemId,
    'cardPrintId': copy.cardPrintId,
    'conditionLabel': copy.conditionLabel,
    'askingPriceAmount': copy.askingPriceAmount,
    'askingPriceNote': copy.askingPriceNote,
    'cardName': source.cardName,
    'setLine': source.setLine,
    'printingIdentityLabel': source.printingIdentityLabel,
    'sellerHandle': source.sellerHandle,
    'sellerRating': source.sellerRating,
    'sellerTradeCount': source.sellerTradeCount,
    'skin': skin.name,
    'condition': condition,
    'priceText': priceText,
    'note': note,
    'firm': firm,
    'allowDms': allowDms,
    'showFront': showFront,
    'destination': destination.name,
    'savedAtMillis': savedAtMillis,
  };

  static SaleCardHandoff? fromJson(Object? decoded) {
    if (decoded is! Map<String, dynamic> || decoded['version'] != 1) {
      return null;
    }
    final ownerId = decoded['ownerId'];
    final instanceId = decoded['instanceId'];
    final gvviId = decoded['gvviId'];
    final vaultItemId = decoded['vaultItemId'];
    final cardPrintId = decoded['cardPrintId'];
    final cardName = decoded['cardName'];
    final setLine = decoded['setLine'];
    final printingLabel = decoded['printingIdentityLabel'];
    final sellerHandle = decoded['sellerHandle'];
    final skin = _enumByName(GrookaiObjectSkin.values, decoded['skin']);
    final destination = _enumByName(
      GrookaiObjectExportDestination.values,
      decoded['destination'],
    );
    final condition = decoded['condition'];
    final priceText = decoded['priceText'];
    final note = decoded['note'];
    final firm = decoded['firm'];
    final allowDms = decoded['allowDms'];
    final showFront = decoded['showFront'];
    final savedAtMillis = decoded['savedAtMillis'];
    final rating = decoded['sellerRating'];
    final tradeCount = decoded['sellerTradeCount'];
    final askingPrice = decoded['askingPriceAmount'];
    if (!_isUuid(ownerId) ||
        !_isUuid(instanceId) ||
        !_isUuid(vaultItemId) ||
        !_isUuid(cardPrintId) ||
        gvviId is! String ||
        gvviId.isEmpty ||
        gvviId.length > 128 ||
        cardName is! String ||
        cardName.isEmpty ||
        cardName.length > 240 ||
        setLine is! String ||
        setLine.length > 400 ||
        printingLabel is! String ||
        printingLabel.length > 240 ||
        sellerHandle is! String ||
        sellerHandle.length > 120 ||
        skin == null ||
        destination == null ||
        condition is! String ||
        condition.length > 40 ||
        priceText is! String ||
        priceText.length > 32 ||
        note is! String ||
        note.length > 2000 ||
        firm is! bool ||
        allowDms is! bool ||
        showFront is! bool ||
        savedAtMillis is! int ||
        rating is! num ||
        !rating.isFinite ||
        tradeCount is! int ||
        (askingPrice != null &&
            (askingPrice is! num || !askingPrice.isFinite))) {
      return null;
    }
    return SaleCardHandoff(
      ownerId: ownerId as String,
      copy: SaleListingCopyContext(
        instanceId: instanceId as String,
        gvviId: gvviId,
        vaultItemId: vaultItemId as String,
        cardPrintId: cardPrintId as String,
        conditionLabel: _optionalString(decoded['conditionLabel'], 80),
        askingPriceAmount: (askingPrice as num?)?.toDouble(),
        askingPriceNote: _optionalString(decoded['askingPriceNote'], 2000),
      ),
      source: GrookaiSaleListingSource(
        cardName: cardName,
        setLine: setLine,
        printingIdentityLabel: printingLabel,
        // Artwork URLs can be signed and short-lived. Resolve them again from
        // the Vault after a cold return instead of persisting bearer URLs.
        sellerHandle: sellerHandle,
        sellerRating: rating.toDouble(),
        sellerTradeCount: tradeCount,
      ),
      skin: skin,
      condition: condition,
      priceText: priceText,
      note: note,
      firm: firm,
      allowDms: allowDms,
      showFront: showFront,
      destination: destination,
      savedAtMillis: savedAtMillis,
    );
  }
}

class SaleCardHandoffRecord {
  const SaleCardHandoffRecord({
    required this.ownerId,
    required this.instanceId,
    required this.savedAtMillis,
    this.saleCard,
  });

  final String ownerId, instanceId;
  final int savedAtMillis;
  final SaleCardHandoff? saleCard;
}

class SaleCardHandoffStore {
  static final _uuid = RegExp(
    r'^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$',
    caseSensitive: false,
  );
  static const _keyPrefix = 'grookai.sale-card.handoff.v1.';
  static const _retention = Duration(hours: 24);

  Future<void> save(SaleCardHandoff handoff) async {
    _validateIdentity(handoff.ownerId, handoff.copy.instanceId);
    if (!_isUuid(handoff.copy.vaultItemId) ||
        !_isUuid(handoff.copy.cardPrintId) ||
        handoff.copy.gvviId.isEmpty ||
        handoff.copy.gvviId.length > 128) {
      throw StateError('Select an exact Vault copy before opening eBay.');
    }
    if (SaleCardHandoff.fromJson(handoff.toJson()) == null) {
      throw StateError('This sale card cannot be retained for eBay.');
    }
    final now = DateTime.now().millisecondsSinceEpoch;
    await _write(
      await SharedPreferences.getInstance(),
      SaleCardHandoffRecord(
        ownerId: handoff.ownerId.toLowerCase(),
        instanceId: handoff.copy.instanceId.toLowerCase(),
        savedAtMillis: now,
        saleCard: _withSavedAt(handoff, now),
      ),
    );
  }

  Future<void> saveSelectedCopy({
    required String ownerId,
    required String instanceId,
  }) async {
    _validateIdentity(ownerId, instanceId);
    final prefs = await SharedPreferences.getInstance();
    final existing = _decode(prefs.getString(_key(ownerId)));
    final record = SaleCardHandoffRecord(
      ownerId: ownerId,
      instanceId: instanceId.toLowerCase(),
      savedAtMillis: DateTime.now().millisecondsSinceEpoch,
      saleCard: existing?.instanceId == instanceId.toLowerCase()
          ? existing?.saleCard
          : null,
    );
    await _write(prefs, record);
  }

  Future<SaleCardHandoffRecord?> load(String ownerId) async {
    if (!_isUuid(ownerId)) return null;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key(ownerId));
    final record = _decode(raw);
    if (raw != null && record == null) {
      await prefs.remove(_key(ownerId));
      return null;
    }
    if (record == null || record.ownerId != ownerId.toLowerCase()) {
      return null;
    }
    final age = DateTime.now().millisecondsSinceEpoch - record.savedAtMillis;
    if (age < 0 || age > _retention.inMilliseconds) {
      await prefs.remove(_key(ownerId));
      return null;
    }
    return record;
  }

  Future<void> clear(String ownerId) async {
    if (!_isUuid(ownerId)) return;
    await (await SharedPreferences.getInstance()).remove(_key(ownerId));
  }

  Future<void> _write(
    SharedPreferences prefs,
    SaleCardHandoffRecord record,
  ) async {
    final encoded = jsonEncode({
      'version': 1,
      'ownerId': record.ownerId,
      'instanceId': record.instanceId,
      'savedAtMillis': record.savedAtMillis,
      if (record.saleCard != null) 'saleCard': record.saleCard!.toJson(),
    });
    if (encoded.length > 16000) {
      throw StateError('This eBay return context is too large to retain.');
    }
    if (!await prefs.setString(_key(record.ownerId), encoded)) {
      throw StateError('Could not retain the selected copy for eBay.');
    }
  }

  SaleCardHandoff _withSavedAt(SaleCardHandoff handoff, int savedAtMillis) =>
      SaleCardHandoff(
        ownerId: handoff.ownerId.toLowerCase(),
        copy: handoff.copy,
        source: handoff.source,
        skin: handoff.skin,
        condition: handoff.condition,
        priceText: handoff.priceText,
        note: handoff.note,
        firm: handoff.firm,
        allowDms: handoff.allowDms,
        showFront: handoff.showFront,
        destination: handoff.destination,
        savedAtMillis: savedAtMillis,
      );

  SaleCardHandoffRecord? _decode(String? raw) {
    if (raw == null || raw.length > 16000) return null;
    try {
      final value = jsonDecode(raw);
      if (value is! Map<String, dynamic> || value['version'] != 1) {
        return null;
      }
      final ownerId = value['ownerId'];
      final instanceId = value['instanceId'];
      final savedAt = value['savedAtMillis'];
      final saleCard = value['saleCard'] == null
          ? null
          : SaleCardHandoff.fromJson(value['saleCard']);
      if (!_isUuid(ownerId) ||
          !_isUuid(instanceId) ||
          savedAt is! int ||
          (value['saleCard'] != null &&
              (saleCard == null ||
                  saleCard.ownerId != ownerId ||
                  saleCard.copy.instanceId != instanceId))) {
        return null;
      }
      return SaleCardHandoffRecord(
        ownerId: (ownerId as String).toLowerCase(),
        instanceId: (instanceId as String).toLowerCase(),
        savedAtMillis: savedAt,
        saleCard: saleCard,
      );
    } catch (_) {
      return null;
    }
  }

  String _key(String ownerId) => '$_keyPrefix${ownerId.toLowerCase()}';

  void _validateIdentity(String ownerId, String instanceId) {
    if (!_isUuid(ownerId) || !_isUuid(instanceId)) {
      throw StateError('Select a valid owned copy before opening eBay.');
    }
  }
}

bool _isUuid(Object? value) =>
    value is String && SaleCardHandoffStore._uuid.hasMatch(value);

String? _optionalString(Object? value, int maxLength) =>
    value is String && value.length <= maxLength ? value : null;

T? _enumByName<T extends Enum>(List<T> values, Object? name) {
  if (name is! String) return null;
  for (final value in values) {
    if (value.name == name) return value;
  }
  return null;
}
