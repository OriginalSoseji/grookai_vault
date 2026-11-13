import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../square/square_sync_notifier.dart';

typedef PricingRulesCall =
    Future<dynamic> Function(String action, Map<String, dynamic> data);

/// The database owns all pricing math and the exact-reference eligibility gate.
/// This service never accepts an asking amount for an automatic copy.
class VendorPricingRulesService {
  VendorPricingRulesService({SupabaseClient? client, PricingRulesCall? call})
    : _client = client,
      _call = call;
  final SupabaseClient? _client;
  final PricingRulesCall? _call;
  SupabaseClient get _requiredClient => _client ?? Supabase.instance.client;

  Future<Map<String, dynamic>> invoke(
    String action, [
    Map<String, dynamic> data = const {},
  ]) async {
    final result = _call != null
        ? await _call(action, data)
        : await _requiredClient.rpc(
            'vendor_pricing_v1',
            params: {'p_action': action, 'p_data': data},
          );
    if (result is! Map || result['ok'] == false) {
      final code = result is Map ? '${result['error'] ?? ''}' : '';
      if (code.contains('changed') || code.contains('conflict')) {
        throw const FormatException(
          'This pricing setting changed. Reload before saving again.',
        );
      }
      if (code.contains('no_exact_market')) {
        throw const FormatException(
          'No fresh exact market reference. Choose My price or try later.',
        );
      }
      if (code.contains('invalid_rule') || code.contains('invalid_result')) {
        throw const FormatException(
          'Check the percentage, USD adjustment, rounding increment, and minimum / maximum amounts.',
        );
      }
      throw const FormatException(
        'Pricing could not be confirmed. Reload before retrying. Your last confirmed price is retained.',
      );
    }
    return Map<String, dynamic>.from(result);
  }

  Future<Map<String, dynamic>> workspace([String? instanceId]) =>
      invoke('workspace', {'instanceId': ?instanceId});
  Future<Map<String, dynamic>> preview(String instanceId, String selection) =>
      invoke('preview', {
        'instanceId': instanceId,
        'mode': selection == 'default' ? 'default' : 'preset',
        'ruleId': selection == 'default' ? null : selection,
      });
  Future<Map<String, dynamic>> saveRule({
    required String name,
    required Map<String, dynamic> definition,
    String? ruleId,
    int? revision,
  }) => invoke('save_rule', {
    'requestId': const Uuid().v4(),
    'name': name,
    'definition': definition,
    'ruleId': ruleId,
    'expectedRevision': revision,
  });
  Future<Map<String, dynamic>> saveSettings({
    required String? defaultId,
    required bool autoForNew,
    required int revision,
  }) => invoke('save_settings', {
    'requestId': const Uuid().v4(),
    'defaultRuleId': defaultId,
    'autoForNew': autoForNew,
    'expectedRevision': revision,
  });
  Future<String> apply({
    required String instanceId,
    required String selection,
    required int revision,
  }) async {
    final result = await invoke('apply', {
      'requestId': const Uuid().v4(),
      'instanceId': instanceId,
      'mode': selection == 'default' ? 'default' : 'preset',
      'ruleId': selection == 'default' ? null : selection,
      'expectedRevision': revision,
      'publish': true,
    });
    if (result['status'] != 'ready' ||
        result['id'] != instanceId ||
        result['amountMinor'] is! int ||
        (result['amountMinor'] as int) <= 0) {
      throw const FormatException(
        'The sale price could not be confirmed. Reload this copy before retrying.',
      );
    }
    if (_call != null) return 'not_enabled';
    return SquareSyncNotifier.offerSaved(
      _requiredClient,
      instanceId,
      waitForConfirmation: true,
    );
  }
}
