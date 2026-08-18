import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../secrets.dart';

class GvviVendorOffer {
  const GvviVendorOffer({
    required this.gvviId,
    required this.vendorSlug,
    required this.vendorDisplayName,
    required this.askingPriceAmount,
    required this.askingPriceCurrency,
    required this.availability,
    this.vendorAvatarUrl,
    this.conditionLabel,
  });

  final String gvviId;
  final String vendorSlug;
  final String vendorDisplayName;
  final String? vendorAvatarUrl;
  final double askingPriceAmount;
  final String askingPriceCurrency;
  final String? conditionLabel;
  final String availability;

  static GvviVendorOffer? fromJson(Map<String, dynamic> json) {
    if ((json['schema_version'] ?? '').toString() !=
        'GVVI_VENDOR_OFFER_PUBLIC_V1') {
      return null;
    }

    final gvviId = (json['gvvi_id'] ?? '').toString().trim();
    final vendor = json['vendor'];
    final offer = json['offer'];
    if (gvviId.isEmpty || vendor is! Map || offer is! Map) {
      return null;
    }

    final vendorSlug = (vendor['slug'] ?? '').toString().trim();
    final vendorDisplayName = (vendor['display_name'] ?? '').toString().trim();
    final amountValue = offer['asking_price_amount'];
    final amount = amountValue is num
        ? amountValue.toDouble()
        : double.tryParse((amountValue ?? '').toString());
    if (vendorSlug.isEmpty ||
        vendorDisplayName.isEmpty ||
        amount == null ||
        !amount.isFinite ||
        amount <= 0) {
      return null;
    }

    final currency = (offer['asking_price_currency'] ?? 'USD')
        .toString()
        .trim()
        .toUpperCase();
    final availability = (offer['availability'] ?? '').toString().trim();
    if (currency.isEmpty || availability != 'available') {
      return null;
    }

    return GvviVendorOffer(
      gvviId: gvviId,
      vendorSlug: vendorSlug,
      vendorDisplayName: vendorDisplayName,
      vendorAvatarUrl: _nullableText(vendor['avatar_url']),
      askingPriceAmount: amount,
      askingPriceCurrency: currency,
      conditionLabel: _nullableText(offer['condition_label']),
      availability: availability,
    );
  }
}

class GvviVendorOfferService {
  static Future<GvviVendorOffer?> load(String gvviId) async {
    final normalizedGvviId = gvviId.trim();
    if (normalizedGvviId.isEmpty) {
      return null;
    }

    final base = grookaiWebBaseUrl.trim().replaceFirst(RegExp(r'/+$'), '');
    final uri = Uri.parse(
      '$base/api/gvvi/${Uri.encodeComponent(normalizedGvviId)}/vendor-offer',
    );

    try {
      final response = await http
          .get(uri, headers: const {'accept': 'application/json'})
          .timeout(const Duration(seconds: 8));
      if (response.statusCode != 200) {
        return null;
      }
      final decoded = jsonDecode(response.body);
      if (decoded is! Map) {
        return null;
      }
      final offer = GvviVendorOffer.fromJson(
        Map<String, dynamic>.from(decoded),
      );
      return offer?.gvviId == normalizedGvviId ? offer : null;
    } catch (_) {
      // Vendor presentation is additive. The ordinary GVVI page remains usable
      // if the bounded web read model is temporarily unavailable.
      return null;
    }
  }
}

Uri buildPersistentGvviQrUri(String gvviId) {
  final normalizedGvviId = gvviId.trim();
  return Uri.https(
    'grookaivault.com',
    '/q/${Uri.encodeComponent(normalizedGvviId)}',
  );
}

String? _nullableText(Object? value) {
  final normalized = (value ?? '').toString().trim();
  return normalized.isEmpty ? null : normalized;
}
