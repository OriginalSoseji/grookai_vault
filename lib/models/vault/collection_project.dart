enum CollectionProjectSubjectType {
  set(databaseValue: 'set', label: 'Set'),
  species(databaseValue: 'character', label: 'Pokémon');

  const CollectionProjectSubjectType({
    required this.databaseValue,
    required this.label,
  });

  final String databaseValue;
  final String label;

  static CollectionProjectSubjectType? fromDatabaseValue(dynamic value) {
    final normalized = (value ?? '').toString().trim().toLowerCase();
    for (final type in values) {
      if (type.databaseValue == normalized) {
        return type;
      }
    }
    return null;
  }
}

class CollectionProject {
  const CollectionProject({
    required this.watchId,
    required this.subjectType,
    required this.subjectId,
    required this.title,
    required this.routeKey,
    required this.totalCount,
    required this.ownedCount,
    this.imageUrl,
    this.createdAt,
  });

  final String watchId;
  final CollectionProjectSubjectType subjectType;
  final String subjectId;
  final String title;
  final String routeKey;
  final int totalCount;
  final int ownedCount;
  final String? imageUrl;
  final DateTime? createdAt;

  int get safeTotalCount => totalCount < 0 ? 0 : totalCount;

  int get safeOwnedCount {
    final total = safeTotalCount;
    if (total <= 0) {
      return 0;
    }
    return ownedCount.clamp(0, total);
  }

  int get completionPercent {
    final total = safeTotalCount;
    if (total <= 0) {
      return 0;
    }
    return ((safeOwnedCount / total) * 100).round().clamp(0, 100);
  }

  bool get isComplete => safeTotalCount > 0 && safeOwnedCount >= safeTotalCount;

  int? get nextMilestone {
    const milestones = <int>[25, 50, 75, 90, 100];
    for (final milestone in milestones) {
      if (completionPercent < milestone) {
        return milestone;
      }
    }
    return null;
  }

  String get progressUnit => switch (subjectType) {
    CollectionProjectSubjectType.set => 'finish options',
    CollectionProjectSubjectType.species => 'card prints',
  };

  String get progressLabel =>
      '$safeOwnedCount of $safeTotalCount $progressUnit';
}

class CollectionProjectsSnapshot {
  const CollectionProjectsSnapshot({
    required this.projects,
    this.wantedCardCount,
  });

  final List<CollectionProject> projects;
  final int? wantedCardCount;

  List<CollectionProject> get activeProjects =>
      projects.where((project) => !project.isComplete).toList(growable: false);

  List<CollectionProject> get completedProjects =>
      projects.where((project) => project.isComplete).toList(growable: false);
}
