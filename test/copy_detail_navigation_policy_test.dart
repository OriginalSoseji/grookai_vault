import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/navigation/copy_detail_navigation_policy.dart';

void main() {
  test(
    'returns to the exact source copy instead of pushing a duplicate route',
    () {
      expect(
        CopyDetailNavigationPolicy.shouldReturnToSource(
          openedFromCopyDetail: true,
          sourceGvviId: 'GVVI-ONE',
          targetGvviId: ' GVVI-ONE ',
        ),
        isTrue,
      );
    },
  );

  test('does not return to a different collector copy', () {
    expect(
      CopyDetailNavigationPolicy.shouldReturnToSource(
        openedFromCopyDetail: true,
        sourceGvviId: 'GVVI-THEIRS',
        targetGvviId: 'GVVI-MINE',
      ),
      isFalse,
    );
  });

  test('card-level copy management returns without requiring one GVVI', () {
    expect(
      CopyDetailNavigationPolicy.shouldReturnToSource(
        openedFromCopyDetail: true,
        sourceGvviId: null,
        targetGvviId: null,
      ),
      isTrue,
    );
  });

  test('normal card entry continues to push copy detail', () {
    expect(
      CopyDetailNavigationPolicy.shouldReturnToSource(
        openedFromCopyDetail: false,
        sourceGvviId: 'GVVI-ONE',
        targetGvviId: 'GVVI-ONE',
      ),
      isFalse,
    );
  });
}
