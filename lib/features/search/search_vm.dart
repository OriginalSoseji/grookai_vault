import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/core/load_state.dart';
import 'package:grookai_vault/core/ui_contracts.dart';
import 'package:grookai_vault/core/adapters.dart';
import 'package:grookai_vault/core/telemetry.dart';
import 'package:grookai_vault/services/search_gateway.dart';
import 'package:grookai_vault/services/vault_service.dart';
import 'package:grookai_vault/core/result.dart';
import 'package:grookai_vault/core/event_bus.dart';

enum SearchMode { all, sets, prints }

class SearchVm {
  final SupabaseClient client;
  final _gateway = SearchGateway();
  late final VaultService _vault = VaultService(client);
  final ValueNotifier<LoadState<List<CardPrintView>>> items =
      ValueNotifier<LoadState<List<CardPrintView>>>(LoadState.idle());
  Timer? _debounce;

  SearchVm(this.client);

  void dispose() {
    _debounce?.cancel();
  }

  void search(String query, SearchMode mode) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      _searchNow(query.trim(), mode);
    });
  }

  Future<void> _searchNow(String q, SearchMode mode) async {
    if (q.isEmpty) {
      items.value = LoadState.data(const <CardPrintView>[]);
      return;
    }
    items.value = LoadState.loading();
    try {
      Telemetry.log('search_open', {'q': q, 'mode': mode.name});
      final res = await _gateway.searchResult(q);
      if (res is Ok<List<Map<String, dynamic>>>) {
        final mapped = res.value.map(cardPrintFromDb).toList();
        items.value = LoadState.data(mapped);
        Telemetry.log('search_success', {
          'result_count': mapped.length,
          'q': q,
          'mode': mode.name,
        });
      } else {
        final msg = (res as Err).message;
        items.value = LoadState.error('Search failed');
        Telemetry.log('error', {'at': 'search', 'msg': msg});
      }
    } catch (e) {
      final msg = e.toString();
      items.value = LoadState.error('Search failed');
      Telemetry.log('error', {'at': 'search', 'msg': msg});
    }
  }

  Future<bool> importToVault(String cardId) async {
    final res = await _vault.addOrIncrementResult(cardId: cardId, deltaQty: 1);
    if (res is Ok<bool>) {
      Telemetry.log('import_ok', {'cardId': cardId, 'source': 'search'});
      EventBus.reloadVault();
      return true;
    }
    Telemetry.log('import_fail', {'cardId': cardId, 'msg': (res as Err).message});
    return false;
  }

  Future<bool> importCard(CardPrintView v) async {
    String id = v.id;
    try {
      if (id.isEmpty) {
        // 1) Fast DB fallback by (set_code, number)
        try {
          final row = await client
              .from('card_prints')
              .select('id')
              .eq('set_code', v.setCode)
              .eq('number', v.number)
              .maybeSingle();
          String found = '';
          if (row is Map) {
            final m = Map<String, dynamic>.from(row as Map);
            found = (m['id'] ?? '').toString();
          }
          if (found.isNotEmpty) {
            id = found;
          }
        } catch (_) {}

        // 2) Hydrate via Edge Function if still missing
        if (id.isEmpty) {
          Future<String> doHydrate() async {
            final r = await client.functions
                .invoke('hydrate_card', body: {
                  'name': v.name,
                  'set_code': v.setCode,
                  'number': v.number,
                  'lang': 'en',
                })
                .timeout(const Duration(seconds: 5));
            final data = (r.data is Map)
                ? Map<String, dynamic>.from(r.data as Map)
                : <String, dynamic>{};
            return (data['card_print_id'] ?? data['id'] ?? '').toString();
          }

          try {
            id = await doHydrate();
          } catch (e) {
            final s = e.toString();
            final maybe503 =
                s.contains('503') || s.contains('Service Unavailable');
            if (maybe503) {
              Telemetry.log('hydrate_retry', {
                'set': v.setCode,
                'num': v.number,
              });
              await Future.delayed(const Duration(milliseconds: 400));
              try {
                id = await doHydrate();
              } catch (_) {
                Telemetry.log('import_fail', {'cardId': '', 'msg': 'hydrate_boot'});
                return false;
              }
            } else {
              Telemetry.log('import_fail', {'cardId': '', 'msg': 'hydrate_error'});
              return false;
            }
          }
        }
      }
      if (id.isEmpty) {
        Telemetry.log('import_fail', {'cardId': '', 'msg': 'empty_hydrate'});
        return false;
      }
      final res = await _vault.addOrIncrementResult(cardId: id, deltaQty: 1);
      if (res is Ok<bool>) {
        Telemetry.log('import_ok', {'cardId': id, 'source': 'online'});
        EventBus.reloadVault();
        return true;
      }
      Telemetry.log('import_fail', {'cardId': id, 'msg': (res as Err).message});
      return false;
    } catch (e) {
      Telemetry.log('import_fail', {'cardId': id, 'msg': '$e'});
      return false;
    }
  }
}
