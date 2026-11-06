import 'dart:math';
import '../scanner_v5/scanner_v5_identity_service.dart';

const intakeCurrencies = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'NZD', 'CHF'];

bool intakeJsonEqual(dynamic left, dynamic right) {
  if (left is Map && right is Map) {
    return left.length == right.length &&
        left.keys.every(
          (key) =>
              right.containsKey(key) && intakeJsonEqual(left[key], right[key]),
        );
  }
  if (left is List && right is List) {
    return left.length == right.length &&
        List.generate(
          left.length,
          (i) => i,
        ).every((i) => intakeJsonEqual(left[i], right[i]));
  }
  return left == right;
}

String newIntakeId() {
  final random = Random.secure();
  final bytes = List.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

int? parseIntakeMoney(String text) {
  final raw = text.trim();
  if (raw.contains(',') &&
      !RegExp(r'^\d{1,3}(,\d{3})+(\.\d{1,2})?$').hasMatch(raw)) {
    throw const FormatException('Use commas only as thousands separators.');
  }
  final value = raw.replaceAll(',', '');
  if (value.isEmpty) return null;
  if (!RegExp(r'^\d+(\.\d{1,2})?$').hasMatch(value)) {
    throw const FormatException(
      'Enter a positive amount with up to two decimal places.',
    );
  }
  final parts = value.split('.');
  final cents =
      BigInt.parse(parts.first) * BigInt.from(100) +
      BigInt.parse((parts.length == 2 ? parts[1] : '').padRight(2, '0'));
  if (cents > BigInt.from(100000000000)) {
    throw const FormatException('Amount is too large.');
  }
  return cents.toInt();
}

String intakeMoney(int? cents, [String currency = 'USD']) =>
    cents == null ? 'Unknown' : '$currency ${(cents / 100).toStringAsFixed(2)}';
String intakeAmount(int? cents) =>
    cents == null ? '' : (cents / 100).toStringAsFixed(2);
String intakeDate(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

class PurchaseLot {
  PurchaseLot({
    String? id,
    required this.name,
    DateTime? purchasedOn,
    this.currency = 'USD',
    this.totalCostCents,
    int? reserveCents,
    this.isComplete = false,
    this.source = '',
    this.notes = '',
    List<String>? tags,
    this.revision = 0,
  }) : id = id ?? newIntakeId(),
       purchasedOn = purchasedOn ?? DateTime.now(),
       reserveCents = reserveCents ?? totalCostCents ?? 0,
       tags = tags ?? [];
  final String id;
  String name;
  DateTime purchasedOn;
  String currency;
  int? totalCostCents;
  int reserveCents;
  bool isComplete;
  String source;
  String notes;
  List<String> tags;
  int revision;
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'purchased_on': intakeDate(purchasedOn),
    'currency': currency,
    'total_cost_cents': totalCostCents,
    'reserve_cents': reserveCents,
    'is_complete': isComplete,
    'source': source,
    'notes': notes,
    'tags': tags,
    'revision': revision,
  };
  factory PurchaseLot.fromJson(Map<String, dynamic> j) => PurchaseLot(
    id: j['id'] as String,
    name: j['name'] as String,
    purchasedOn: DateTime.parse(j['purchased_on'] as String),
    currency: j['currency'] as String,
    totalCostCents: (j['total_cost_cents'] as num?)?.toInt(),
    reserveCents: (j['reserve_cents'] as num?)?.toInt(),
    isComplete: j['is_complete'] == true,
    source: (j['source'] as String?) ?? '',
    notes: (j['notes'] as String?) ?? '',
    tags: List<String>.from(j['tags'] ?? []),
    revision: (j['revision'] as num?)?.toInt() ?? 0,
  );
}

class IntakeCaptureJob {
  IntakeCaptureJob({
    String? id,
    required this.imagePath,
    this.remotePath,
    this.multiple = false,
    this.state = 'pending',
    this.error,
  }) : id = id ?? newIntakeId();
  final String id;
  String imagePath;
  String? remotePath;
  bool multiple;
  String state;
  String? error;
  Map<String, dynamic> toJson() => {
    'id': id,
    'image_path': imagePath,
    'remote_path': remotePath,
    'multiple': multiple,
    'state': state,
    'error': error,
  };
  factory IntakeCaptureJob.fromJson(Map<String, dynamic> j) => IntakeCaptureJob(
    id: j['id'] as String,
    imagePath: j['image_path'] as String,
    remotePath: j['remote_path'] as String?,
    multiple: j['multiple'] == true,
    state: j['state'] as String? ?? 'pending',
    error: j['error'] as String?,
  );
}

class IntakeItem {
  IntakeItem({
    String? id,
    required this.captureId,
    required this.imagePath,
    this.remotePath,
    this.state = 'needs_review',
    List<ScannerV5Candidate>? candidates,
    this.selected,
    this.quantity = 1,
    this.condition = 'Unspecified',
    this.cardPrintingId,
    this.finishLabel,
    this.notes = '',
    this.manualTotalCents,
    this.referenceValueCents,
    this.referenceSource,
    this.referenceAt,
    List<int?>? copyCostsCents,
    Map<String, dynamic>? allocation,
    List<String>? savedInstanceIds,
  }) : id = id ?? newIntakeId(),
       candidates = candidates ?? [],
       copyCostsCents = copyCostsCents ?? [],
       allocation = allocation ?? {},
       savedInstanceIds = savedInstanceIds ?? [];
  final String id;
  final String captureId;
  String imagePath;
  String? remotePath;
  String state;
  List<ScannerV5Candidate> candidates;
  ScannerV5Candidate? selected;
  int quantity;
  String condition;
  String? cardPrintingId;
  String? finishLabel;
  String notes;
  int? manualTotalCents;
  int? referenceValueCents;
  String? referenceSource;
  DateTime? referenceAt;
  List<int?> copyCostsCents;
  Map<String, dynamic> allocation;
  List<String> savedInstanceIds;
  bool get isSaved => savedInstanceIds.isNotEmpty || state == 'saved';
  bool get isConfirmed => selected?.cardId != null && state == 'confirmed';
  Map<String, dynamic> toJson() => {
    'id': id,
    'capture_id': captureId,
    'image_path': imagePath,
    'remote_path': remotePath,
    'state': state,
    'candidates': candidates.map(_candidateJson).toList(),
    'selected': selected == null ? null : _candidateJson(selected!),
    'card_id': selected?.cardId,
    'name': selected?.name,
    'set_code': selected?.setCode,
    'quantity': quantity,
    'condition': condition,
    'card_printing_id': cardPrintingId,
    'finish_label': finishLabel,
    'notes': notes,
    'manual_total_cents': manualTotalCents,
    'reference_value_cents': referenceValueCents,
    'reference_source': referenceSource,
    'reference_at': referenceAt?.toIso8601String(),
    'copy_costs_cents': copyCostsCents,
    'allocation': allocation,
    'saved_instance_ids': savedInstanceIds,
  };
  factory IntakeItem.fromJson(Map<String, dynamic> j) => IntakeItem(
    id: j['id'] as String,
    captureId: j['capture_id'] as String,
    imagePath: j['image_path'] as String,
    remotePath: j['remote_path'] as String?,
    state: j['state'] as String? ?? 'needs_review',
    candidates: (j['candidates'] as List? ?? [])
        .map(
          (r) =>
              ScannerV5Candidate.fromJson(Map<String, dynamic>.from(r as Map)),
        )
        .toList(),
    selected: j['selected'] is Map
        ? ScannerV5Candidate.fromJson(
            Map<String, dynamic>.from(j['selected'] as Map),
          )
        : null,
    quantity: (j['quantity'] as num?)?.toInt() ?? 1,
    condition: j['condition'] as String? ?? 'Unspecified',
    cardPrintingId: j['card_printing_id'] as String?,
    finishLabel: j['finish_label'] as String?,
    notes: j['notes'] as String? ?? '',
    manualTotalCents: (j['manual_total_cents'] as num?)?.toInt(),
    referenceValueCents: (j['reference_value_cents'] as num?)?.toInt(),
    referenceSource: j['reference_source'] as String?,
    referenceAt: DateTime.tryParse(j['reference_at']?.toString() ?? ''),
    copyCostsCents: (j['copy_costs_cents'] as List? ?? [])
        .map((v) => (v as num?)?.toInt())
        .toList(),
    allocation: Map<String, dynamic>.from(j['allocation'] as Map? ?? {}),
    savedInstanceIds: List<String>.from(j['saved_instance_ids'] ?? []),
  );
}

Map<String, dynamic> _candidateJson(ScannerV5Candidate c) => {
  ...c.toSessionJson(),
  'image_url': c.imageUrl,
};

class IntakeBatch {
  IntakeBatch({
    String? id,
    required this.title,
    required this.userId,
    this.lotId,
    this.currency = 'USD',
    DateTime? acquiredOn,
    DateTime? acquiredAt,
    int? acquiredUtcOffsetMinutes,
    List<String>? tags,
    List<IntakeCaptureJob>? jobs,
    List<IntakeItem>? items,
    this.revision = 0,
    this.state = 'draft',
    this.retainedReserveCents = 0,
    this.allocationReviewed = false,
    DateTime? createdAt,
  }) : id = id ?? newIntakeId(),
       acquiredOn = acquiredOn ?? DateTime.now(),
       tags = tags ?? [],
       jobs = jobs ?? [],
       items = items ?? [],
       createdAt = createdAt ?? DateTime.now() {
    if ((acquiredAt == null) != (acquiredUtcOffsetMinutes == null)) {
      throw ArgumentError('Incomplete acquisition date metadata');
    }
    final localDay = DateTime(
      this.acquiredOn.year,
      this.acquiredOn.month,
      this.acquiredOn.day,
    );
    this.acquiredAt = acquiredAt ?? localDay.toUtc();
    this.acquiredUtcOffsetMinutes =
        acquiredUtcOffsetMinutes ?? localDay.timeZoneOffset.inMinutes;
  }
  final String id;
  final String userId;
  String title;
  String? lotId;
  String currency;
  DateTime acquiredOn;
  late final DateTime acquiredAt;
  late final int acquiredUtcOffsetMinutes;
  List<String> tags;
  List<IntakeCaptureJob> jobs;
  List<IntakeItem> items;
  int revision;
  String state;
  int retainedReserveCents;
  bool allocationReviewed;
  final DateTime createdAt;
  int get copyCount => items
      .where((i) => i.state != 'removed')
      .fold(0, (n, i) => n + i.quantity);
  int get reviewCount => items.where((i) => i.state == 'needs_review').length;
  int get pendingCount =>
      jobs.where((j) => j.state == 'pending' || j.state == 'processing').length;
  Map<String, dynamic> toJson() => {
    'id': id,
    'user_id': userId,
    'title': title,
    'lot_id': lotId,
    'currency': currency,
    'acquired_on': intakeDate(acquiredOn),
    'acquired_at': acquiredAt.toUtc().toIso8601String(),
    'acquired_utc_offset_minutes': acquiredUtcOffsetMinutes,
    'tags': tags,
    'revision': revision,
    'state': state,
    'retained_reserve_cents': retainedReserveCents,
    'allocation_reviewed': allocationReviewed,
    'created_at': createdAt.toUtc().toIso8601String(),
    'jobs': jobs.map((j) => j.toJson()).toList(),
    'items': items.map((i) => i.toJson()).toList(),
  };
  factory IntakeBatch.fromJson(Map<String, dynamic> j) => IntakeBatch(
    id: j['id'] as String,
    userId: j['user_id'] as String,
    title: j['title'] as String,
    lotId: j['lot_id'] as String?,
    currency: j['currency'] as String? ?? 'USD',
    acquiredOn: DateTime.parse(j['acquired_on'] as String),
    acquiredAt: j['acquired_at'] == null
        ? null
        : DateTime.parse(j['acquired_at'] as String),
    acquiredUtcOffsetMinutes: j['acquired_utc_offset_minutes'] as int?,
    tags: List<String>.from(j['tags'] ?? []),
    revision: (j['revision'] as num?)?.toInt() ?? 0,
    state: j['state'] as String? ?? 'draft',
    retainedReserveCents: (j['retained_reserve_cents'] as num?)?.toInt() ?? 0,
    allocationReviewed: j['allocation_reviewed'] == true,
    createdAt: DateTime.tryParse(j['created_at']?.toString() ?? ''),
    jobs: (j['jobs'] as List? ?? [])
        .map(
          (v) => IntakeCaptureJob.fromJson(Map<String, dynamic>.from(v as Map)),
        )
        .toList(),
    items: (j['items'] as List? ?? [])
        .map((v) => IntakeItem.fromJson(Map<String, dynamic>.from(v as Map)))
        .toList(),
  );
}
