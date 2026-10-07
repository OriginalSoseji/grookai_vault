import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/gvvi/vendor_pricing_workspace_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/vault/copy_cost_service.dart';
import 'package:grookai_vault/services/vault/copy_cost_models.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';

class LostCostResponse extends SupabaseCopyCostGateway {
  LostCostResponse(super.client);
  final attempts = <String>[];
  @override
  Future<Object?> save(CopyCostRequest request) async {
    attempts.add(jsonEncode(request.toJson()));
    await super.save(request);
    throw StateError('Synthetic lost committed cost response');
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native cost survives process restart and archived-copy recovery',
    (tester) async {
      const url = String.fromEnvironment('COST_TEST_URL');
      const email = String.fromEnvironment('COST_TEST_EMAIL');
      const copy = String.fromEnvironment('COST_TEST_COPY');
      const gvvi = String.fromEnvironment('COST_TEST_GVVI');
      expect(url, 'http://127.0.0.1:33061');
      expect(email.endsWith('@native-cost.invalid'), isTrue);
      expect(gvvi.startsWith('GVVI-NATIVECOST-'), isTrue);
      expect(isCopyCostId(copy), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('COST_TEST_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('COST_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      final gateway = LostCostResponse(client);
      final costs = CopyCostService(gateway: gateway);
      addTearDown(costs.dispose);
      final pending = await costs.pending();
      final recovering = pending.isNotEmpty;
      if (recovering) {
        expect(pending.length, 1);
        expect(pending.single.instanceId, copy);
      }
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: GvPalette.scheme(Brightness.light),
          ),
          home: VendorPricingWorkspaceScreen(
            service: VendorPricingWorkspaceService(client: client),
            copyCosts: costs,
            costEntryEnabled: !recovering,
          ),
        ),
      );
      Future<void> waitFor(Finder f) async {
        for (var n = 0; n < 100 && f.evaluate().isEmpty; n++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(f, findsWidgets);
      }

      Future<void> show(Finder f) async {
        if (f.evaluate().isEmpty) {
          await tester.scrollUntilVisible(
            f,
            220,
            scrollable: find
                .byWidgetPredicate(
                  (w) =>
                      w is Scrollable && w.axisDirection == AxisDirection.down,
                )
                .last,
            maxScrolls: 30,
          );
        }
        await tester.ensureVisible(f);
        await tester.pumpAndSettle();
      }

      Future<void> tap(Finder f) async {
        await show(f);
        await tester.tap(f);
        await tester.pumpAndSettle();
      }

      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      if (!recovering) {
        await waitFor(find.byKey(const Key('vendor_edit_$copy')));
        await tap(find.byKey(const Key('vendor_edit_$copy')));
        await tap(find.byKey(const Key('vendor_cost_$copy')));
        await waitFor(find.byKey(const Key('copy_cost_amount')));
        await tester.enterText(
          find.byKey(const Key('copy_cost_amount')),
          '13.27',
        );
        await show(find.byKey(const Key('copy_cost_currency')));
        await tester.enterText(
          find.byKey(const Key('copy_cost_currency')),
          'USD',
        );
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        await tap(find.byKey(const Key('copy_cost_save')));
        await waitFor(find.text('Save awaiting confirmation'));
        expect(gateway.attempts.length, 1);
        final row = (await costs.pending()).single;
        expect(row.pending!.amount, '13.27');
        expect(row.pending!.currency, 'USD');
        await show(find.byKey(const Key('copy_cost_retry')));
        await binding.takeScreenshot('native-cost-unconfirmed');
        await client.rpc(
          'vault_archive_exact_instance_v1',
          params: {'p_instance_id': copy},
        );
        expect((await costs.read(copy)).archived, isTrue);
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'pending_after_commit',
          'owner': owner,
          'requestId': row.pending!.requestId,
          'pendingCount': await costs.pendingCount(),
        };
      } else {
        await waitFor(find.text('No vendor inventory yet'));
        await tap(find.byKey(const Key('vendor_cost_recovery')));
        await waitFor(find.byKey(const Key('recover_cost_$copy')));
        await binding.takeScreenshot('native-cost-recovery-list');
        await tap(find.byKey(const Key('recover_cost_$copy')));
        await waitFor(find.text('Save awaiting confirmation'));
        expect(
          tester
              .widget<TextField>(find.byKey(const Key('copy_cost_amount')))
              .enabled,
          isFalse,
        );
        await tap(find.byKey(const Key('copy_cost_recover')));
        await waitFor(find.text('Cost saved.'));
        expect(await costs.pendingCount(), 0);
        expect(gateway.attempts, isEmpty);
        expect((await costs.read(copy)).cost!.label, 'USD 13.27');
        await show(find.byKey(const Key('copy_cost_recorded')));
        await binding.takeScreenshot('native-cost-recovered');
        await client.auth.signOut();
        await tester.pumpAndSettle();
        expect(find.byType(TextField), findsNothing);
        await binding.takeScreenshot('native-cost-account-closed');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'recovered_after_process_restart',
          'owner': owner,
          'requestId': pending.single.pending!.requestId,
          'pendingCount': 0,
        };
      }
    },
  );
}
