import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/gvvi/vendor_pricing_workspace_service.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';
import '../../services/sales/sales_payments.dart';
import 'sales_payment_editor.dart';
import 'sales_purchase_panel.dart';
import 'sales_purchase_dialog.dart';
import '../../services/sales/negotiated_draft.dart';
import '../../services/sales/negotiated_trade.dart';
import '../../services/sales/purchase_drafts.dart';
import '../../services/sales/sales_purchase.dart';
import '../../services/sales/sales_drafts.dart';
import '../../widgets/card_surface_artwork.dart';
import 'sales_dashboard.dart';
import 'sales_catalog_dialog.dart';
import 'sales_trade_dialog.dart';
import 'sales_price_reference.dart';
import 'receipt_delivery_panel.dart';
import '../workspace/workspace_activation.dart';
import 'sales_scanner_input.dart';

class SalesDeskScreen extends StatefulWidget {
  const SalesDeskScreen({super.key, this.service});
  final SalesCartService? service;
  @override
  State<SalesDeskScreen> createState() => _SalesDeskScreenState();
}

class _SalesDeskScreenState extends State<SalesDeskScreen> {
  late final SalesCartService _service = widget.service ?? SalesCartService();
  final _search = TextEditingController();
  final _store = TextEditingController();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _wants = TextEditingController();
  final _tax = TextEditingController(text: '0.00');
  final _note = TextEditingController();
  final List<SalesCartLine> _lines = [];
  final List<SalesTradeLine> _trades = [];
  SalesDeskData? _data;
  Map<String, dynamic>? _pending, _receipt, _customer;
  Map<String, dynamic>? _purchaseDraft, _negotiatedDraft;
  final List<Map<String, dynamic>> _agreedTrades = [];
  String? _negotiatedInputError;
  bool get _negotiated => _negotiatedDraft != null;
  bool get _tradeUnavailable =>
      _negotiated && _data?.negotiatedTradesAvailable != true;
  bool get _entryLocked => _locked || _tradeUnavailable;
  int get _credit => _negotiated
      ? _agreedTrades.fold<int>(0, (n, t) => n + (t['creditMinor'] as int))
      : _trades.fold<int>(0, (n, t) => n + t.creditMinor);
  bool _loading = true, _busy = false, _showCart = false;
  int _pendingScans = 0;
  bool get _scanPending => _pendingScans > 0;
  bool _accountChanged = false, _dashboard = false, _editing = false;
  int _inventoryGeneration = 0, _deskGeneration = 0;
  bool _catalogOpen = false, _catalogBusy = false, _tradeOpen = false;
  bool _inventoryLoading = false, _historyLoading = false;
  String? _inventoryError, _historyError;
  StreamSubscription<void>? _accountSubscription;
  String? _error;
  String _method = 'Cash';
  List<Map<String, dynamic>>? _payments;
  int get _balance =>
      _lines.fold<int>(
        saleMoneyInput(_tax.text) ?? 0,
        (n, l) => n + l.quantity * l.unitMinor,
      ) -
      _credit;
  Map<String, dynamic>? _draftBook;
  Future<void> _draftWrites = Future<void>.value();
  bool _restoringDraft = true;
  String? _draftError;
  bool _workspaceActive = true;
  int? _workspaceActivation;
  WorkspaceExitCoordinator? _workspaceExits;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _workspaceExits?.unregister(this);
    _workspaceExits = WorkspaceActivation.exitsOf(context);
    _workspaceExits?.register(this, _prepareToLeave);
    _workspaceActive = WorkspaceActivation.activeOf(context);
    final revision = WorkspaceActivation.of(context);
    if (_workspaceActivation != null && revision != _workspaceActivation) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_loading && !_locked && _data != null) {
          unawaited(_refreshWorkspaceInventory());
        }
      });
    }
    _workspaceActivation = revision;
  }

  // Returning from pricing refreshes stock, never the negotiated deal or journal.
  Future<void> _refreshWorkspaceInventory() async {
    final generation = ++_inventoryGeneration;
    final previousIds = _data!.rows.map((row) => row.instanceId).toSet();
    setState(() {
      _inventoryLoading = true;
      _inventoryError = null;
    });
    try {
      final rows = await _service.loadInventory();
      if (!mounted || _accountChanged || generation != _inventoryGeneration) {
        return;
      }
      final seen = rows.map((row) => row.instanceId).toSet();
      setState(
        () => _data = _data?.withRows([
          ...rows,
          ...?_data?.rows.where(
            (row) =>
                !previousIds.contains(row.instanceId) &&
                !seen.contains(row.instanceId),
          ),
        ]),
      );
    } catch (_) {
      if (mounted && !_accountChanged && generation == _inventoryGeneration) {
        setState(
          () => _inventoryError =
              'Stock could not refresh. Your current deal is kept. Retry Refresh when ready.',
        );
      }
    } finally {
      if (mounted && generation == _inventoryGeneration) {
        setState(() => _inventoryLoading = false);
      }
    }
  }

  bool get _locked => _baseLocked || _scanPending;
  bool get _baseLocked =>
      _accountChanged ||
      _editing ||
      _catalogBusy ||
      _busy ||
      _pending != null ||
      _receipt != null;

  @override
  void initState() {
    super.initState();
    _search.addListener(_filter);
    for (final controller in [
      _store,
      _name,
      _email,
      _phone,
      _wants,
      _tax,
      _note,
    ]) {
      controller.addListener(_queueDraft);
    }
    _accountSubscription = _service.accountChanges.listen((_) {
      if (mounted) {
        setState(() => _accountChanged = true);
        final route = ModalRoute.of(context);
        if (route != null) {
          Navigator.of(context).popUntil((candidate) => candidate == route);
        }
      }
    });
    unawaited(_load());
  }

  @override
  void dispose() {
    _workspaceExits?.unregister(this);
    unawaited(_accountSubscription?.cancel());
    for (final c in [
      _search,
      _store,
      _name,
      _email,
      _phone,
      _wants,
      _tax,
      _note,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _filter() => setState(() {});
  void _message(String message) {
    if (mounted) setState(() => _error = message);
  }

  Future<void> _load() async {
    _inventoryGeneration++;
    _deskGeneration++;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_draftBook != null && !_restoringDraft && _pending == null) {
        await _flushDraft();
      }
      _restoringDraft = true;
      final data = await _service.load();
      if (!mounted || _accountChanged) return;
      setState(() {
        _data = data;
        _restoringDraft = true;
        _draftBook = data.localDrafts;
        if (_draftBook != null) {
          final drafts = List<dynamic>.from(_draftBook!['drafts'] as List);
          if (drafts.isEmpty) {
            drafts.add(blankSalesDraft(newSaleId(), data.storeName));
          }
          _draftBook = {
            ..._draftBook!,
            'drafts': drafts,
            'active': _draftBook!['active'] ?? drafts.first['id'],
          };
          if (data.pending == null) {
            _restoreDraft(
              Map<String, dynamic>.from(
                drafts.firstWhere((d) => d['id'] == _draftBook!['active'])
                    as Map,
              ),
            );
          }
        }
        if (_store.text.isEmpty) _store.text = data.storeName;
        _pending = data.pending;
        if (_pending != null && (_pending!['cart'] as Map)['version'] == 5) {
          final request = validateNegotiatedTradeRequest({
            'id': _pending!['id'],
            'cart': _pending!['cart'],
          });
          final cart = request['cart'] as Map;
          _restoreDraft(
            {
              ...newNegotiatedDraft(
                _pending!['draftId'] as String? ?? _pending!['id'] as String,
                cart['storeName'] as String,
              ),
              ...cart,
              'method': salesTenderMethods.contains(cart['method'])
                  ? cart['method']
                  : 'Other',
            }..remove('version'),
          );
          _restoringDraft = true;
        } else if (_pending != null &&
            (_pending!['cart'] as Map)['version'] == 4) {
          final request = validatePurchaseRequest({
            'id': _pending!['id'],
            'cart': _pending!['cart'],
          });
          final cart = request['cart'] as Map;
          _restoreDraft({
            ...blankPurchaseDraft(
              _pending!['draftId'] as String? ?? _pending!['id'] as String,
              cart['storeName'] as String,
            ),
            'items': cart['items'],
            'payments': cart['payments'],
            'note': cart['note'],
            'customerId': cart['customerId'],
            'customer': cart['customer'],
          });
          _restoringDraft = true;
        } else if (_pending != null) {
          _negotiatedDraft = null;
          _agreedTrades.clear();
          _purchaseDraft = null;
          final cart = _pending!['cart'] as Map;
          _store.text = cart['storeName'] as String;
          _method = salesTenderMethods.contains(cart['method'])
              ? cart['method'] as String
              : 'Other';
          _payments = (cart['payments'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          _tax.text = saleMoney(cart['taxMinor'] as int);
          _note.text = cart['note'] as String;
          _trades
            ..clear()
            ..addAll(
              (cart['trades'] as List? ?? []).map(
                (item) => SalesTradeLine.fromJson(item as Map),
              ),
            );
          final customer = cart['customer'] as Map;
          _name.text = customer['name'] as String;
          _email.text = customer['email'] as String;
          _phone.text = customer['phone'] as String;
          _wants.text = customer['wants'] as String;
          _customer = cart['customerId'] == null
              ? null
              : {
                  'id': cart['customerId'],
                  ...Map<String, dynamic>.from(customer),
                };
          _lines
            ..clear()
            ..addAll(
              (cart['items'] as List).map(
                (item) => SalesCartLine(
                  description: item['description'] as String,
                  unitMinor: item['unitMinor'] as int,
                  quantity: item['quantity'] as int,
                  instanceId: item['instanceId'] as String?,
                ),
              ),
            );
        }
        _restoringDraft = false;
      });
      _queueDraft();
      if (data.needsHydration) {
        unawaited(_hydrateInventory());
        unawaited(_hydrateBook());
      }
      if (data.pending != null) {
        final receipt = await _service.recover(data.pending!['id'] as String);
        if (!mounted || _accountChanged) return;
        setState(() {
          _receipt = receipt != null && _purchaseDraft != null
              ? confirmedPurchaseReceipt(receipt, {
                  'id': data.pending!['id'],
                  'cart': data.pending!['cart'],
                })
              : receipt;
          _showCart = true;
        });
        if (receipt == null) {
          _message(
            _purchaseDraft != null
                ? 'A previous purchase needs verification. Retry the saved purchase before starting another deal.'
                : 'A previous sale needs verification. Retry it before starting another sale.',
          );
        }
      }
    } catch (_) {
      _message(
        'Could not open the sales desk. Check your connection and retry.',
      );
    } finally {
      _restoringDraft = false;
      if (mounted) setState(() => _loading = false);
    }
  }

  void _restoreDraft(Map<String, dynamic> d) {
    _restoringDraft = true;
    _negotiatedInputError = null;
    _negotiatedDraft = isNegotiatedDraft(d) ? validateNegotiatedDraft(d) : null;
    _agreedTrades.clear();
    if (isPurchaseDraft(d)) {
      _purchaseDraft = validatePurchaseDraft(d);
      _store.text = d['storeName'] as String;
      _lines.clear();
      _trades.clear();
      _restoringDraft = false;
      return;
    }
    _purchaseDraft = null;
    _store.text = d['storeName'] as String;
    _tax.text = _negotiated
        ? saleMoney(d['taxMinor'] as int)
        : d['tax'] as String;
    _note.text = d['note'] as String;
    _method = d['method'] as String;
    _payments = (d['payments'] as List?)
        ?.map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final customer = d['customer'] as Map;
    _name.text = customer['name'] as String;
    _email.text = customer['email'] as String;
    _phone.text = customer['phone'] as String;
    _wants.text = customer['wants'] as String;
    _customer = d['customerId'] == null
        ? null
        : {...Map<String, dynamic>.from(customer), 'id': d['customerId']};
    _lines
      ..clear()
      ..addAll(
        (d['items'] as List).map(
          (l) => SalesCartLine(
            description: l['description'] as String,
            unitMinor: l['unitMinor'] as int,
            quantity: l['quantity'] as int,
            instanceId: l['instanceId'] as String?,
            gvviId: l['gvviId'] as String?,
            imageUrl: (_negotiated ? l['image'] : l['imageUrl']) as String?,
            fallbackImageUrl: l['fallbackImageUrl'] as String?,
          ),
        ),
      );
    _trades
      ..clear()
      ..addAll(
        _negotiated
            ? <SalesTradeLine>[]
            : (d['trades'] as List).map(
                (t) => SalesTradeLine.fromJson(t as Map),
              ),
      );
    if (_negotiated) {
      _agreedTrades.addAll(
        (d['trades'] as List).map((t) => Map<String, dynamic>.from(t as Map)),
      );
    }
    _restoringDraft = false;
  }

  Map<String, dynamic> _negotiatedSnapshot() => validateNegotiatedDraft(
    {
      ..._negotiatedDraft!,
      'storeName': _store.text,
      'taxMinor': saleMoneyInput(_tax.text),
      'note': _note.text,
      'method': _method,
      'customerId': _customer?['id'],
      'customer': {
        'name': _name.text,
        'email': _email.text,
        'phone': _phone.text,
        'wants': _wants.text,
        'notes': _customer?['notes'] ?? _negotiatedDraft!['customer']['notes'],
      },
      'items': _lines
          .map(
            (l) => {
              ...l.toJson(),
              if (l.gvviId != null) 'gvviId': l.gvviId,
              if (l.imageUrl != null || l.fallbackImageUrl != null)
                'image': l.imageUrl ?? l.fallbackImageUrl,
            },
          )
          .toList(),
      'trades': _agreedTrades.map((t) => Map<String, dynamic>.from(t)).toList(),
      if (_payments != null)
        'payments': _payments!
            .map((p) => Map<String, dynamic>.from(p))
            .toList(),
    }..removeWhere((key, value) => key == 'payments' && _payments == null),
  );

  void _queueDraft() {
    if (_draftBook == null ||
        _restoringDraft ||
        _accountChanged ||
        _pending != null ||
        _receipt != null) {
      return;
    }
    Map<String, dynamic>? negotiated;
    if (_negotiated) {
      try {
        negotiated = _negotiatedSnapshot();
        _negotiatedInputError = null;
      } catch (_) {
        _negotiatedInputError =
            'Check the trade amounts and details. Keep this desk open until this edit saves.';
        return;
      }
    }
    final snapshot =
        negotiated ??
        _purchaseDraft ??
        {
          'id': _draftBook!['active'],
          'storeName': _store.text,
          'tax': _tax.text,
          'note': _note.text,
          'method': _method,
          if (_payments != null)
            'payments': _payments!
                .map((e) => Map<String, dynamic>.from(e))
                .toList(),
          'customerId': _customer?['id'],
          'customer': {
            'name': _name.text,
            'email': _email.text,
            'phone': _phone.text,
            'wants': _wants.text,
            'notes': _customer?['notes'] ?? '',
          },
          'items': _lines
              .map(
                (l) => {
                  ...l.toJson(),
                  'gvviId': l.gvviId,
                  'imageUrl': l.imageUrl,
                  'fallbackImageUrl': l.fallbackImageUrl,
                },
              )
              .toList(),
          'trades': _trades.map((t) => t.toJson()).toList(),
        };
    _draftBook = {
      ..._draftBook!,
      if (_negotiated) 'version': 3,
      if (_purchaseDraft != null && _draftBook!['version'] != 3) 'version': 2,
      'drafts': (_draftBook!['drafts'] as List)
          .map((d) => d['id'] == snapshot['id'] ? snapshot : d)
          .toList(),
    };
    final book = _draftBook!;
    _draftWrites = _draftWrites
        .then((_) => _service.saveDrafts(book))
        .then(
          (_) {
            _draftError = null;
          },
          onError: (Object error) {
            _draftError = error.toString();
            if (mounted && !_accountChanged) {
              _message(
                'Draft could not save. Keep this desk open and retry before leaving.',
              );
            }
          },
        );
  }

  Future<void> _flushDraft() async {
    _queueDraft();
    await _draftWrites;
    if (_negotiatedInputError != null) throw StateError(_negotiatedInputError!);
    if (_draftError != null) throw StateError(_draftError!);
  }

  void _edited(VoidCallback change) {
    setState(change);
    _queueDraft();
  }

  Future<void> _updatePurchaseDraft(
    Map<String, dynamic> Function(Map<String, dynamic>) update,
  ) async {
    if (_locked ||
        _purchaseDraft == null ||
        _data?.purchasesAvailable != true) {
      throw StateError(
        'This purchase is locked. Recover the saved request or reopen the desk.',
      );
    }
    final next = validatePurchaseDraft(update(_purchaseDraft!));
    setState(() => _purchaseDraft = next);
    await _flushDraft();
  }

  Future<void> _newPurchase({bool negotiated = false}) async {
    if (_locked ||
        _draftBook == null ||
        (negotiated
                ? _data?.negotiatedTradesAvailable
                : _data?.purchasesAvailable) !=
            true) {
      return;
    }
    setState(() => _editing = true);
    try {
      if (await _service.pendingCatalogAdd() != null) {
        throw StateError(
          'Recover the saved catalog add before starting a purchase.',
        );
      }
      await _flushDraft();
      if (!mounted || _accountChanged) return;
      final drafts = List<dynamic>.from(_draftBook!['drafts'] as List);
      if (drafts.length >= 20) {
        throw StateError('Resume a held deal before creating another.');
      }
      final draft = negotiated
          ? newNegotiatedDraft(newSaleId(), _store.text)
          : blankPurchaseDraft(newSaleId(), _store.text);
      final next = {
        ..._draftBook!,
        'version': negotiated || _draftBook!['version'] == 3 ? 3 : 2,
        'active': draft['id'],
        'drafts': [...drafts, draft],
      };
      await _service.saveDrafts(next);
      if (!mounted || _accountChanged) return;
      setState(() {
        _draftBook = next;
        _restoreDraft(draft);
        _dashboard = false;
        _catalogOpen = false;
        _tradeOpen = false;
      });
    } catch (error) {
      _message(error.toString());
    } finally {
      if (mounted) setState(() => _editing = false);
    }
  }

  Future<void> _heldDeals() async {
    if (_locked || _draftBook == null) return;
    try {
      if (await _service.pendingCatalogAdd() != null) {
        throw StateError(
          'Recover the saved catalog add before switching deals.',
        );
      }
      await _flushDraft();
      if (!mounted || _accountChanged) return;
      final choice = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Held deals'),
          content: SizedBox(
            width: 480,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Saved on this device. Holding a deal does not reserve online inventory.',
                  ),
                  for (final d in _draftBook!['drafts'] as List)
                    ListTile(
                      title: Text(
                        (d['customer']['name'] as String).isEmpty
                            ? isPurchaseDraft(d)
                                  ? 'Walk-up seller'
                                  : isNegotiatedDraft(d)
                                  ? 'Walk-up trader'
                                  : 'Walk-up customer'
                            : d['customer']['name'] as String,
                      ),
                      subtitle: Text(
                        isPurchaseDraft(d)
                            ? 'Buy · ${(d['items'] as List).length} incoming lines · USD ${saleMoney(purchaseDraftTotal(Map<String, dynamic>.from(d as Map)))}'
                            : '${isNegotiatedDraft(d) ? 'Trade · ' : ''}${(d['items'] as List).length} sale lines · ${(d['trades'] as List).length} trade lines',
                      ),
                      onTap: () => Navigator.pop(context, d['id'] as String),
                      trailing: IconButton(
                        tooltip: 'Discard draft',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () =>
                            Navigator.pop(context, 'discard:${d['id']}'),
                      ),
                    ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, 'new'),
              child: const Text('New deal'),
            ),
          ],
        ),
      );
      if (choice == null || !mounted || _accountChanged) return;
      var drafts = List<dynamic>.from(_draftBook!['drafts'] as List);
      String id = choice;
      if (choice.startsWith('discard:')) {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Discard this draft?'),
            content: const Text('Inventory and recorded sales are unchanged.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Keep draft'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Discard'),
              ),
            ],
          ),
        );
        if (confirmed != true || !mounted || _accountChanged) return;
        drafts = drafts.where((d) => d['id'] != choice.substring(8)).toList();
        if (drafts.isEmpty) {
          drafts = [blankSalesDraft(newSaleId(), _store.text)];
        }
        id = drafts.first['id'] as String;
      }
      if (choice == 'new') {
        if (drafts.length >= 20) {
          throw StateError('Resume a held deal before creating another.');
        }
        id = newSaleId();
        drafts = [...drafts, blankSalesDraft(id, _store.text)];
      }
      final next = {..._draftBook!, 'active': id, 'drafts': drafts};
      await _service.saveDrafts(next);
      if (!mounted || _accountChanged) return;
      setState(() {
        _draftBook = next;
        _restoreDraft(
          Map<String, dynamic>.from(
            drafts.firstWhere((d) => d['id'] == id) as Map,
          ),
        );
        _catalogOpen = false;
        _tradeOpen = false;
        _showCart = false;
      });
    } catch (error) {
      _message(error.toString());
    }
  }

  Future<void> _hydrateInventory() async {
    final generation = ++_inventoryGeneration;
    setState(() {
      _inventoryLoading = true;
      _inventoryError = null;
    });
    try {
      final rows = await _service.loadInventory();
      if (!mounted || _accountChanged || generation != _inventoryGeneration) {
        return;
      }
      // Preserve copies added while the initial read was in flight.
      final seen = rows.map((row) => row.instanceId).toSet();
      setState(
        () => _data = _data?.withRows([
          ...rows,
          ...?_data?.rows.where((row) => !seen.contains(row.instanceId)),
        ]),
      );
    } catch (_) {
      if (mounted && !_accountChanged && generation == _inventoryGeneration) {
        setState(
          () => _inventoryError =
              'Stock could not load. Catalog and quick items are still available.',
        );
      }
    } finally {
      if (mounted && generation == _inventoryGeneration) {
        setState(() => _inventoryLoading = false);
      }
    }
  }

  Future<void> _hydrateBook() async {
    final generation = _deskGeneration;
    setState(() {
      _historyLoading = true;
      _historyError = null;
    });
    try {
      final book = await _service.loadBook();
      if (!mounted || _accountChanged || generation != _deskGeneration) return;
      setState(() {
        _data = _data?.withBook(book);
        if (_store.text.isEmpty && _pending == null) {
          _store.text = book['storeName'] as String;
        }
      });
    } catch (_) {
      if (mounted && !_accountChanged) {
        setState(
          () => _historyError =
              'Customer history could not load. Enter this sale’s details or retry.',
        );
      }
    } finally {
      if (mounted) setState(() => _historyLoading = false);
    }
  }

  Future<void> _edit({
    VendorPricingWorkspaceRow? copy,
    int? index,
    bool scanned = false,
  }) async {
    if (_baseLocked || _tradeUnavailable || (_scanPending && !scanned)) return;
    if (index == null && _lines.length >= 50) {
      _message('A sale can contain up to 50 lines.');
      return;
    }
    if (copy != null &&
        _lines.any((line) => line.instanceId == copy.instanceId)) {
      _message('That exact copy is already in your cart.');
      return;
    }
    final old = index == null ? null : _lines[index];
    setState(() => _editing = true);
    final line = await showDialog<SalesCartLine>(
      context: context,
      builder: (_) =>
          _SaleLineDialog(copy: copy ?? _copyFor(old?.instanceId), line: old),
    );
    if (!mounted) return;
    setState(() => _editing = false);
    if (line == null || _accountChanged) return;
    _edited(() {
      if (index == null) {
        _lines.add(line);
      } else {
        _lines[index] = line;
      }
      _error = null;
    });
  }

  Future<void> _catalog() async {
    if (_entryLocked || _negotiated || _lines.length >= 50) return;
    setState(() {
      _catalogOpen = true;
      _tradeOpen = false;
    });
  }

  Widget _catalogPanel() => SalesCatalogDialog(
    service: _service,
    embedded: true,
    initialQuery: _search.text,
    onClose: () => setState(() => _catalogOpen = false),
    onBusyChanged: (busy) {
      if (mounted) setState(() => _catalogBusy = busy);
    },
    canAddToCart: () =>
        _lines.length < 50 && _pending == null && _receipt == null,
    onAdded: (result) async {
      if (!mounted || _accountChanged) return;
      _edited(() {
        if (result.line != null &&
            !_lines.any((line) => line.instanceId == result.instanceId)) {
          _lines.add(result.line!);
        }
      });
      await _flushDraft();
      unawaited(_refreshAddedCopy(result.instanceId));
    },
  );

  Future<void> _refreshAddedCopy(String instanceId) async {
    final generation = _inventoryGeneration;
    try {
      final rows = await _service.loadAddedCopy(instanceId);
      if (!mounted || _accountChanged || generation != _inventoryGeneration) {
        return;
      }
      setState(
        () => _data = _data?.withRows([
          ...rows,
          ...?_data?.rows.where((row) => row.instanceId != instanceId),
        ]),
      );
    } catch (_) {
      if (mounted && !_accountChanged) {
        setState(
          () => _error =
              'Copy added. Inventory preview could not refresh; use Refresh when ready. Your cart is kept.',
        );
      }
    }
  }

  Future<void> _addCopy(
    VendorPricingWorkspaceRow copy, {
    bool scanned = false,
  }) async {
    if (_baseLocked ||
        _tradeUnavailable ||
        (_scanPending && !scanned) ||
        _lines.length >= 50 ||
        _lines.any((line) => line.instanceId == copy.instanceId)) {
      return;
    }
    final price = copy.askingPrice;
    if (copy.currency != 'USD' ||
        price == null ||
        !price.isFinite ||
        price <= 0 ||
        price > 1000000) {
      await _edit(copy: copy, scanned: scanned);
      return;
    }
    final minor = (price * 100).round();
    if (minor <= 0) {
      await _edit(copy: copy, scanned: scanned);
      return;
    }
    _edited(() {
      _lines.add(
        SalesCartLine(
          description: copy.displayName,
          unitMinor: minor,
          instanceId: copy.instanceId,
          gvviId: copy.gvviId,
          imageUrl: copy.imageUrl,
          fallbackImageUrl: copy.fallbackImageUrl,
        ),
      );
      _error = null;
    });
  }

  Future<String> _addScan(String id, bool Function() current) async {
    final target = _draftBook?['active'], generation = _deskGeneration;
    final copy = await _service
        .loadScannedCopy(id)
        .timeout(const Duration(seconds: 15));
    if (!mounted ||
        !current() ||
        _baseLocked ||
        _tradeUnavailable ||
        _accountChanged ||
        generation != _deskGeneration ||
        target != _draftBook?['active']) {
      throw StateError('The deal changed. Scan again in the intended cart.');
    }
    if (copy == null) {
      throw StateError(
        'This copy is not in your active inventory. Check its QR label.',
      );
    }
    if (_lines.any((line) => line.instanceId == copy.instanceId)) {
      return '${copy.displayName} is already in this cart.';
    }
    if (_lines.length >= 50) {
      throw StateError('A sale can contain up to 50 lines.');
    }
    setState(() {
      _data = _data!.withRows([
        ..._data!.rows.where((row) => row.instanceId != copy.instanceId),
        copy,
      ]);
    });
    await _addCopy(copy, scanned: true);
    if (!mounted || _accountChanged) {
      throw StateError('Your account changed. Reopen the sales desk.');
    }
    await _flushDraft();
    final added = _lines.where((line) => line.instanceId == copy.instanceId);
    if (added.isEmpty) {
      throw StateError(
        'Card not added. Scan again when ready to enter its price.',
      );
    }
    return '${copy.displayName} added · \$${saleMoney(added.single.unitMinor)} · Draft saved';
  }

  Future<void> _trade({int? index}) async {
    if (_negotiated) {
      if (_entryLocked || (index == null && _agreedTrades.length >= 50)) return;
      setState(() => _editing = true);
      try {
        final line = await showDialog<Map<String, dynamic>>(
          context: context,
          builder: (_) => SalesPurchaseDialog(
            service: _service,
            negotiated: true,
            line: index == null ? null : _agreedTrades[index],
            canAdd: () =>
                !_accountChanged &&
                !_busy &&
                _pending == null &&
                !_tradeUnavailable,
          ),
        );
        if (!mounted || _accountChanged || line == null) return;
        final checked = validateNegotiatedTradeLine(line);
        _edited(() {
          if (index == null) {
            _agreedTrades.add(checked);
          } else {
            _agreedTrades[index] = checked;
          }
          _error = null;
        });
        await _flushDraft();
      } catch (error) {
        _message(error.toString());
      } finally {
        if (mounted) setState(() => _editing = false);
      }
      return;
    }
    if (_locked ||
        _data?.tradesAvailable != true ||
        (index == null && _trades.length >= 50)) {
      return;
    }
    if (index == null) {
      setState(() {
        _tradeOpen = true;
        _catalogOpen = false;
        _showCart = false;
      });
      return;
    }
    setState(() => _editing = true);
    final line = await showDialog<SalesTradeLine>(
      context: context,
      builder: (_) => SalesTradeDialog(service: _service, line: _trades[index]),
    );
    if (!mounted) return;
    _edited(() {
      _editing = false;
      if (line != null && !_accountChanged) {
        _trades[index] = line;
        _error = null;
      }
    });
  }

  Widget _tradeSummary(int total) {
    if (_negotiated) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final trade in _agreedTrades)
            Text(
              '${trade['quantity']} × ${trade['description']} · USD ${saleMoney(trade['creditMinor'] as int)} agreed credit',
            ),
          Text('Outgoing total: USD ${saleMoney(total)}'),
          Text('Agreed trade credit: USD ${saleMoney(_credit)}'),
          Text(
            '${total < _credit
                ? 'Pay customer'
                : total == _credit
                ? 'Even trade'
                : 'Receive'}: USD ${saleMoney((total - _credit).abs())}',
          ),
        ],
      );
    }
    final credit = _trades.fold<int>(0, (n, t) => n + t.creditMinor);
    final balance = total - credit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final trade in _trades)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  trade.description,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (trade.condition != null)
                  Text('Condition: ${trade.condition}'),
                Text(
                  '${trade.quantity} × USD ${saleMoney(trade.valueMinor)} × ${tradeRate(trade.rateBps)}% = USD ${saleMoney(trade.creditMinor)} credit',
                ),
              ],
            ),
          ),
        const Divider(),
        Text('Purchase total: USD ${saleMoney(total)}'),
        Text('Trade credit: − USD ${saleMoney(credit)}'),
        const SizedBox(height: 8),
        Text(
          balance < 0
              ? 'Pay customer: USD ${saleMoney(-balance)}'
              : balance == 0
              ? 'Even trade · no money due'
              : 'Customer pays: USD ${saleMoney(balance)}',
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ],
    );
  }

  Future<bool> _preparePurchase() async {
    if (_data?.purchasesAvailable != true || _purchaseDraft == null) {
      _message('New purchases are unavailable. Your held offer is kept.');
      return false;
    }
    setState(() => _editing = true);
    try {
      if (await _service.pendingCatalogAdd() != null) {
        throw StateError(
          'Recover the saved catalog add before completing this purchase.',
        );
      }
      await _flushDraft();
      final draft = _purchaseDraft!;
      // Validate before review, then retain this exact snapshot through confirmation.
      final request = purchaseDraftRequest(draft, newSaleId(), confirmed: true);
      if (!mounted || _accountChanged) return false;
      final total = purchaseDraftTotal(draft);
      final copies = (draft['items'] as List)
          .where((dynamic line) => line['addToVault'] == true)
          .length;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Record this purchase?'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Paid to seller: USD ${saleMoney(total)}'),
                for (final payment in request['cart']['payments'] as List)
                  Text(
                    '${payment['method']}: USD ${saleMoney(payment['amountMinor'] as int)}',
                  ),
                const SizedBox(height: 16),
                Text(
                  'Confirm you received the items and paid the seller. $copies incoming copies will be added to your Vault with their agreed USD cost. This records the exchange and does not move money.',
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Back'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Exchange completed · Record purchase'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted || _accountChanged) return false;
      setState(() => _pending = {...request, 'draftId': draft['id']});
      return true;
    } catch (error) {
      _message(error.toString());
      return false;
    } finally {
      if (mounted) setState(() => _editing = false);
    }
  }

  Future<bool> _prepareNegotiated() async {
    if (_tradeUnavailable || !_negotiated) {
      _message('New trades are unavailable. Your held agreement is kept.');
      return false;
    }
    setState(() => _editing = true);
    try {
      if (await _service.pendingCatalogAdd() != null) {
        throw StateError(
          'Recover the saved catalog add before completing this trade.',
        );
      }
      await _flushDraft();
      final draft = _negotiatedSnapshot();
      final request = negotiatedDraftRequest(draft, newSaleId(), true);
      if (!mounted || _accountChanged) return false;
      final balance = negotiatedDraftTotals(draft)['balance']!;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Record this trade?'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${balance < 0
                      ? 'Pay customer'
                      : balance == 0
                      ? 'Even trade'
                      : 'Receive'}: USD ${saleMoney(balance.abs())}',
                ),
                ...salesPaymentLines({
                  'payments': salesPaymentSnapshot(
                    (request['cart']['payments'] as List)
                        .map((p) => Map<String, dynamic>.from(p as Map))
                        .toList(),
                    balance,
                  ),
                  'method': request['cart']['method'],
                  'totalMinor': negotiatedDraftTotals(draft)['total'],
                  'tradeIn': {'balanceMinor': balance},
                }, (n) => 'USD ${saleMoney(n)}').map(Text.new),
                const SizedBox(height: 16),
                Text(
                  'Confirm the cards and money have been exchanged. ${_agreedTrades.where((t) => t['addToVault'] == true).length} incoming copies will be added with their agreed credit as USD cost; ${_lines.where((l) => l.instanceId != null).length} outgoing copies will be marked sold. Grookai records the exchange and does not move money.',
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Back'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Exchange completed · Record trade'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted || _accountChanged) return false;
      setState(() => _pending = {...request, 'draftId': draft['id']});
      return true;
    } catch (error) {
      _message(error.toString());
      return false;
    } finally {
      if (mounted) setState(() => _editing = false);
    }
  }

  Future<void> _complete() async {
    if (_scanPending ||
        _busy ||
        _receipt != null ||
        _accountChanged ||
        _catalogBusy ||
        _editing) {
      return;
    }
    if (_pending == null &&
        _purchaseDraft != null &&
        !await _preparePurchase()) {
      return;
    }
    if (_pending == null && _negotiated && !await _prepareNegotiated()) return;
    if (!mounted || _accountChanged) return;
    if (_pending == null) {
      final tax = saleMoneyInput(_tax.text);
      if (_store.text.trim().isEmpty || _lines.isEmpty || tax == null) {
        _message(
          'Enter your store name, add at least one item, and check the tax amount.',
        );
        return;
      }
      final total = _lines.fold<int>(
        tax,
        (sum, line) => sum + line.quantity * line.unitMinor,
      );
      if (total > 100000000) {
        _message('A sale must be no more than USD 1,000,000.');
        return;
      }
      final credit = _trades.fold<int>(0, (n, t) => n + t.creditMinor);
      if (credit > 100000000 ||
          _trades.fold<int>(0, (n, t) => n + t.valueMinor * t.quantity) >
              100000000 ||
          (_trades.isNotEmpty && _note.text.trim().length > 350)) {
        _message(
          'Trade value and credit must be at most USD 1,000,000. Trade receipts allow a note up to 350 characters.',
        );
        return;
      }
      final balance = total - credit;
      if (_payments != null) {
        try {
          if (_data?.paymentsAvailable != true) {
            throw StateError(
              'Split payments are unavailable. Keep this deal saved and retry later.',
            );
          }
          salesPaymentSnapshot(_payments!, balance);
        } catch (error) {
          _message(error.toString());
          return;
        }
      }

      setState(() => _editing = true);
      try {
        if (_draftBook != null && await _service.pendingCatalogAdd() != null) {
          throw StateError(
            'Recover the saved catalog add before completing this deal.',
          );
        }
        await _flushDraft();
      } catch (error) {
        if (mounted) setState(() => _editing = false);
        _message(error.toString());
        return;
      }
      if (!mounted || _accountChanged) return;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(
            _trades.isEmpty ? 'Record this sale?' : 'Review the full deal',
          ),
          content: _payments != null
              ? SizedBox(
                  width: 540,
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_trades.isNotEmpty) _tradeSummary(total),
                        ...salesPaymentLines({
                          'payments': salesPaymentSnapshot(_payments!, balance),
                          'method': salesPaymentMethod(_payments!),
                          'totalMinor': total,
                          if (_trades.isNotEmpty)
                            'tradeIn': {'balanceMinor': balance},
                        }, (n) => 'USD ${saleMoney(n)}').map(
                          (line) => Text(line),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Confirm the cards and money have been exchanged. ${_lines.where((l) => l.instanceId != null).length} outgoing copies will be marked sold. This records the exchange and does not move money.',
                        ),
                      ],
                    ),
                  ),
                )
              : _trades.isNotEmpty
              ? SizedBox(
                  width: 540,
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _tradeSummary(total),
                        const SizedBox(height: 16),
                        Text(
                          'Confirm the trade cards have been received${balance > 0
                              ? ' and USD ${saleMoney(balance)} received by $_method'
                              : balance < 0
                              ? ' and USD ${saleMoney(-balance)} paid to the customer by $_method'
                              : ''}. '
                          '${_trades.where((t) => t.addToVault).length} incoming copies will be added to your Vault; '
                          '${_lines.where((l) => l.instanceId != null).length} outgoing copies will be marked sold. '
                          'This records the exchange and does not move money.',
                        ),
                      ],
                    ),
                  ),
                )
              : Text(
                  'Confirm you received USD ${saleMoney(total)} by $_method. '
                  '${_lines.where((l) => l.instanceId != null).length} Vault copies will be marked sold and one receipt saved. '
                  'This does not charge a card.',
                ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Back'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(
                _trades.isNotEmpty
                    ? 'Exchange completed · Record deal'
                    : 'Payment received · Record sale',
              ),
            ),
          ],
        ),
      );
      if (mounted) setState(() => _editing = false);
      if (confirmed != true || !mounted || _accountChanged) return;
      _pending = {
        'id': newSaleId(),
        if (_draftBook != null) 'draftId': _draftBook!['active'],
        'cart': {
          'version': _payments != null
              ? 3
              : _trades.isEmpty
              ? 1
              : 2,
          if (_trades.isNotEmpty || _payments != null)
            'trades': _trades.map((t) => t.toJson()).toList(),
          'storeName': _store.text.trim(),
          'items': _lines.map((line) => line.toJson()).toList(),
          'method': _payments == null
              ? _method
              : salesPaymentMethod(_payments!),
          if (_payments != null)
            'payments': _payments!
                .map((e) => Map<String, dynamic>.from(e))
                .toList(),
          'taxMinor': tax,
          'note': _note.text.trim(),
          'customerId': _customer?['id'],
          'customer': {
            'name': _name.text.trim(),
            'email': _email.text.trim(),
            'phone': _phone.text.trim(),
            'wants': _wants.text.trim(),
            'notes': '',
          },
        },
      };
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Persist the exact id and payload before any request can reach the server.
      await _service.stage(_pending!);
      final receipt = await _service.complete(_pending!);
      if (mounted && !_accountChanged) {
        setState(() {
          _receipt = _purchaseDraft == null
              ? receipt
              : confirmedPurchaseReceipt(receipt, {
                  'id': _pending!['id'],
                  'cart': _pending!['cart'],
                });
          _showCart = true;
        });
      }
    } on PostgrestException catch (error) {
      if (_pending?['cart']?['version'] == 5) {
        _message(
          'Trade status is unconfirmed. Keep and recover this exact request before starting another trade.',
        );
        return;
      }
      // These are authoritative transaction failures, not lost HTTP responses.
      if (const {
        '22023',
        'PT409',
        '23514',
        '23505',
        'P0002',
        '42501',
      }.contains(error.code)) {
        try {
          await _service.clearPending(_pending!['id'] as String);
          if (mounted) setState(() => _pending = null);
        } catch (_) {
          /* Keep the exact pending payload when local recovery fails. */
        }
        _message(
          _purchaseDraft != null
              ? 'The purchase was not recorded. Review availability and amounts, then try again. Your offer is still here.'
              : 'The sale was not recorded. Review availability and amounts, then try again. Your cart is still here.',
        );
      } else {
        _message(
          _purchaseDraft != null
              ? 'Purchase status is unconfirmed. Retry this same purchase to recover its receipt without recording it twice.'
              : 'Sale status is unconfirmed. Retry this same sale to recover its receipt without recording it twice.',
        );
      }
    } catch (_) {
      _message(
        _negotiated
            ? 'Trade status is unconfirmed. Retry this same trade to recover its receipt without recording it twice.'
            : _purchaseDraft != null
            ? 'Purchase status is unconfirmed. Retry this same purchase to recover its receipt without recording it twice.'
            : 'Sale status is unconfirmed. Retry this same sale to recover its receipt without recording it twice.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _newSale() async {
    if (_busy || _receipt == null || _pending == null) return;
    setState(() => _busy = true);
    try {
      if (_draftBook != null) {
        final completed = _pending!['draftId'] ?? _draftBook!['active'];
        var drafts = (_draftBook!['drafts'] as List)
            .where((d) => d['id'] != completed)
            .toList();
        if (drafts.isEmpty) {
          drafts = [blankSalesDraft(newSaleId(), _store.text)];
        }
        final next = {
          ..._draftBook!,
          'active': drafts.first['id'],
          'drafts': drafts,
        };
        await _service.saveDrafts(next);
        _draftBook = next;
      }
      await _service.clearPending(_pending!['id'] as String);
      if (!mounted || _accountChanged) return;
      setState(() {
        _restoringDraft = true;
        _purchaseDraft = null;
        _negotiatedDraft = null;
        _agreedTrades.clear();
        _negotiatedInputError = null;
        _lines.clear();
        _trades.clear();
        _payments = null;
        _method = 'Cash';
        _pending = null;
        _receipt = null;
        _customer = null;
        _name.clear();
        _email.clear();
        _phone.clear();
        _wants.clear();
        _note.clear();
        _tax.text = '0.00';
        _catalogOpen = false;
        _tradeOpen = false;
        _showCart = false;
      });
      await _load();
    } catch (_) {
      _message('The receipt is saved. Retry starting a new sale.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _chooseCustomer() async {
    final customer = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _CustomerPicker(customers: _data?.customers ?? []),
    );
    if (customer == null || !mounted) return;
    _edited(() {
      _customer = customer;
      _name.text = customer['name'] as String;
      _email.text = customer['email'] as String;
      _phone.text = customer['phone'] as String;
      _wants.text = customer['wants'] as String;
    });
  }

  Widget _field(
    TextEditingController controller,
    String label,
    int limit, {
    TextInputType? keyboard,
    bool readOnly = false,
    ValueChanged<String>? onChanged,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextField(
      controller: controller,
      enabled: !_entryLocked,
      readOnly: readOnly,
      keyboardType: keyboard,
      maxLength: limit,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        counterText: '',
        border: const OutlineInputBorder(),
      ),
    ),
  );

  Widget _entryPanel() {
    final selector = _entryModeSelector();
    if (_catalogOpen || _tradeOpen) {
      return Column(
        children: [
          selector,
          Expanded(child: _inventory()),
        ],
      );
    }
    return _inventory(header: [_scannerInput(), selector]);
  }

  Widget _scannerInput() => SalesScannerInput(
    disabled:
        !_workspaceActive ||
        _baseLocked ||
        _tradeUnavailable ||
        _data?.available != true ||
        _catalogOpen ||
        _tradeOpen,
    target: '$_deskGeneration:${_draftBook?['active']}',
    add: _addScan,
    pending: (value) {
      if (mounted) setState(() => _pendingScans += value);
    },
  );

  Widget _entryModeSelector() => Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
    child: SegmentedButton<String>(
      segments: [
        const ButtonSegment(
          value: 'stock',
          label: Text('Your stock'),
          icon: Icon(Icons.style_outlined),
        ),
        if (!_negotiated)
          const ButtonSegment(
            value: 'catalog',
            label: Text('Catalog'),
            icon: Icon(Icons.search),
          ),
        if (_negotiated
            ? _data?.negotiatedTradesAvailable == true
            : _data?.tradesAvailable == true)
          const ButtonSegment(
            value: 'trade',
            label: Text('Trade-in'),
            icon: Icon(Icons.swap_horiz),
          ),
      ],
      selected: {
        _tradeOpen
            ? 'trade'
            : _catalogOpen
            ? 'catalog'
            : 'stock',
      },
      onSelectionChanged: _entryLocked
          ? null
          : (values) {
              switch (values.first) {
                case 'catalog':
                  unawaited(_catalog());
                case 'trade':
                  unawaited(_trade());
                default:
                  setState(() {
                    _catalogOpen = false;
                    _tradeOpen = false;
                  });
              }
            },
    ),
  );

  Widget _inventory({List<Widget> header = const []}) {
    if (_tradeOpen) {
      return SalesTradeDialog(
        service: _service,
        embedded: true,
        onClose: () => setState(() => _tradeOpen = false),
        canAdd: () => !_entryLocked && _trades.length < 50,
        onAdded: (line) => _edited(() => _trades.add(line)),
      );
    }
    if (_catalogOpen) return _catalogPanel();
    final query = _search.text.trim().toLowerCase();
    final rows = (_data?.rows ?? <VendorPricingWorkspaceRow>[])
        .where((row) => salesCopyMatches(row, query))
        .toList();
    final textScale = MediaQuery.textScalerOf(context).scale(14) / 14;
    return CustomScrollView(
      key: const Key('sales-stock-scroll'),
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            children: [
              ...header,
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Your cards. Ready to sell.',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Tap or drag to add at your saved USD price. Edit the price in your cart.',
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _search,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        labelText: 'Find a card, GV-ID or copy ID',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _entryLocked ? null : () => _edit(),
                      icon: const Icon(Icons.add),
                      label: const Text('Quick-add unlisted item'),
                    ),
                    if (_inventoryLoading) const LinearProgressIndicator(),
                    if (_inventoryError != null)
                      TextButton(
                        onPressed: _hydrateInventory,
                        child: Text('$_inventoryError Retry stock'),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        rows.isEmpty
            ? SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text(
                    _inventoryLoading
                        ? 'Loading your stock… You can use catalog search or Quick-add now.'
                        : query.isEmpty
                        ? 'No Vault cards yet. Use Quick-add to start a sale.'
                        : 'No matching copies.',
                  ),
                ),
              )
            : SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                sliver: SliverGrid.builder(
                  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: textScale >= 1.5 ? 460 : 230,
                    mainAxisExtent:
                        420 + (textScale > 1 ? (textScale - 1) * 170 : 0),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: rows.length,
                  itemBuilder: (context, index) {
                    final row = rows[index],
                        selected = _lines.any(
                          (line) => line.instanceId == rows[index].instanceId,
                        );
                    final card = Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: _entryLocked || selected
                            ? null
                            : () => _addCopy(row),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Center(
                                  child: AspectRatio(
                                    aspectRatio: .69,
                                    child: CardSurfaceArtwork(
                                      label: row.displayName,
                                      imageUrl: row.imageUrl,
                                      fallbackImageUrl: row.fallbackImageUrl,
                                      enableTapToZoom: false,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                row.displayName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleSmall,
                              ),
                              Text(
                                '${row.conditionLabel} · ${row.printingLabel}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                row.gvviId,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                              const SizedBox(height: 6),
                              SalesVendorPrice(copy: row),
                              SalesTcgplayerLink(
                                reference: salesCopyReference(row),
                              ),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton.tonalIcon(
                                  onPressed: _entryLocked || selected
                                      ? null
                                      : () => _addCopy(row),
                                  icon: Icon(
                                    selected
                                        ? Icons.check
                                        : Icons.add_shopping_cart,
                                    size: 18,
                                  ),
                                  label: Text(
                                    selected ? 'In cart' : 'Add to sale',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                    return LongPressDraggable<VendorPricingWorkspaceRow>(
                      key: ValueKey('drag-${row.instanceId}'),
                      data: row,
                      maxSimultaneousDrags: _entryLocked || selected ? 0 : 1,
                      feedback: Material(
                        elevation: 12,
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          width: 140,
                          height: 210,
                          child: Padding(
                            padding: const EdgeInsets.all(8),
                            child: CardSurfaceArtwork(
                              label: row.displayName,
                              imageUrl: row.imageUrl,
                              fallbackImageUrl: row.fallbackImageUrl,
                              enableTapToZoom: false,
                            ),
                          ),
                        ),
                      ),
                      childWhenDragging: Opacity(opacity: .35, child: card),
                      child: card,
                    );
                  },
                ),
              ),
      ],
    );
  }

  Widget _cart() {
    if (_receipt != null) return _receiptView();
    final subtotal = _lines.fold<int>(
      0,
      (sum, line) => sum + line.unitMinor * line.quantity,
    );
    return ListView(
      key: const Key('sales-cart-scroll'),
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          _negotiated ? 'Your trade' : 'Sale cart',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        OutlinedButton.icon(
          onPressed: _lines.isEmpty || _busy || _scanPending
              ? null
              : _customerView,
          icon: const Icon(Icons.visibility_outlined),
          label: const Text('Customer view'),
        ),
        const SizedBox(height: 8),
        if (_pending != null) ...[
          Text(
            _negotiated
                ? 'This trade is preserved for recovery. Retry the same request to check or finish it.'
                : 'This sale is preserved for recovery. Retry the same request to check or finish it.',
          ),
          const SizedBox(height: 12),
          Text(
            '${((_pending!['cart'] as Map)['items'] as List).length} sale lines pending verification',
          ),
        ],
        if (_lines.isEmpty && _pending == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text('Add Vault cards or quick-add an item to begin.'),
          ),
        for (var i = 0; i < _lines.length; i++) _cartLine(i),
        OutlinedButton.icon(
          onPressed: _entryLocked ? null : () => _edit(),
          icon: const Icon(Icons.add),
          label: const Text('Quick-add item'),
        ),
        const Divider(height: 32),
        if (_negotiated) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  'Customer trade-ins',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              OutlinedButton.icon(
                onPressed: _entryLocked || _agreedTrades.length >= 50
                    ? null
                    : () => _trade(),
                icon: const Icon(Icons.swap_horiz),
                label: const Text('Add trade-in'),
              ),
            ],
          ),
          for (var i = 0; i < _agreedTrades.length; i++)
            Card(
              child: ListTile(
                title: Text(_agreedTrades[i]['description'] as String),
                subtitle: Text(
                  '${_agreedTrades[i]['quantity']} item(s) · USD ${saleMoney(_agreedTrades[i]['creditMinor'] as int)} agreed credit for this line${_agreedTrades[i]['addToVault'] == true ? ' · add to Vault' : ''}',
                ),
                onTap: _entryLocked ? null : () => _trade(index: i),
                trailing: IconButton(
                  tooltip: 'Remove trade ${i + 1}',
                  icon: const Icon(Icons.close),
                  onPressed: _entryLocked
                      ? null
                      : () => _edited(() => _agreedTrades.removeAt(i)),
                ),
              ),
            ),
          const Divider(height: 32),
        ],
        if (!_negotiated &&
            (_data?.tradesAvailable == true || _trades.isNotEmpty)) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  'Customer trade-ins',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              OutlinedButton.icon(
                onPressed: _entryLocked || _trades.length >= 50
                    ? null
                    : () => _trade(),
                icon: const Icon(Icons.swap_horiz),
                label: const Text('Add trade-in'),
              ),
            ],
          ),
          for (var i = 0; i < _trades.length; i++)
            Card(
              child: ListTile(
                title: Text(_trades[i].description),
                subtitle: Text(
                  '${_trades[i].quantity} × USD ${saleMoney(_trades[i].valueMinor)} at ${tradeRate(_trades[i].rateBps)}%\n'
                  'USD ${saleMoney(_trades[i].creditMinor)} trade credit${_trades[i].addToVault ? ' · add to Vault' : ''}',
                ),
                onTap: _entryLocked ? null : () => _trade(index: i),
                trailing: IconButton(
                  tooltip: 'Remove trade ${i + 1}',
                  icon: const Icon(Icons.close),
                  onPressed: _entryLocked
                      ? null
                      : () => _edited(() => _trades.removeAt(i)),
                ),
              ),
            ),
          const Divider(height: 32),
        ],
        _field(_store, 'Store name on receipt', 120),
        if (_data?.paymentsAvailable == true || _payments != null)
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Split payment / cash change'),
            value: _payments != null,
            onChanged: _entryLocked
                ? null
                : (enabled) => _edited(
                    () => _payments = enabled
                        ? (_balance == 0
                              ? []
                              : [
                                  {
                                    'method': _method,
                                    'amountMinor': _balance.abs(),
                                    'tenderedMinor': _balance.abs(),
                                  },
                                ])
                        : null,
                  ),
          ),
        if (_payments != null)
          SalesPaymentEditor(
            key: ValueKey(_draftBook?['active']),
            entries: _payments!,
            balance: _balance,
            disabled: _entryLocked,
            onChanged: (entries) => _edited(() => _payments = entries),
          ),
        if (_payments == null)
          DropdownButtonFormField<String>(
            initialValue: _method,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Payment / payout method',
              border: OutlineInputBorder(),
            ),
            items:
                const [
                      'Cash',
                      'Card (external terminal)',
                      'Bank / payment app',
                      'Other',
                    ]
                    .map(
                      (method) =>
                          DropdownMenuItem(value: method, child: Text(method)),
                    )
                    .toList(),
            onChanged: _entryLocked
                ? null
                : (value) => _edited(() => _method = value!),
          ),
        const SizedBox(height: 12),
        _field(
          _tax,
          'Tax collected (USD)',
          10,
          keyboard: const TextInputType.numberWithOptions(decimal: true),
          onChanged: (_) => setState(() {}),
        ),
        Text('Subtotal: USD ${saleMoney(subtotal)}'),
        if (_negotiated || _trades.isNotEmpty)
          _tradeSummary(subtotal + (saleMoneyInput(_tax.text) ?? 0)),
        if (!_negotiated && _trades.isEmpty)
          Text(
            'Total: USD ${saleMoney(subtotal + (saleMoneyInput(_tax.text) ?? 0))}',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        const SizedBox(height: 20),
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: const Text('Customer & receipt details'),
          subtitle: Text(
            _customer?['name'] as String? ??
                'Optional · build your customer book',
          ),
          children: [
            if (_customer == null)
              TextButton.icon(
                onPressed: _entryLocked ? null : _chooseCustomer,
                icon: const Icon(Icons.person_search),
                label: const Text('Choose saved customer'),
              ),
            if (_customer != null)
              TextButton(
                onPressed: _entryLocked
                    ? null
                    : () => _edited(() {
                        _customer = null;
                        _name.clear();
                        _email.clear();
                        _phone.clear();
                        _wants.clear();
                      }),
                child: const Text('Use a new customer instead'),
              ),
            _field(_name, 'Customer name', 120, readOnly: _customer != null),
            _field(
              _email,
              'Email',
              254,
              keyboard: TextInputType.emailAddress,
              readOnly: _customer != null,
            ),
            _field(
              _phone,
              'Phone',
              40,
              keyboard: TextInputType.phone,
              readOnly: _customer != null,
            ),
            _field(
              _wants,
              'Cards they are looking for',
              1000,
              readOnly: _customer != null,
            ),
            _field(
              _note,
              _negotiated ? 'Private trade note' : 'Receipt note',
              !_negotiated && _trades.isEmpty ? 500 : 350,
            ),
          ],
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed:
              _scanPending ||
                  _busy ||
                  (_pending == null &&
                      (_lines.isEmpty ||
                          _data?.available != true ||
                          (_negotiated &&
                              (_tradeUnavailable || _agreedTrades.isEmpty))))
              ? null
              : _complete,
          icon: _busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.receipt_long),
          label: Text(
            _busy
                ? 'Saving deal…'
                : _pending != null
                ? (_negotiated
                      ? 'Retry / recover this trade'
                      : 'Retry / recover this sale')
                : (_negotiated
                      ? 'Review & record trade'
                      : 'Review & record sale'),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          _negotiated
              ? 'Exchange cards and settle the balance using cash or your own terminal. Recording the trade saves one account receipt and the selected incoming and outgoing copies.'
              : 'Collect payment using cash or your own terminal. Recording a sale marks selected Vault copies sold and saves one account receipt.',
        ),
      ],
    );
  }

  Future<void> _customerView() async {
    if (_negotiated) {
      try {
        final view = negotiatedDraftCustomerView(_negotiatedSnapshot());
        await showDialog<void>(
          context: context,
          barrierColor: Theme.of(context).colorScheme.surface,
          builder: (context) => AlertDialog(
            title: Text(view['storeName'] as String),
            content: SizedBox(
              width: 600,
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final line in view['items'] as List)
                      ListTile(
                        title: Text(line['description'] as String),
                        subtitle: Text(
                          '${line['quantity']} × USD ${saleMoney(line['unitMinor'] as int)}',
                        ),
                        trailing: Text(
                          'USD ${saleMoney((line['quantity'] as int) * (line['unitMinor'] as int))}',
                        ),
                      ),
                    for (final line in view['trades'] as List)
                      ListTile(
                        title: Text('Trade-in · ${line['description']}'),
                        subtitle: Text(
                          '${line['quantity']} item(s) · Agreed credit',
                        ),
                        trailing: Text(
                          '− USD ${saleMoney(line['creditMinor'] as int)}',
                        ),
                      ),
                    Text(
                      'Tax recorded: USD ${saleMoney(view['taxMinor'] as int)}',
                    ),
                    Text(
                      '${(view['balance'] as int) < 0 ? 'You receive' : 'You pay'} USD ${saleMoney((view['balance'] as int).abs())}',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const Text('Deal preview · payment not confirmed'),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back to trade desk'),
              ),
            ],
          ),
        );
      } catch (error) {
        _message(error.toString());
      }
      return;
    }
    final subtotal = _lines.fold<int>(
      0,
      (n, line) => n + line.unitMinor * line.quantity,
    );
    final tax = saleMoneyInput(_tax.text) ?? 0;
    final credit = _trades.fold<int>(0, (n, line) => n + line.creditMinor);
    final balance = subtotal + tax - credit;
    await showDialog<void>(
      context: context,
      barrierColor: Theme.of(context).colorScheme.surface,
      builder: (context) => AlertDialog(
        title: Text(_store.text.isEmpty ? 'Your deal' : _store.text),
        content: SizedBox(
          width: 600,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final line in _lines)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: line.imageUrl == null
                        ? null
                        : SizedBox(
                            width: 48,
                            height: 68,
                            child: CardSurfaceArtwork(
                              label: line.description,
                              imageUrl: line.imageUrl,
                              fallbackImageUrl: line.fallbackImageUrl,
                              enableTapToZoom: false,
                            ),
                          ),
                    title: Text(line.description),
                    subtitle: Text(
                      '${line.quantity} × USD ${saleMoney(line.unitMinor)}',
                    ),
                    trailing: Text(
                      'USD ${saleMoney(line.quantity * line.unitMinor)}',
                    ),
                  ),
                for (final trade in _trades)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Trade-in · ${trade.description}'),
                    subtitle: Text(
                      '${trade.quantity} × USD ${saleMoney(trade.valueMinor)} × ${tradeRate(trade.rateBps)}%',
                    ),
                    trailing: Text('− USD ${saleMoney(trade.creditMinor)}'),
                  ),
                const Divider(),
                Text('Tax recorded: USD ${saleMoney(tax)}'),
                const SizedBox(height: 16),
                Text(
                  '${balance < 0 ? 'You receive' : 'You pay'} USD ${saleMoney(balance.abs())}',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text('Deal preview · payment not confirmed'),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Back to sales desk'),
          ),
        ],
      ),
    );
  }

  Widget _dropCart({required Widget child, bool compact = false}) =>
      DragTarget<VendorPricingWorkspaceRow>(
        key: ValueKey(compact ? 'cart-drop-compact' : 'cart-drop'),
        onWillAcceptWithDetails: (details) =>
            !_entryLocked &&
            _lines.length < 50 &&
            !_lines.any((line) => line.instanceId == details.data.instanceId),
        onAcceptWithDetails: (details) {
          if (compact) setState(() => _showCart = true);
          unawaited(_addCopy(details.data));
        },
        builder: (context, candidates, rejected) => AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          decoration: BoxDecoration(
            color: candidates.isEmpty
                ? null
                : Theme.of(context).colorScheme.primaryContainer,
            border: Border.all(
              width: 2,
              color: candidates.isEmpty
                  ? Colors.transparent
                  : Theme.of(context).colorScheme.primary,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Material(type: MaterialType.transparency, child: child),
        ),
      );

  VendorPricingWorkspaceRow? _copyFor(String? instanceId) {
    if (instanceId == null) return null;
    for (final copy in _data?.rows ?? <VendorPricingWorkspaceRow>[]) {
      if (copy.instanceId == instanceId) return copy;
    }
    return null;
  }

  Widget _cartLine(int index) {
    final line = _lines[index];
    final copy = _copyFor(line.instanceId);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            if (line.instanceId != null)
              SizedBox(
                width: 46,
                height: 66,
                child: CardSurfaceArtwork(
                  label: line.description,
                  imageUrl: line.imageUrl,
                  fallbackImageUrl: line.fallbackImageUrl,
                  enableTapToZoom: false,
                ),
              ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    line.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (copy != null) SalesVendorPrice(copy: copy),
                  Text(
                    'Checkout: ${line.quantity} × USD ${saleMoney(line.unitMinor)}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (copy != null)
                    SalesTcgplayerLink(reference: salesCopyReference(copy)),
                  Text(
                    line.gvviId ?? 'Quick-added item',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ],
              ),
            ),
            Column(
              children: [
                IconButton(
                  tooltip: 'Edit sale line',
                  onPressed: _entryLocked ? null : () => _edit(index: index),
                  icon: const Icon(Icons.edit_outlined),
                ),
                IconButton(
                  tooltip: 'Remove sale line',
                  onPressed: _entryLocked
                      ? null
                      : () => _edited(() => _lines.removeAt(index)),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _receiptView() => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      const Icon(Icons.check_circle, size: 56, color: Colors.green),
      const SizedBox(height: 12),
      Text(
        _purchaseDraft != null
            ? 'Purchase recorded'
            : _negotiated
            ? 'Trade recorded'
            : 'Sale recorded',
        style: Theme.of(context).textTheme.headlineMedium,
      ),
      Text(
        _purchaseDraft != null
            ? 'Your purchase receipt is saved. Selected incoming copies and their agreed USD costs are recorded.'
            : 'Your receipt is saved to your account. Selected Vault copies are marked sold.',
      ),
      const SizedBox(height: 24),
      SelectableText(saleReceiptText(_receipt!)),
      const SizedBox(height: 24),
      if (_purchaseDraft == null)
        ReceiptDeliveryPanel(
          key: ValueKey(_receipt!['id']),
          receiptId: _receipt!['id'] as String,
          email: _customer?['email'] as String? ?? _email.text,
          phone: _customer?['phone'] as String? ?? _phone.text,
        ),
      Builder(
        builder: (context) => FilledButton.icon(
          onPressed: () async {
            try {
              final box = context.findRenderObject()! as RenderBox;
              await SharePlus.instance.share(
                ShareParams(
                  text: saleReceiptText(_receipt!),
                  subject: 'Receipt ${_receipt!['number']}',
                  sharePositionOrigin:
                      box.localToGlobal(Offset.zero) & box.size,
                ),
              );
            } catch (_) {
              _message(
                'Sharing could not open. You can copy the receipt instead.',
              );
            }
          },
          icon: const Icon(Icons.ios_share),
          label: const Text('Share receipt · text or email'),
        ),
      ),
      TextButton.icon(
        onPressed: () async {
          await Clipboard.setData(
            ClipboardData(text: saleReceiptText(_receipt!)),
          );
          _message('Receipt copied.');
        },
        icon: const Icon(Icons.copy),
        label: const Text('Copy receipt'),
      ),
      TextButton(
        onPressed: () async {
          if (!await launchUrl(
            Uri.parse('https://grookaivault.com/account/store/receipts/start'),
            mode: LaunchMode.externalApplication,
          )) {
            _message('Could not open the account receipt desk.');
          }
        },
        child: const Text('All receipts & customers'),
      ),
      const SizedBox(height: 12),
      FilledButton(
        onPressed: _busy ? null : _newSale,
        child: Text(
          _purchaseDraft != null || _negotiated
              ? 'Continue to deals'
              : 'Start next sale',
        ),
      ),
    ],
  );

  Future<bool> _prepareToLeave() async {
    if (_scanPending) {
      _message('Wait for the current scan before leaving.');
      return false;
    }
    if (_draftBook != null && !_locked) {
      try {
        await _flushDraft();
        return true;
      } catch (_) {
        _message(
          _negotiatedInputError ??
              'Draft could not save. Keep this desk open and retry before leaving.',
        );
        return false;
      }
    }
    if ((_lines.isEmpty &&
            _trades.isEmpty &&
            _agreedTrades.isEmpty &&
            (_purchaseDraft?['items'] as List? ?? []).isEmpty) ||
        _pending != null ||
        _receipt != null) {
      return true;
    }
    final leave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave this cart?'),
        content: const Text(
          'This sale has not been recorded. Leaving clears the unsold cart.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep selling'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
    if (leave == true && context.mounted) {
      setState(() {
        _lines.clear();
        _trades.clear();
      });
    }
    return leave == true;
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop:
        _workspaceExits != null ||
        (!_scanPending &&
            ((!_negotiated &&
                    _lines.isEmpty &&
                    _trades.isEmpty &&
                    (_purchaseDraft?['items'] as List? ?? []).isEmpty) ||
                _pending != null ||
                _receipt != null)),
    onPopInvokedWithResult: (didPop, result) async {
      if (didPop || _workspaceExits != null) return;
      if (await _prepareToLeave() && context.mounted) {
        Navigator.of(context).pop();
      }
    },
    child: _accountChanged
        ? const Scaffold(
            body: SafeArea(
              child: Center(
                child: Text(
                  'Your account changed. Close and reopen the sales desk.',
                ),
              ),
            ),
          )
        : Scaffold(
            appBar: AppBar(
              title: Text(_negotiated ? 'Trade desk' : 'Sales desk'),
              actions: [
                if (_draftBook != null &&
                    _data?.negotiatedTradesAvailable == true)
                  IconButton(
                    tooltip: 'New trade',
                    onPressed: _locked
                        ? null
                        : () => _newPurchase(negotiated: true),
                    icon: const Icon(Icons.swap_horiz),
                  ),
                if (_draftBook != null && _data?.purchasesAvailable == true)
                  IconButton(
                    tooltip: 'New buy',
                    onPressed: _locked ? null : _newPurchase,
                    icon: const Icon(Icons.add_shopping_cart),
                  ),
                if (_draftBook != null)
                  IconButton(
                    tooltip: 'Held deals',
                    onPressed: _locked ? null : _heldDeals,
                    icon: const Icon(Icons.pause_circle_outline),
                  ),
                IconButton(
                  tooltip: _dashboard ? 'Back to selling' : 'Sales dashboard',
                  onPressed: _data == null || _busy || _scanPending
                      ? null
                      : () => setState(() => _dashboard = !_dashboard),
                  icon: Icon(
                    _dashboard ? Icons.point_of_sale : Icons.insights_outlined,
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh cards',
                  onPressed: _loading || _locked ? null : _load,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
            body: SafeArea(
              child: Column(
                children: [
                  if (_error != null)
                    MaterialBanner(
                      content: Text(_error!),
                      actions: [
                        TextButton(
                          onPressed: () => setState(() => _error = null),
                          child: const Text('Dismiss'),
                        ),
                      ],
                    ),
                  if (_tradeUnavailable && _pending == null)
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: Text(
                        'New trades are unavailable. Your held trade is kept on this device.',
                      ),
                    ),
                  if (_historyLoading) const LinearProgressIndicator(),
                  if (_historyError != null && _pending == null)
                    TextButton(
                      onPressed: _hydrateBook,
                      child: Text('$_historyError Retry history'),
                    ),
                  Expanded(
                    child: _loading
                        ? const Center(child: CircularProgressIndicator())
                        : _data == null
                        ? Center(
                            child: FilledButton(
                              onPressed: _load,
                              child: const Text('Retry'),
                            ),
                          )
                        : !_data!.available &&
                              _pending == null &&
                              _purchaseDraft == null &&
                              !_negotiated
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Text(
                                'The sales desk is not available yet. Existing Vendor Mode sales and receipts are unchanged.',
                              ),
                            ),
                          )
                        : _dashboard
                        ? SalesDashboard(
                            receipts: [...?_data?.receipts, ?_receipt],
                            refresh: _load,
                          )
                        : _purchaseDraft != null
                        ? _receipt != null
                              ? _receiptView()
                              : SalesPurchasePanel(
                                  key: ValueKey(_purchaseDraft!['id']),
                                  draft: _purchaseDraft!,
                                  service: _service,
                                  edit: _updatePurchaseDraft,
                                  onReview: _complete,
                                  locked: _locked,
                                  busy: _busy,
                                  pending: _pending != null,
                                  available: _data!.purchasesAvailable,
                                  customers: _data!.customers,
                                )
                        : LayoutBuilder(
                            builder: (context, constraints) {
                              if (constraints.maxWidth >= 900) {
                                return Row(
                                  children: [
                                    Expanded(child: _entryPanel()),
                                    const VerticalDivider(width: 1),
                                    SizedBox(
                                      width: 390,
                                      child: _dropCart(child: _cart()),
                                    ),
                                  ],
                                );
                              }
                              return Column(
                                children: [
                                  if (!_showCart)
                                    _dropCart(
                                      compact: true,
                                      child: ListTile(
                                        leading: const Icon(
                                          Icons.shopping_cart_outlined,
                                        ),
                                        title: Text(
                                          'Drop here to add · ${_lines.length} in cart',
                                        ),
                                        trailing: const Icon(
                                          Icons.chevron_right,
                                        ),
                                        onTap: _scanPending
                                            ? null
                                            : () => setState(
                                                () => _showCart = true,
                                              ),
                                      ),
                                    ),
                                  Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: SegmentedButton<bool>(
                                      segments: [
                                        const ButtonSegment(
                                          value: false,
                                          label: Text('Cards'),
                                          icon: Icon(Icons.style_outlined),
                                        ),
                                        ButtonSegment(
                                          value: true,
                                          label: Text(
                                            'Cart (${_lines.length})',
                                          ),
                                          icon: const Icon(
                                            Icons.shopping_cart_outlined,
                                          ),
                                        ),
                                      ],
                                      selected: {_showCart},
                                      onSelectionChanged: _scanPending
                                          ? null
                                          : (values) => setState(
                                              () => _showCart = values.single,
                                            ),
                                    ),
                                  ),
                                  Expanded(
                                    child: _showCart ? _cart() : _entryPanel(),
                                  ),
                                ],
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),
  );
}

class _SaleLineDialog extends StatefulWidget {
  const _SaleLineDialog({this.copy, this.line});
  final VendorPricingWorkspaceRow? copy;
  final SalesCartLine? line;
  @override
  State<_SaleLineDialog> createState() => _SaleLineDialogState();
}

class _SaleLineDialogState extends State<_SaleLineDialog> {
  late final _description = TextEditingController(
    text: widget.line?.description ?? widget.copy?.displayName ?? '',
  );
  late final _price = TextEditingController(
    text: widget.line == null ? '' : saleMoney(widget.line!.unitMinor),
  );
  late final _quantity = TextEditingController(
    text: '${widget.line?.quantity ?? 1}',
  );
  String? _error;
  bool get _exact => widget.copy != null || widget.line?.instanceId != null;
  @override
  void dispose() {
    _description.dispose();
    _price.dispose();
    _quantity.dispose();
    super.dispose();
  }

  void _save() {
    final price = saleMoneyInput(_price.text),
        quantity = int.tryParse(_quantity.text);
    if (_description.text.trim().isEmpty ||
        price == null ||
        price <= 0 ||
        quantity == null ||
        quantity < 1 ||
        quantity > 999) {
      setState(
        () => _error =
            'Enter an item name, positive price and quantity from 1 to 999.',
      );
      return;
    }
    Navigator.pop(
      context,
      SalesCartLine(
        description: _description.text.trim(),
        unitMinor: price,
        quantity: _exact ? 1 : quantity,
        instanceId: widget.copy?.instanceId ?? widget.line?.instanceId,
        gvviId: widget.copy?.gvviId ?? widget.line?.gvviId,
        imageUrl: widget.copy?.imageUrl ?? widget.line?.imageUrl,
        fallbackImageUrl:
            widget.copy?.fallbackImageUrl ?? widget.line?.fallbackImageUrl,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(_exact ? 'Add card to sale' : 'Quick-add item'),
    content: SizedBox(
      width: 420,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_exact) Text(widget.copy?.gvviId ?? widget.line!.gvviId ?? ''),
            if (!_exact)
              const Text(
                'Sell an item without adding it to your Vault or publishing a listing.',
              ),
            const SizedBox(height: 16),
            if (widget.copy != null) ...[
              SalesVendorPrice(copy: widget.copy!),
              SalesTcgplayerLink(reference: salesCopyReference(widget.copy!)),
              const Text(
                'Check the set, card number, finish and condition on TCGplayer.',
              ),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _description,
              autofocus: !_exact,
              maxLength: 200,
              decoration: const InputDecoration(labelText: 'Card / item name'),
            ),
            TextField(
              controller: _price,
              autofocus: _exact,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Actual sale price (USD)',
              ),
              onSubmitted: (_) => _save(),
            ),
            if (widget.copy?.askingPrice != null &&
                widget.copy?.currency == 'USD')
              TextButton(
                onPressed: () =>
                    _price.text = widget.copy!.askingPrice!.toStringAsFixed(2),
                child: Text(
                  'Use asking price: USD ${widget.copy!.askingPrice!.toStringAsFixed(2)}',
                ),
              ),
            if (!_exact)
              TextField(
                controller: _quantity,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quantity'),
              ),
            if (_error != null)
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(onPressed: _save, child: const Text('Add to cart')),
    ],
  );
}

class _CustomerPicker extends StatefulWidget {
  const _CustomerPicker({required this.customers});
  final List<Map<String, dynamic>> customers;
  @override
  State<_CustomerPicker> createState() => _CustomerPickerState();
}

class _CustomerPickerState extends State<_CustomerPicker> {
  String _query = '';
  @override
  Widget build(BuildContext context) {
    final matches = widget.customers
        .where(
          (c) => '${c['name']} ${c['email']} ${c['phone']}'
              .toLowerCase()
              .contains(_query.toLowerCase()),
        )
        .take(100)
        .toList();
    return AlertDialog(
      title: const Text('Saved customers'),
      content: SizedBox(
        width: 420,
        height: 400,
        child: Column(
          children: [
            TextField(
              decoration: const InputDecoration(
                labelText: 'Name, email or phone',
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
            Expanded(
              child: matches.isEmpty
                  ? const Center(child: Text('No matching customers.'))
                  : ListView.builder(
                      itemCount: matches.length,
                      itemBuilder: (context, index) {
                        final c = matches[index];
                        return ListTile(
                          title: Text(c['name'] as String),
                          subtitle: Text('${c['email']} ${c['phone']}'),
                          onTap: () => Navigator.pop(context, c),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}
