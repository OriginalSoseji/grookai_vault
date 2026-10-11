import 'dart:async';
import 'package:grookai_vault/services/vault/copy_cost_review_service.dart';

const reviewOwner = '11111111-1111-4111-8111-111111111111';
String reviewId(int index) =>
    '22222222-2222-4222-8222-${index.toString().padLeft(12, '0')}';
Map<String, Object?> reviewCost(
  String status, {
  String? amount,
  String? currency,
  String? minor,
}) => {
  'status': status,
  'amount': amount,
  'currency': currency,
  'minor': minor,
};
Map<String, Object?> reviewRow(
  int index, {
  Map<String, Object?>? cost,
  bool archived = false,
}) => {
  'instanceId': reviewId(index),
  'archived': archived,
  'cost': cost ?? reviewCost('missing_amount'),
};

class ReviewGateway implements CopyCostReviewGateway {
  @override
  String? ownerId = reviewOwner;
  final changes = StreamController<String?>.broadcast(sync: true);
  @override
  Stream<String?> get ownerChanges => changes.stream;
  final calls = <List<String>>[];
  final rows = <Map<String, Object?>>[];
  Future<Object?> Function(List<String>)? respond;
  bool fail = false;
  @override
  Future<Object?> read(List<String> ids) async {
    calls.add(List.of(ids));
    if (fail) throw StateError('Private transport detail');
    if (respond != null) return respond!(ids);
    return {
      'ownerId': ownerId,
      'editEnabled': true,
      'copies': rows.where((row) => ids.contains(row['instanceId'])).toList(),
    };
  }

  void change(String? owner) {
    ownerId = owner;
    changes.add(owner);
  }
}
