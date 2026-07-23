/// Independent, compile-time Binder rollout gates.
///
/// Every gate is deliberately off by default. Enabling a later phase without
/// its prerequisites does not make it available.
class BinderFeatureFlags {
  const BinderFeatureFlags({
    required this.schema,
    required this.personal,
    required this.shared,
    required this.viewLinks,
    required this.publicBinders,
    required this.community,
    required this.templates,
    required this.notifications,
    required this.pulseSharing,
    required this.setBinders,
    required this.customBinders,
  });

  static const BinderFeatureFlags production = BinderFeatureFlags(
    schema: bool.fromEnvironment('BINDERS_SCHEMA_V1', defaultValue: false),
    personal: bool.fromEnvironment('BINDERS_PERSONAL_V1', defaultValue: false),
    shared: bool.fromEnvironment('BINDERS_SHARED_V1', defaultValue: false),
    viewLinks: bool.fromEnvironment(
      'BINDERS_VIEW_LINKS_V1',
      defaultValue: false,
    ),
    publicBinders: bool.fromEnvironment(
      'BINDERS_PUBLIC_V1',
      defaultValue: false,
    ),
    community: bool.fromEnvironment(
      'BINDERS_COMMUNITY_V1',
      defaultValue: false,
    ),
    templates: bool.fromEnvironment(
      'BINDERS_TEMPLATES_V1',
      defaultValue: false,
    ),
    notifications: bool.fromEnvironment(
      'BINDERS_NOTIFICATIONS_V1',
      defaultValue: false,
    ),
    pulseSharing: bool.fromEnvironment(
      'BINDERS_PULSE_SHARING_V1',
      defaultValue: false,
    ),
    setBinders: bool.fromEnvironment(
      'BINDERS_SET_TARGET_V1',
      defaultValue: false,
    ),
    customBinders: bool.fromEnvironment(
      'BINDERS_CUSTOM_TARGET_V1',
      defaultValue: false,
    ),
  );

  const BinderFeatureFlags.allEnabled()
    : schema = true,
      personal = true,
      shared = true,
      viewLinks = true,
      publicBinders = true,
      community = true,
      templates = true,
      notifications = true,
      pulseSharing = true,
      setBinders = true,
      customBinders = true;

  final bool schema;
  final bool personal;
  final bool shared;
  final bool viewLinks;
  final bool publicBinders;
  final bool community;
  final bool templates;
  final bool notifications;
  final bool pulseSharing;
  final bool setBinders;
  final bool customBinders;

  bool get personalAvailable => schema && personal;
  bool get sharedAvailable => personalAvailable && shared;
  bool get viewLinksAvailable => sharedAvailable && viewLinks;
  bool get publicAvailable => personalAvailable && publicBinders;
  bool get communityAvailable =>
      publicAvailable && sharedAvailable && community;
  bool get templatesAvailable => personalAvailable && templates;
  bool get notificationsAvailable => sharedAvailable && notifications;
  bool get pulseSharingAvailable => publicAvailable && pulseSharing;
  bool get setBindersAvailable => personalAvailable && setBinders;
  bool get customBindersAvailable => personalAvailable && customBinders;
}
