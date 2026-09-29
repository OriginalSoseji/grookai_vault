import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/grookai_objects/grookai_objects_hub_screen.dart';
import 'package:grookai_vault/screens/grookai_objects/for_sale_terms_screen.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/services/grookai_objects/object_inventory_service.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_destination_export_renderer.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  WidgetController.hitTestWarningShouldBeFatal = true;
  testWidgets('Objects saves and exports the selected physical copies', (
    tester,
  ) async {
    final config =
        jsonDecode(const String.fromEnvironment('GV_OWNED_FIXTURE'))
            as Map<String, dynamic>;
    expect(config['api'], 'http://127.0.0.1:31021');
    final client = SupabaseClient(
      config['api'],
      config['anon'],
      authOptions: const AuthClientOptions(autoRefreshToken: false),
    );
    final readback = SupabaseClient(
      config['api'],
      config['anon'],
      authOptions: const AuthClientOptions(autoRefreshToken: false),
    );
    final note =
        'Device ${Platform.operatingSystem} ${DateTime.now().microsecondsSinceEpoch}';
    final previousErrorHandler = FlutterError.onError;
    FlutterError.onError = (details) {
      // Keep the original exception before the integration runner formats it.
      // ignore: avoid_print
      print('OWNED_ERROR:${details.exceptionAsString()}');
      previousErrorHandler?.call(details);
    };
    Future<void> waitFor(Finder finder) async {
      for (var i = 0; i < 150; i++) {
        await tester.pump(const Duration(milliseconds: 200));
        if (finder.evaluate().isNotEmpty) return;
      }
      fail('Expected UI state: $finder');
    }

    Finder field(String label) => find.byWidgetPredicate(
      (w) => w is TextField && w.decoration?.labelText == label,
    );
    Future<void> reveal(Finder finder) async {
      if (finder.evaluate().isEmpty) {
        final scrollable = find.byType(Scrollable).first;
        tester.state<ScrollableState>(scrollable).position.jumpTo(0);
        await tester.pumpAndSettle();
        if (finder.evaluate().isEmpty) {
          await tester.scrollUntilVisible(finder, 250, scrollable: scrollable);
        }
      }
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
    }

    Future<void> enter(String label, String value) async {
      await reveal(field(label));
      await tester.enterText(field(label), value);
      FocusManager.instance.primaryFocus?.unfocus();
      await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
      await tester.pumpAndSettle();
    }

    Future<void> tap(String label) async {
      final f = label.startsWith('GVVI-')
          ? find
                .ancestor(of: find.text(label), matching: find.byType(InkWell))
                .first
          : find.text(label);
      await reveal(f);
      await tester.tap(f);
      await tester.pumpAndSettle();
    }

    Future<void> capture(String name) async {
      final bytes = await binding.takeScreenshot(name);
      // Private runner extracts evidence without exposing account details.
      // ignore: avoid_print
      print(
        'OWNED_IMAGE:${Platform.operatingSystem}-$name:${base64Encode(bytes)}',
      );
    }

    Future<void> dismissNotice() async {
      if (find.byType(SnackBar).evaluate().isNotEmpty) {
        await tester.drag(find.byType(SnackBar), const Offset(0, 400));
        await tester.pumpAndSettle();
      }
    }

    try {
      for (final c in [client, readback]) {
        await c.auth.signInWithPassword(
          email: config['owner']['email'],
          password: config['owner']['password'],
        );
      }
      final before = await readback
          .from('vault_item_instances')
          .select()
          .order('id');
      final rows = await const ObjectInventoryService().load(client);
      expect(rows.length, 4);
      final first = rows.singleWhere(
        (r) => r['instance_id'] == config['rawIds'][0],
      );
      final second = rows.singleWhere(
        (r) => r['instance_id'] == config['rawIds'][1],
      );
      final slab = rows.firstWhere((r) => r['is_graded'] == true);
      await tester.pumpWidget(
        MaterialApp(home: GrookaiObjectsHubScreen(client: client)),
      );
      await waitFor(find.text(second['gv_vi_id']));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pumpAndSettle();
      }
      await capture('objects');

      await tap(first['gv_vi_id']);
      await enter('Memory note', note);
      await enter('Place', 'Isolated sandbox');
      await tap('Save memory card');
      await waitFor(find.text('Memory card saved.'));
      final memories = await CollectorMemoryService(
        client: readback,
      ).loadForGvvi(gvviId: first['gv_vi_id']);
      final memory = memories.singleWhere((m) => m.note == note);
      expect(memory.vaultItemInstanceId, first['instance_id']);
      expect(memory.isPublic, isFalse);
      await capture('memory-saved');
      await dismissNotice();
      await tester.pageBack();
      await tester.pumpAndSettle();

      await tap('Sale');
      await tap(second['gv_vi_id']);
      final sale = tester.widget<ForSaleTermsScreen>(
        find.byType(ForSaleTermsScreen),
      );
      expect(sale.initialCopy?.instanceId, second['instance_id']);
      await enter('Asking price', '18.75');
      await enter('Listing note', note);
      await tap('Save sale card');
      await waitFor(find.text('Sale listing saved.'));
      final after = await readback
          .from('vault_item_instances')
          .select()
          .order('id');
      final saved = after.singleWhere((r) => r['id'] == second['instance_id']);
      expect(saved['intent'], 'sell');
      expect(saved['asking_price_amount'], 18.75);
      expect(saved['asking_price_note'], note);
      for (final row in before.where((r) => r['id'] != second['instance_id'])) {
        expect(
          after.singleWhere((r) => r['id'] == row['id']),
          row,
          reason:
              'Other copies, including the same parent and archived copies, stay unchanged',
        );
      }
      await capture('sale-saved');
      await dismissNotice();
      await tester.pageBack();
      await tester.pumpAndSettle();
      await waitFor(find.text(second['gv_vi_id']));
      await tap(second['gv_vi_id']);
      await reveal(field('Asking price'));
      expect(
        tester.widget<TextField>(field('Asking price')).controller!.text,
        '18.75',
      );
      await reveal(field('Listing note'));
      expect(
        tester.widget<TextField>(field('Listing note')).controller!.text,
        note,
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      await waitFor(find.text(slab['gv_vi_id']));
      await tap(slab['gv_vi_id']);
      expect(
        tester
            .widget<ForSaleTermsScreen>(find.byType(ForSaleTermsScreen))
            .initialCopy
            ?.instanceId,
        slab['instance_id'],
      );
      expect(find.text('PSA 10'), findsWidgets);
      await tester.pageBack();
      await tester.pumpAndSettle();

      await tap('Lot');
      await tap(first['gv_vi_id']);
      await tap(second['gv_vi_id']);
      await reveal(find.text('2/12 selected'));
      expect(find.text('2/12 selected'), findsOneWidget);
      await tap('Price Lot');
      final lot = tester.widget<LotPricingScreen>(
        find.byType(LotPricingScreen),
      );
      expect(lot.source.items.map((i) => i.gvviId).toSet(), {
        first['gv_vi_id'],
        second['gv_vi_id'],
      });
      await enter('Lot title', 'Two distinct owned copies');
      await enter('Bundle price', '30.00');
      final prices = field('My price');
      for (var i = 0; i < 2; i++) {
        await tester.ensureVisible(prices.at(i));
        await tester.pumpAndSettle();
        await tester.enterText(prices.at(i), i == 0 ? '18.75' : '15.00');
      }
      FocusManager.instance.primaryFocus?.unfocus();
      await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
      await tester.pumpAndSettle();
      final renderers = tester
          .widgetList<GrookaiObjectDestinationExportRenderer>(
            find.byType(GrookaiObjectDestinationExportRenderer),
          )
          .toList();
      expect(renderers.length, 2);
      for (final renderer in renderers) {
        expect(
          renderer.object.metadata['gvvi_ids'],
          containsAll([first['gv_vi_id'], second['gv_vi_id']]),
        );
        expect(renderer.object.fields['bundlePrice'], 30);
        final items = (renderer.object.fields['items'] as List).cast<Map>();
        expect(items.map((item) => item['gvviId']).toSet(), {
          first['gv_vi_id'],
          second['gv_vi_id'],
        });
        expect(items.map((item) => item['price']), [18.75, 15.00]);
        final export = const GrookaiObjectExportService().exportObjectPng(
          object: renderer.object,
          destination: renderer.destination,
          repaintBoundaryKey: renderer.repaintBoundaryKey,
        );
        // The integration binding only produces requested test frames. Drive
        // the two real export frames before awaiting GPU PNG encoding.
        await tester.pump();
        await tester.pump();
        await tester.pump();
        final bytes = await export;
        expect(bytes.take(8), [137, 80, 78, 71, 13, 10, 26, 10]);
        // ignore: avoid_print
        print(
          'OWNED_IMAGE:${Platform.operatingSystem}-lot-${renderer.showFront ? 'front' : 'back'}:${base64Encode(bytes)}',
        );
      }
      expect(
        await readback.from('vault_item_instances').select().order('id'),
        after,
        reason: 'Lot export does not alter inventory or create a persisted lot',
      );

      await readback.auth.signOut();
      await readback.auth.signInWithPassword(
        email: config['other']['email'],
        password: config['other']['password'],
      );
      await expectLater(
        SaleListingService(client: readback).saveSingleCardListing(
          instanceId: second['instance_id'],
          gvviId: second['gv_vi_id'],
          vaultItemId: second['vault_item_id'],
          cardPrintId: second['card_id'],
          price: 1,
        ),
        throwsException,
      );
      expect(
        await CollectorMemoryService(
          client: readback,
        ).loadForGvvi(gvviId: first['gv_vi_id']),
        isEmpty,
      );
      expect(
        (await client
            .from('vault_item_instances')
            .select()
            .eq('id', second['instance_id'])
            .single())['asking_price_amount'],
        18.75,
      );
      expect(tester.takeException(), isNull);
      // ignore: avoid_print
      print(
        'OWNED_UI_PASS:${jsonEncode({'platform': Platform.operatingSystem, 'memoryId': memory.id, 'saleInstance': second['instance_id'], 'lotCopies': 2})}',
      );
    } catch (error, stack) {
      // Preserve the live tree so Flutter can report the original UI failure.
      // ignore: avoid_print
      print('OWNED_FAILURE:$error\n$stack');
      rethrow;
    } finally {
      await client.dispose();
      await readback.dispose();
      FlutterError.onError = previousErrorHandler;
    }
  });
}
