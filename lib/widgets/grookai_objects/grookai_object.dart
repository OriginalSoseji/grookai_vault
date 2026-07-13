import 'grookai_object_skin.dart';

/// The generic envelope every publishable card object flows through — the
/// renderer only ever sees this. It does not know or care whether a human
/// filled [fields] via a form or an AI assistant generated them later;
/// both paths produce the same shape.
///
/// Adding a new object type (Trade, Looking For, Showcase, New Pickup,
/// Completed Set, Tournament Win, Vault Milestone, Store Inventory, ...) is
/// additive: register a new [layout] id + field schema in
/// grookai_object_layout_registry.dart. Nothing here, in the renderer, the
/// frame, or the skin tokens needs to change.
class GrookaiObject {
  /// Loose category used for non-visual business logic (e.g. "does this
  /// object type ever show a contact CTA"). Deliberately a plain string,
  /// not a closed enum — new types shouldn't require editing this class.
  /// 'memory' | 'sale' | 'lot' today; 'trade' | 'looking_for' | 'showcase'
  /// etc. are natural additions later, per product discussion.
  final String type;

  final GrookaiObjectSkin skin;

  /// Which registered layout renders this object's front/back, versioned
  /// so a layout's shape can change later without breaking objects already
  /// created under an older version (e.g. 'memory.v1', 'memory.v2').
  final String layout;

  /// The actual content the layout reads — whatever a human filled in a
  /// form, or an AI assistant produced. The renderer treats both
  /// identically; it only ever reads from this map via the layout's own
  /// field schema (see MemoryCardData.fromFields, etc.).
  final Map<String, dynamic> fields;

  /// Bookkeeping the renderer never touches: owner id, card ref(s),
  /// timestamps, moderation flags, source ("user" | "ai"), etc.
  final Map<String, dynamic> metadata;

  const GrookaiObject({
    required this.type,
    required this.skin,
    required this.layout,
    required this.fields,
    this.metadata = const {},
  });

  GrookaiObject copyWith({
    String? type,
    GrookaiObjectSkin? skin,
    String? layout,
    Map<String, dynamic>? fields,
    Map<String, dynamic>? metadata,
  }) {
    return GrookaiObject(
      type: type ?? this.type,
      skin: skin ?? this.skin,
      layout: layout ?? this.layout,
      fields: fields ?? this.fields,
      metadata: metadata ?? this.metadata,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'skin': skin.name,
    'layout': layout,
    'fields': fields,
    'metadata': metadata,
  };

  factory GrookaiObject.fromJson(Map<String, dynamic> json) {
    return GrookaiObject(
      type: json['type'] as String,
      skin: GrookaiObjectSkin.values.byName(json['skin'] as String),
      layout: json['layout'] as String,
      fields: Map<String, dynamic>.from(json['fields'] as Map),
      metadata: json['metadata'] == null
          ? const {}
          : Map<String, dynamic>.from(json['metadata'] as Map),
    );
  }
}
