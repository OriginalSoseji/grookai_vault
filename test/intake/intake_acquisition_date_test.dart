import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';

void main() {
  test(
    'reviewed acquisition instant survives draft serialization across device time zones',
    () {
      final batch = IntakeBatch(
        title: 'Historical intake',
        userId: 'owner',
        acquiredOn: DateTime(2020, 1, 15),
        acquiredAt: DateTime.parse('2020-01-15T07:00:00Z'),
        acquiredUtcOffsetMinutes: -420,
      );
      final restored = IntakeBatch.fromJson(batch.toJson());
      expect(restored.toJson()['acquired_on'], '2020-01-15');
      expect(restored.acquiredAt, DateTime.utc(2020, 1, 15, 7));
      expect(restored.acquiredUtcOffsetMinutes, -420);
      expect(restored.toJson(), batch.toJson());
    },
  );
  test(
    'a new local calendar date captures its own offset and start of day',
    () {
      final day = DateTime(2020, 1, 15);
      final batch = IntakeBatch(
        title: 'Date review',
        userId: 'owner',
        acquiredOn: DateTime(2020, 1, 15, 17),
      );
      expect(batch.acquiredAt, day.toUtc());
      expect(batch.acquiredUtcOffsetMinutes, day.timeZoneOffset.inMinutes);
      expect(batch.toJson()['acquired_on'], '2020-01-15');
    },
  );
  test(
    'incomplete stored date metadata is rejected instead of being guessed',
    () {
      expect(
        () => IntakeBatch(
          title: 'Invalid date',
          userId: 'owner',
          acquiredAt: DateTime.utc(2020),
        ),
        throwsArgumentError,
      );
    },
  );
}
