import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/founder/founder_operations_screen.dart';
import 'package:grookai_vault/services/operations/founder_operations_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  testWidgets('renders dynamic exclusion lists without a runtime type error', (
    tester,
  ) async {
    final item = FounderOperationsWorkItem.fromJson({
      'id': 'work-item-1',
      'work_item_key': 'catalog-set:test',
      'version': 1,
      'state': 'ready_for_review',
      'work_item_type': 'catalog_set_review',
      'action_type': 'review',
      'title': 'Review test set',
      'summary': 'Review-only operation.',
      'domain': 'catalog',
      'risk_level': 'low',
      'scope': <String, dynamic>{'game_code': 'pokemon'},
      'exclusions': <dynamic>['No card writes', 'No image writes'],
      'plan_payload': <String, dynamic>{},
      'plan_fingerprint': 'fingerprint',
      'contract_version': 'FOUNDER_OPERATIONS_V1',
      'requires_recent_auth': false,
      'command_policy': <String, dynamic>{'execution_enabled': false},
      'agent_key': 'catalog-agent',
      'agent_name': 'Catalog Agent',
    });
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-test-key',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
    );
    final service = _FounderOperationsServiceStub(
      client,
      FounderOperationsWorkItemDetail.fromJson({
        'work_item': <String, dynamic>{},
        'agent': <String, dynamic>{},
        'evidence': <dynamic>[],
        'decisions': <dynamic>[],
        'events': <dynamic>[],
        'command': null,
      }),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: FounderOperationsWorkItemScreen(item: item, service: service),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No card writes'), findsOneWidget);
    expect(find.text('No image writes'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox.shrink());
  });
}

class _FounderOperationsServiceStub extends FounderOperationsService {
  _FounderOperationsServiceStub(SupabaseClient client, this.detail)
    : super(client: client);

  final FounderOperationsWorkItemDetail detail;

  @override
  Future<FounderOperationsWorkItemDetail> fetchWorkItem(
    String workItemId,
  ) async {
    return detail;
  }
}
