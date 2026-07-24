import 'dart:collection';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../utils/display_image_contract.dart';
import '../identity/catalog_artwork_resolution.dart';

const Set<String> kDexWallDiscoverableIntents = <String>{
  'showcase',
  'trade',
  'sell',
};

const int kDexWallFreeActiveSectionLimit = 3;
const int kDexWallStoredSectionLimit = 20;

bool isDexWallDiscoverableIntent(dynamic value) {
  return kDexWallDiscoverableIntents.contains(
    (value ?? '').toString().trim().toLowerCase(),
  );
}

String dexWallIntentLabel(String value) {
  switch (value.trim().toLowerCase()) {
    case 'showcase':
      return 'Showcase';
    case 'trade':
      return 'Trade';
    case 'sell':
      return 'Sell';
    default:
      return 'Hold';
  }
}

class DexWallShowcaseProfileGate {
  const DexWallShowcaseProfileGate({
    required this.publicProfileEnabled,
    required this.vaultSharingEnabled,
  });

  final bool publicProfileEnabled;
  final bool vaultSharingEnabled;

  bool get canPublish => publicProfileEnabled && vaultSharingEnabled;

  String get guidance {
    if (!publicProfileEnabled && !vaultSharingEnabled) {
      return 'Turn on your public profile and Vault sharing in Account '
          'settings, then return here.';
    }
    if (!publicProfileEnabled) {
      return 'Turn on your public profile in Account settings, then return '
          'here.';
    }
    if (!vaultSharingEnabled) {
      return 'Turn on Vault sharing in Account settings, then return here.';
    }
    return 'Your public profile and Vault sharing are ready.';
  }
}

class DexWallShowcaseSection {
  const DexWallShowcaseSection({
    required this.id,
    required this.name,
    required this.position,
  });

  final String id;
  final String name;
  final int position;
}

class DexWallShowcaseCopy {
  const DexWallShowcaseCopy({
    required this.instanceId,
    required this.cardPrintId,
    required this.cardName,
    required this.setName,
    required this.intent,
    required this.isSlab,
    this.gvviId,
    this.gvId,
    this.setCode,
    this.number,
    this.cardPrintingId,
    this.finishLabel,
    this.conditionLabel,
    this.grader,
    this.grade,
    this.certNumber,
    this.hostedImageUrl,
    this.fallbackImageUrl,
  });

  final String instanceId;
  final String? gvviId;
  final String cardPrintId;
  final String? gvId;
  final String cardName;
  final String setName;
  final String? setCode;
  final String? number;
  final String? cardPrintingId;
  final String? finishLabel;
  final String intent;
  final String? conditionLabel;
  final bool isSlab;
  final String? grader;
  final String? grade;
  final String? certNumber;
  final String? hostedImageUrl;
  final String? fallbackImageUrl;

  bool get isEligible => isDexWallDiscoverableIntent(intent);

  String get finishDisplayLabel {
    final value = (finishLabel ?? '').trim();
    return value.isEmpty ? 'Finish not assigned' : value;
  }

  String get copyIdentityLabel {
    final publicIdentity = (gvviId ?? '').trim();
    if (publicIdentity.isNotEmpty) {
      if (publicIdentity.length <= 24) {
        return publicIdentity;
      }
      return '${publicIdentity.substring(0, 14)}…'
          '${publicIdentity.substring(publicIdentity.length - 6)}';
    }
    final compactId = instanceId.replaceAll('-', '').toUpperCase();
    final visibleLength = compactId.length < 10 ? compactId.length : 10;
    return 'Copy ${compactId.substring(0, visibleLength)}';
  }

  String get eligibilityGuidance {
    if (isEligible) {
      return '${dexWallIntentLabel(intent)} copies can appear publicly.';
    }
    return 'This flow will not add a Hold copy. If this copy is already in a '
        'Wall section, remove that section membership in Vault to hide it.';
  }
}

class DexWallShowcaseSelection {
  DexWallShowcaseSelection._({
    required Map<String, DexWallShowcaseCopy> copiesById,
    required Set<String> selectedInstanceIds,
  }) : _copiesById = Map.unmodifiable(copiesById),
       _selectedInstanceIds = Set.unmodifiable(selectedInstanceIds);

  factory DexWallShowcaseSelection.initial(
    Iterable<DexWallShowcaseCopy> copies,
  ) {
    final copiesById = <String, DexWallShowcaseCopy>{
      for (final copy in copies)
        if (copy.instanceId.trim().isNotEmpty) copy.instanceId: copy,
    };
    // SAFETY: A Wall showcase always starts with zero exact copies selected.
    return DexWallShowcaseSelection._(
      copiesById: copiesById,
      selectedInstanceIds: const <String>{},
    );
  }

  final Map<String, DexWallShowcaseCopy> _copiesById;
  final Set<String> _selectedInstanceIds;

  UnmodifiableSetView<String> get selectedInstanceIds =>
      UnmodifiableSetView(_selectedInstanceIds);

  List<DexWallShowcaseCopy> get selectedCopies => _selectedInstanceIds
      .map((id) => _copiesById[id])
      .whereType<DexWallShowcaseCopy>()
      .toList(growable: false);

  bool isSelected(String instanceId) =>
      _selectedInstanceIds.contains(instanceId);

  DexWallShowcaseSelection toggle(String instanceId) {
    final copy = _copiesById[instanceId];
    if (copy == null || !copy.isEligible) {
      return this;
    }

    final next = <String>{..._selectedInstanceIds};
    if (!next.add(instanceId)) {
      next.remove(instanceId);
    }
    return DexWallShowcaseSelection._(
      copiesById: _copiesById,
      selectedInstanceIds: next,
    );
  }

  DexWallShowcaseSelection clear() {
    return DexWallShowcaseSelection._(
      copiesById: _copiesById,
      selectedInstanceIds: const <String>{},
    );
  }
}

class DexWallShowcaseData {
  const DexWallShowcaseData({
    required this.profileGate,
    required this.copies,
    required this.sections,
  });

  final DexWallShowcaseProfileGate profileGate;
  final List<DexWallShowcaseCopy> copies;
  final List<DexWallShowcaseSection> sections;

  int get eligibleCopyCount => copies.where((copy) => copy.isEligible).length;
  int get ineligibleCopyCount => copies.length - eligibleCopyCount;
}

class DexWallShowcaseAssignmentRequest {
  DexWallShowcaseAssignmentRequest({
    required Iterable<String> canonicalCardPrintIds,
    required Iterable<String> selectedInstanceIds,
    required this.confirmed,
    this.existingSectionId,
    this.newSectionName,
  }) : canonicalCardPrintIds = Set.unmodifiable(
         canonicalCardPrintIds.map(_clean).where((id) => id.isNotEmpty),
       ),
       selectedInstanceIds = Set.unmodifiable(
         selectedInstanceIds.map(_clean).where((id) => id.isNotEmpty),
       );

  final Set<String> canonicalCardPrintIds;
  final Set<String> selectedInstanceIds;
  final String? existingSectionId;
  final String? newSectionName;
  final bool confirmed;

  String? get normalizedExistingSectionId {
    final value = _clean(existingSectionId);
    return value.isEmpty ? null : value;
  }

  String? get normalizedNewSectionName {
    final value = _normalizeSectionName(newSectionName);
    return value.isEmpty ? null : value;
  }

  void validate() {
    if (!confirmed) {
      throw StateError('Final Wall confirmation is required.');
    }
    if (canonicalCardPrintIds.isEmpty) {
      throw StateError('This Dex entry has no canonical card identities.');
    }
    if (selectedInstanceIds.isEmpty) {
      throw StateError('Choose at least one exact copy.');
    }

    final hasExisting = normalizedExistingSectionId != null;
    final hasNew = normalizedNewSectionName != null;
    if (hasExisting == hasNew) {
      throw StateError('Choose one existing section or name one new section.');
    }
    if (normalizedExistingSectionId?.toLowerCase() == 'wall') {
      throw StateError('Choose a custom Wall section.');
    }
    final newName = normalizedNewSectionName;
    if (newName != null) {
      if (newName.toLowerCase() == 'wall') {
        throw StateError('Choose a custom Wall section name.');
      }
      if (newName.length > 80) {
        throw StateError('Wall section names can use up to 80 characters.');
      }
    }
  }
}

class DexWallShowcaseCommitResult {
  const DexWallShowcaseCommitResult({
    required this.section,
    required this.assignedCopyCount,
    required this.createdSection,
  });

  final DexWallShowcaseSection section;
  final int assignedCopyCount;
  final bool createdSection;
}

class DexWallShowcaseService {
  static const int _queryChunkSize = 250;
  static const int _pageSize = 1000;

  static Future<DexWallShowcaseData> load({
    required SupabaseClient client,
    required Iterable<String> canonicalCardPrintIds,
  }) async {
    final userId = _clean(client.auth.currentUser?.id);
    if (userId.isEmpty) {
      throw StateError('Sign in to prepare a Wall showcase.');
    }
    final cardPrintIds = canonicalCardPrintIds
        .map(_clean)
        .where((id) => id.isNotEmpty)
        .toSet();
    if (cardPrintIds.isEmpty) {
      throw StateError('This Dex entry has no canonical card identities.');
    }

    final results = await Future.wait<dynamic>([
      _loadProfileGate(client: client, userId: userId),
      _loadActivePublicSections(client: client, userId: userId),
      _loadExactCopies(
        client: client,
        userId: userId,
        canonicalCardPrintIds: cardPrintIds,
      ),
    ]);

    return DexWallShowcaseData(
      profileGate: results[0] as DexWallShowcaseProfileGate,
      sections: results[1] as List<DexWallShowcaseSection>,
      copies: results[2] as List<DexWallShowcaseCopy>,
    );
  }

  static Future<DexWallShowcaseCommitResult> commit({
    required SupabaseClient client,
    required DexWallShowcaseAssignmentRequest request,
  }) async {
    request.validate();
    final userId = _clean(client.auth.currentUser?.id);
    if (userId.isEmpty) {
      throw StateError('Sign in to update your Wall.');
    }

    // Re-check the public gates and every exact copy immediately before the
    // membership write. This flow never enables either setting automatically.
    final revalidated = await Future.wait<dynamic>([
      _loadProfileGate(client: client, userId: userId),
      _loadExactCopies(
        client: client,
        userId: userId,
        canonicalCardPrintIds: request.canonicalCardPrintIds,
      ),
    ]);
    final profileGate = revalidated[0] as DexWallShowcaseProfileGate;
    if (!profileGate.canPublish) {
      throw StateError(profileGate.guidance);
    }

    final exactCopies = revalidated[1] as List<DexWallShowcaseCopy>;
    final copiesById = <String, DexWallShowcaseCopy>{
      for (final copy in exactCopies) copy.instanceId: copy,
    };
    final selectedCopies = request.selectedInstanceIds
        .map((id) => copiesById[id])
        .whereType<DexWallShowcaseCopy>()
        .toList(growable: false);
    if (selectedCopies.length != request.selectedInstanceIds.length) {
      throw StateError(
        'One or more selected copies are no longer owned by this collector or '
        'no longer belong to this exact Dex entry.',
      );
    }
    if (selectedCopies.any((copy) => !copy.isEligible)) {
      throw StateError(
        'Only copies already marked Showcase, Trade, or Sell can be added.',
      );
    }

    final existingSectionId = request.normalizedExistingSectionId;
    late final DexWallShowcaseSection section;
    late final bool createdSection;
    if (existingSectionId != null) {
      section = await _loadOwnedActivePublicSection(
        client: client,
        userId: userId,
        sectionId: existingSectionId,
      );
      createdSection = false;
    } else {
      section = await _createPublicSection(
        client: client,
        userId: userId,
        name: request.normalizedNewSectionName!,
      );
      createdSection = true;
    }

    final selectedIds = request.selectedInstanceIds.toList(growable: false);
    try {
      // LOCK: This is an exact-copy membership write. It never changes copy
      // intent, grouped ownership, private projects, or compatibility metadata.
      await client.rpc(
        'vault_set_copy_section_memberships_v1',
        params: {
          'p_instance_ids': selectedIds,
          'p_section_id': section.id,
          'p_add': true,
        },
      );

      final savedIds = await _loadSavedMembershipIds(
        client: client,
        sectionId: section.id,
        instanceIds: selectedIds,
      );
      if (!savedIds.containsAll(request.selectedInstanceIds)) {
        throw StateError('The Wall section could not be fully updated.');
      }
    } catch (error, stackTrace) {
      if (createdSection) {
        final rolledBack = await _rollbackEmptyCreatedSection(
          client: client,
          userId: userId,
          sectionId: section.id,
        );
        if (!rolledBack) {
          final warning = StateError(
            '${_errorMessage(error)} Review “${section.name}” in Vault; the '
            'new section could not be rolled back safely.',
          );
          Error.throwWithStackTrace(warning, stackTrace);
        }
      }
      Error.throwWithStackTrace(error, stackTrace);
    }

    return DexWallShowcaseCommitResult(
      section: section,
      assignedCopyCount: selectedIds.length,
      createdSection: createdSection,
    );
  }

  static Future<Set<String>> _loadSavedMembershipIds({
    required SupabaseClient client,
    required String sectionId,
    required Iterable<String> instanceIds,
  }) async {
    final savedIds = <String>{};
    for (final chunk in _chunks(instanceIds, _queryChunkSize)) {
      final data = await client
          .from('wall_section_memberships')
          .select('vault_item_instance_id')
          .eq('section_id', sectionId)
          .inFilter('vault_item_instance_id', chunk);
      savedIds.addAll(
        (data as List<dynamic>)
            .map((row) => _clean((row as Map)['vault_item_instance_id']))
            .where((id) => id.isNotEmpty),
      );
    }
    return savedIds;
  }

  static Future<bool> _rollbackEmptyCreatedSection({
    required SupabaseClient client,
    required String userId,
    required String sectionId,
  }) async {
    try {
      final membership = await client
          .from('wall_section_memberships')
          .select('section_id')
          .eq('section_id', sectionId)
          .limit(1)
          .maybeSingle();
      if (membership != null) {
        return false;
      }
      await client
          .from('wall_sections')
          .delete()
          .eq('id', sectionId)
          .eq('user_id', userId);
      final remaining = await client
          .from('wall_sections')
          .select('id')
          .eq('id', sectionId)
          .eq('user_id', userId)
          .maybeSingle();
      return remaining == null;
    } catch (_) {
      // Best-effort rollback only. Never mask the membership write failure.
      return false;
    }
  }

  static Future<DexWallShowcaseProfileGate> _loadProfileGate({
    required SupabaseClient client,
    required String userId,
  }) async {
    final row = await client
        .from('public_profiles')
        .select('public_profile_enabled,vault_sharing_enabled')
        .eq('user_id', userId)
        .maybeSingle();
    return DexWallShowcaseProfileGate(
      publicProfileEnabled: row?['public_profile_enabled'] == true,
      vaultSharingEnabled: row?['vault_sharing_enabled'] == true,
    );
  }

  static Future<List<DexWallShowcaseSection>> _loadActivePublicSections({
    required SupabaseClient client,
    required String userId,
  }) async {
    final data = await client
        .from('wall_sections')
        .select('id,name,position,is_active,is_public')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_public', true)
        .order('position', ascending: true)
        .order('created_at', ascending: true);
    return (data as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map(_sectionFromRow)
        .whereType<DexWallShowcaseSection>()
        .where(
          (section) =>
              section.id.toLowerCase() != 'wall' &&
              section.name.toLowerCase() != 'wall',
        )
        .toList(growable: false);
  }

  static Future<DexWallShowcaseSection> _loadOwnedActivePublicSection({
    required SupabaseClient client,
    required String userId,
    required String sectionId,
  }) async {
    final row = await client
        .from('wall_sections')
        .select('id,name,position,is_active,is_public')
        .eq('id', sectionId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_public', true)
        .maybeSingle();
    final section = row == null
        ? null
        : _sectionFromRow(Map<String, dynamic>.from(row as Map));
    if (section == null ||
        section.id.toLowerCase() == 'wall' ||
        section.name.toLowerCase() == 'wall') {
      throw StateError('Choose an active custom Wall section.');
    }
    return section;
  }

  static Future<DexWallShowcaseSection> _createPublicSection({
    required SupabaseClient client,
    required String userId,
    required String name,
  }) async {
    final normalizedName = _normalizeSectionName(name);
    if (normalizedName.isEmpty ||
        normalizedName.toLowerCase() == 'wall' ||
        normalizedName.length > 80) {
      throw StateError('Enter a valid custom Wall section name.');
    }

    final existingData = await client
        .from('wall_sections')
        .select('id,name,position,is_active')
        .eq('user_id', userId)
        .order('position', ascending: true);
    final existingRows = (existingData as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList(growable: false);
    if (existingRows.length >= kDexWallStoredSectionLimit) {
      throw StateError('You can store up to 20 sections.');
    }
    final activeCount = existingRows
        .where((row) => row['is_active'] == true)
        .length;
    if (activeCount >= kDexWallFreeActiveSectionLimit) {
      throw StateError("You've reached the section limit for your plan.");
    }
    if (existingRows.any(
      (row) =>
          _clean(row['name']).toLowerCase() == normalizedName.toLowerCase(),
    )) {
      throw StateError('A Wall section with that name already exists.');
    }
    final nextPosition =
        existingRows.fold<int>(-1, (highest, row) {
          final value = _intValue(row['position']) ?? 0;
          return value > highest ? value : highest;
        }) +
        1;

    final inserted = await client
        .from('wall_sections')
        .insert({
          'user_id': userId,
          'name': normalizedName,
          'position': nextPosition,
          'is_active': true,
          'is_public': true,
        })
        .select('id,name,position,is_active,is_public')
        .single();
    final section = _sectionFromRow(Map<String, dynamic>.from(inserted as Map));
    if (section == null) {
      throw StateError('The Wall section could not be created.');
    }
    return section;
  }

  static Future<List<DexWallShowcaseCopy>> _loadExactCopies({
    required SupabaseClient client,
    required String userId,
    required Set<String> canonicalCardPrintIds,
  }) async {
    final initial = await Future.wait<dynamic>([
      _loadDirectInstanceRows(
        client: client,
        userId: userId,
        cardPrintIds: canonicalCardPrintIds,
      ),
      _loadOwnerSlabOnlyInstanceRows(client: client, userId: userId),
    ]);
    final directRows = initial[0] as List<Map<String, dynamic>>;
    final slabRows = initial[1] as List<Map<String, dynamic>>;
    final slabById = await _loadOwnedSlabMetadata(
      client: client,
      slabCertIds: slabRows.map((row) => _clean(row['slab_cert_id'])),
      canonicalCardPrintIds: canonicalCardPrintIds,
    );
    final eligibleSlabRows = slabRows
        .where((row) {
          final slab = slabById[_clean(row['slab_cert_id'])];
          return slab != null &&
              canonicalCardPrintIds.contains(slab.cardPrintId);
        })
        .toList(growable: false);

    final resolvedCardPrintIds = <String>{
      ...directRows.map((row) => _clean(row['card_print_id'])),
      ...eligibleSlabRows
          .map((row) => slabById[_clean(row['slab_cert_id'])]?.cardPrintId)
          .whereType<String>(),
    }..removeWhere((id) => !canonicalCardPrintIds.contains(id));
    final metadata = await Future.wait<dynamic>([
      _loadCardMetadata(client: client, cardPrintIds: resolvedCardPrintIds),
      _loadPrintingMetadata(
        client: client,
        cardPrintingIds: <String>{
          ...directRows.map((row) => _clean(row['card_printing_id'])),
          ...eligibleSlabRows.map((row) => _clean(row['card_printing_id'])),
        },
      ),
    ]);
    final cardsById = metadata[0] as Map<String, _DexWallCardMetadata>;
    final printingsById = metadata[1] as Map<String, _DexWallPrintingMetadata>;

    final copies = <DexWallShowcaseCopy>[];
    final seenInstanceIds = <String>{};
    for (final row in <Map<String, dynamic>>[
      ...directRows,
      ...eligibleSlabRows,
    ]) {
      final instanceId = _clean(row['id']);
      if (instanceId.isEmpty || !seenInstanceIds.add(instanceId)) {
        continue;
      }
      final slab = slabById[_clean(row['slab_cert_id'])];
      final cardPrintId = _clean(row['card_print_id']).isNotEmpty
          ? _clean(row['card_print_id'])
          : slab?.cardPrintId ?? '';
      if (!canonicalCardPrintIds.contains(cardPrintId)) {
        continue;
      }
      final card = cardsById[cardPrintId];
      if (card == null) {
        continue;
      }
      final cardPrintingId = _nullable(row['card_printing_id']);
      final printing = printingsById[cardPrintingId];
      copies.add(
        DexWallShowcaseCopy(
          instanceId: instanceId,
          gvviId: _nullable(row['gv_vi_id']),
          cardPrintId: cardPrintId,
          gvId: card.gvId,
          cardName: card.name,
          setName: card.setName,
          setCode: card.setCode,
          number: card.number,
          cardPrintingId: cardPrintingId,
          finishLabel: printing?.finishLabel,
          intent: _normalizeIntent(row['intent']),
          conditionLabel: _nullable(row['condition_label']),
          isSlab: slab != null,
          grader: _nullable(row['grade_company']) ?? _nullable(slab?.grader),
          grade:
              _nullable(row['grade_label']) ??
              _nullable(row['grade_value']) ??
              _nullable(slab?.grade),
          certNumber: _nullable(slab?.certNumber),
          hostedImageUrl: card.hostedImageUrl,
          fallbackImageUrl: card.fallbackImageUrl,
        ),
      );
    }

    copies.sort((left, right) {
      final nameOrder = left.cardName.compareTo(right.cardName);
      if (nameOrder != 0) {
        return nameOrder;
      }
      final setOrder = left.setName.compareTo(right.setName);
      if (setOrder != 0) {
        return setOrder;
      }
      return left.instanceId.compareTo(right.instanceId);
    });
    return List.unmodifiable(copies);
  }

  static Future<List<Map<String, dynamic>>> _loadDirectInstanceRows({
    required SupabaseClient client,
    required String userId,
    required Iterable<String> cardPrintIds,
  }) async {
    final rows = <Map<String, dynamic>>[];
    for (final chunk in _chunks(cardPrintIds, _queryChunkSize)) {
      for (var offset = 0; ; offset += _pageSize) {
        final data = await client
            .from('vault_item_instances')
            .select(_instanceSelect)
            .eq('user_id', userId)
            .filter('archived_at', 'is', null)
            .inFilter('card_print_id', chunk)
            .order('id', ascending: true)
            .range(offset, offset + _pageSize - 1);
        final page = (data as List<dynamic>)
            .map((row) => Map<String, dynamic>.from(row as Map))
            .toList(growable: false);
        rows.addAll(page);
        if (page.length < _pageSize) {
          break;
        }
      }
    }
    return rows;
  }

  static Future<List<Map<String, dynamic>>> _loadOwnerSlabOnlyInstanceRows({
    required SupabaseClient client,
    required String userId,
  }) async {
    final rows = <Map<String, dynamic>>[];
    for (var offset = 0; ; offset += _pageSize) {
      final data = await client
          .from('vault_item_instances')
          .select(_instanceSelect)
          .eq('user_id', userId)
          .filter('archived_at', 'is', null)
          .filter('card_print_id', 'is', null)
          .order('id', ascending: true)
          .range(offset, offset + _pageSize - 1);
      final page = (data as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList(growable: false);
      rows.addAll(page);
      if (page.length < _pageSize) {
        break;
      }
    }
    return rows;
  }

  static Future<Map<String, _DexWallSlabMetadata>> _loadOwnedSlabMetadata({
    required SupabaseClient client,
    required Iterable<String> slabCertIds,
    required Set<String> canonicalCardPrintIds,
  }) async {
    final values = <String, _DexWallSlabMetadata>{};
    for (final chunk in _chunks(slabCertIds, _queryChunkSize)) {
      final data = await client
          .from('slab_certs')
          .select('id,card_print_id,grader,grade,cert_number')
          .inFilter('id', chunk);
      for (final raw in data as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final id = _clean(row['id']);
        final cardPrintId = _clean(row['card_print_id']);
        if (id.isEmpty ||
            cardPrintId.isEmpty ||
            !canonicalCardPrintIds.contains(cardPrintId)) {
          continue;
        }
        values[id] = _DexWallSlabMetadata(
          cardPrintId: cardPrintId,
          grader: _nullable(row['grader']),
          grade: _nullable(row['grade']),
          certNumber: _nullable(row['cert_number']),
        );
      }
    }
    return values;
  }

  static Future<Map<String, _DexWallCardMetadata>> _loadCardMetadata({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final values = <String, _DexWallCardMetadata>{};
    for (final chunk in _chunks(cardPrintIds, _queryChunkSize)) {
      final data = await client
          .from('card_prints')
          .select(
            'id,gv_id,name,set_code,number,image_url,image_alt_url,'
            'representative_image_url,sets(name)',
          )
          .inFilter('id', chunk);
      for (final raw in data as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final id = _clean(row['id']);
        if (id.isEmpty) {
          continue;
        }
        final gvId = _nullable(row['gv_id']);
        final providerImageUrl = resolveDisplayImageUrlFromRow(row);
        final artwork = resolveCatalogArtwork(
          gvId: gvId,
          providerImageUrl: providerImageUrl,
        );
        final setRow = row['sets'] is Map
            ? Map<String, dynamic>.from(row['sets'] as Map)
            : null;
        values[id] = _DexWallCardMetadata(
          gvId: gvId,
          name: _nullable(row['name']) ?? 'Unknown card',
          setName:
              _nullable(setRow?['name']) ??
              _nullable(row['set_code']) ??
              'Unknown set',
          setCode: _nullable(row['set_code']),
          number: _nullable(row['number']),
          hostedImageUrl: artwork.primaryImageUrl,
          fallbackImageUrl: artwork.fallbackImageUrl,
        );
      }
    }
    return values;
  }

  static Future<Map<String, _DexWallPrintingMetadata>> _loadPrintingMetadata({
    required SupabaseClient client,
    required Iterable<String> cardPrintingIds,
  }) async {
    final values = <String, _DexWallPrintingMetadata>{};
    for (final chunk in _chunks(cardPrintingIds, _queryChunkSize)) {
      final data = await client
          .from('card_printings')
          .select('id,finish_key,finish_keys(label)')
          .inFilter('id', chunk);
      for (final raw in data as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final id = _clean(row['id']);
        if (id.isEmpty) {
          continue;
        }
        final finishRow = row['finish_keys'] is Map
            ? Map<String, dynamic>.from(row['finish_keys'] as Map)
            : null;
        values[id] = _DexWallPrintingMetadata(
          finishLabel:
              _nullable(finishRow?['label']) ??
              _humanizeFinishKey(row['finish_key']),
        );
      }
    }
    return values;
  }

  static const String _instanceSelect =
      'id,gv_vi_id,card_print_id,card_printing_id,slab_cert_id,intent,'
      'condition_label,'
      'grade_company,grade_value,grade_label';
}

class _DexWallSlabMetadata {
  const _DexWallSlabMetadata({
    required this.cardPrintId,
    this.grader,
    this.grade,
    this.certNumber,
  });

  final String cardPrintId;
  final String? grader;
  final String? grade;
  final String? certNumber;
}

class _DexWallCardMetadata {
  const _DexWallCardMetadata({
    required this.name,
    required this.setName,
    this.gvId,
    this.setCode,
    this.number,
    this.hostedImageUrl,
    this.fallbackImageUrl,
  });

  final String? gvId;
  final String name;
  final String setName;
  final String? setCode;
  final String? number;
  final String? hostedImageUrl;
  final String? fallbackImageUrl;
}

class _DexWallPrintingMetadata {
  const _DexWallPrintingMetadata({required this.finishLabel});

  final String finishLabel;
}

DexWallShowcaseSection? _sectionFromRow(Map<String, dynamic> row) {
  final id = _clean(row['id']);
  final name = _clean(row['name']);
  if (id.isEmpty || name.isEmpty) {
    return null;
  }
  return DexWallShowcaseSection(
    id: id,
    name: name,
    position: _intValue(row['position']) ?? 0,
  );
}

Iterable<List<String>> _chunks(Iterable<String> source, int size) sync* {
  final values = source.map(_clean).where((id) => id.isNotEmpty).toSet();
  var chunk = <String>[];
  for (final value in values) {
    chunk.add(value);
    if (chunk.length == size) {
      yield chunk;
      chunk = <String>[];
    }
  }
  if (chunk.isNotEmpty) {
    yield chunk;
  }
}

String _normalizeIntent(dynamic value) {
  final normalized = _clean(value).toLowerCase();
  return isDexWallDiscoverableIntent(normalized) ? normalized : 'hold';
}

String _normalizeSectionName(dynamic value) {
  return _clean(value).replaceAll(RegExp(r'\s+'), ' ');
}

String _errorMessage(Object error) {
  return error.toString().replaceFirst(
    RegExp(r'^(StateError|Exception):\s*'),
    '',
  );
}

String _humanizeFinishKey(dynamic value) {
  final normalized = _clean(value).replaceAll('-', '_');
  if (normalized.isEmpty) {
    return 'Finish not assigned';
  }
  return normalized
      .split('_')
      .where((part) => part.isNotEmpty)
      .map(
        (part) => part.length == 1
            ? part.toUpperCase()
            : '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}',
      )
      .join(' ');
}

String _clean(dynamic value) => (value ?? '').toString().trim();

String? _nullable(dynamic value) {
  final normalized = _clean(value);
  return normalized.isEmpty ? null : normalized;
}

int? _intValue(dynamic value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(_clean(value));
}
