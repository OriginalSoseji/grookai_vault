import 'intake_models.dart';

class IntakeAllocation {
  const IntakeAllocation({
    required this.costs,
    required this.allocatedCents,
    required this.remainingCents,
    required this.issues,
  });
  final Map<String, List<int?>> costs;
  final int allocatedCents;
  final int? remainingCents;
  final List<String> issues;
  bool get valid => issues.isEmpty;
}

/// Integer-only allocation, with deterministic largest-remainder rounding.
IntakeAllocation allocateIntakeCosts({
  required List<IntakeItem> items,
  int? availableCents,
  int reserveCents = 0,
}) {
  final costs = <String, List<int?>>{};
  final issues = <String>[];
  final active = items.where((i) => i.isConfirmed && !i.isSaved).toList();
  var locked = 0;
  for (final item in active) {
    if (item.quantity < 1 || item.quantity > 100) {
      issues.add('Invalid quantity for ${item.selected?.name}.');
      continue;
    }
    final manual = item.manualTotalCents;
    if (manual != null) {
      if (manual < 0) {
        issues.add('Intake costs cannot be negative.');
        continue;
      }
      costs[item.id] = List.generate(
        item.quantity,
        (i) => manual ~/ item.quantity + (i < manual % item.quantity ? 1 : 0),
      );
      locked += manual;
    } else {
      costs[item.id] = List<int?>.filled(item.quantity, null);
    }
  }
  if (availableCents == null) {
    return IntakeAllocation(
      costs: costs,
      allocatedCents: locked,
      remainingCents: null,
      issues: issues,
    );
  }
  if (reserveCents < 0 ||
      reserveCents > availableCents ||
      locked + reserveCents > availableCents) {
    issues.add(
      'Locked costs and retained reserve exceed the available lot cost.',
    );
    return IntakeAllocation(
      costs: costs,
      allocatedCents: locked,
      remainingCents: availableCents - locked,
      issues: issues,
    );
  }
  final unpriced = active
      .where(
        (i) => i.manualTotalCents == null && (i.referenceValueCents ?? 0) <= 0,
      )
      .toList();
  if (unpriced.isNotEmpty && availableCents > 0 && reserveCents == 0) {
    issues.add(
      'Enter a cost for unpriced cards or retain a reserve for their unknown costs.',
    );
  }
  final weighted = <({String id, int copy, int weight})>[];
  for (final item in active.where(
    (i) => i.manualTotalCents == null && (i.referenceValueCents ?? 0) > 0,
  )) {
    for (var i = 0; i < item.quantity; i++) {
      weighted.add((id: item.id, copy: i, weight: item.referenceValueCents!));
    }
  }
  final budget = availableCents - reserveCents - locked;
  if (availableCents == 0) {
    for (final item in active) {
      costs[item.id] = List.filled(item.quantity, 0);
    }
  } else if (budget > 0 && weighted.isEmpty) {
    issues.add(
      'No usable reference values. Enter costs manually or reserve the unallocated amount.',
    );
  } else if (weighted.isNotEmpty && budget > 0) {
    final totalWeight = weighted.fold<BigInt>(
      BigInt.zero,
      (n, c) => n + BigInt.from(c.weight),
    );
    final remainders = <({String id, int copy, BigInt remainder})>[];
    var assigned = 0;
    for (final entry in weighted) {
      final numerator = BigInt.from(budget) * BigInt.from(entry.weight);
      final amount = (numerator ~/ totalWeight).toInt();
      costs[entry.id]![entry.copy] = amount;
      assigned += amount;
      remainders.add((
        id: entry.id,
        copy: entry.copy,
        remainder: numerator % totalWeight,
      ));
    }
    remainders.sort((a, b) {
      final c = b.remainder.compareTo(a.remainder);
      return c != 0 ? c : '${a.id}:${a.copy}'.compareTo('${b.id}:${b.copy}');
    });
    for (var i = 0; i < budget - assigned; i++) {
      final entry = remainders[i];
      costs[entry.id]![entry.copy] = costs[entry.id]![entry.copy]! + 1;
    }
  }
  final allocated = costs.values
      .expand((v) => v)
      .fold<int>(0, (n, v) => n + (v ?? 0));
  return IntakeAllocation(
    costs: costs,
    allocatedCents: allocated,
    remainingCents: availableCents - allocated,
    issues: issues,
  );
}
