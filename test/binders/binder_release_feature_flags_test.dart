import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/binders/binder_feature_flags.dart';

void main() {
  test('production release exposes only activated Binder phases', () {
    const flags = BinderFeatureFlags.production;

    expect(flags.schema, isTrue);
    expect(flags.personalAvailable, isTrue);
    expect(flags.sharedAvailable, isTrue);
    expect(flags.viewLinksAvailable, isTrue);
    expect(flags.publicAvailable, isTrue);
    expect(flags.communityAvailable, isTrue);
    expect(flags.templatesAvailable, isTrue);
    expect(flags.customBindersAvailable, isTrue);

    expect(flags.notificationsAvailable, isFalse);
    expect(flags.pulseSharingAvailable, isFalse);
    expect(flags.setBindersAvailable, isFalse);
  });
}
