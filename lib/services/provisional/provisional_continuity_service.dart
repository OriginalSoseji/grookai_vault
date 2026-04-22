import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../models/provisional_card.dart';
import '../../secrets.dart';

enum ProvisionalContinuityKind { provisional, redirect, notFound }

class ProvisionalContinuityResult {
  const ProvisionalContinuityResult._({
    required this.kind,
    this.card,
    this.gvId,
  });

  const ProvisionalContinuityResult.provisional(PublicProvisionalCard card)
    : this._(kind: ProvisionalContinuityKind.provisional, card: card);

  const ProvisionalContinuityResult.redirect(String gvId)
    : this._(kind: ProvisionalContinuityKind.redirect, gvId: gvId);

  const ProvisionalContinuityResult.notFound()
    : this._(kind: ProvisionalContinuityKind.notFound);

  final ProvisionalContinuityKind kind;
  final PublicProvisionalCard? card;
  final String? gvId;
}

class ProvisionalContinuityService {
  const ProvisionalContinuityService._();

  static Uri _webUri(String path) {
    final base = grookaiWebBaseUrl.trim().replaceFirst(RegExp(r'/+$'), '');
    return Uri.parse('$base$path');
  }

  // LOCK: Promotion continuity must use explicit linkage only.
  // LOCK: Never infer canonical identity from provisional data.
  static Future<ProvisionalContinuityResult> resolve(String candidateId) async {
    final normalized = candidateId.trim();
    if (normalized.isEmpty) {
      return const ProvisionalContinuityResult.notFound();
    }

    final response = await http
        .get(
          _webUri('/api/provisional/${Uri.encodeComponent(normalized)}'),
          headers: const {'Accept': 'application/json'},
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode == 404) {
      return const ProvisionalContinuityResult.notFound();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return const ProvisionalContinuityResult.notFound();
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      return const ProvisionalContinuityResult.notFound();
    }

    final kind = (decoded['kind'] ?? '').toString().trim();
    if (kind == 'redirect') {
      final gvId = (decoded['gv_id'] ?? '').toString().trim();
      return gvId.startsWith('GV-')
          ? ProvisionalContinuityResult.redirect(gvId)
          : const ProvisionalContinuityResult.notFound();
    }

    if (kind == 'provisional' && decoded['candidate'] is Map) {
      try {
        return ProvisionalContinuityResult.provisional(
          PublicProvisionalCard.fromJson(
            Map<String, dynamic>.from(decoded['candidate'] as Map),
          ),
        );
      } catch (_) {
        return const ProvisionalContinuityResult.notFound();
      }
    }

    return const ProvisionalContinuityResult.notFound();
  }
}
