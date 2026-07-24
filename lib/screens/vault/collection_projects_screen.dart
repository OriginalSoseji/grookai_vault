import 'package:flutter/material.dart';

import '../../models/vault/collection_project.dart';
import '../../services/vault/collection_project_service.dart';

typedef CollectionProjectOpenCallback =
    Future<void> Function(CollectionProject project);
typedef WantedCardsOpenCallback = Future<void> Function();

class CollectionProjectsScreen extends StatefulWidget {
  CollectionProjectsScreen({
    super.key,
    CollectionProjectService? service,
    this.onOpenProject,
    this.onOpenWantedCards,
  }) : service = service ?? CollectionProjectService();

  final CollectionProjectService service;
  final CollectionProjectOpenCallback? onOpenProject;
  final WantedCardsOpenCallback? onOpenWantedCards;

  @override
  State<CollectionProjectsScreen> createState() =>
      _CollectionProjectsScreenState();
}

class _CollectionProjectsScreenState extends State<CollectionProjectsScreen> {
  late Future<CollectionProjectsSnapshot> _dashboard;
  final Set<String> _stoppingProjectKeys = <String>{};

  @override
  void initState() {
    super.initState();
    _dashboard = widget.service.loadDashboard();
  }

  void _reload() {
    setState(() {
      _dashboard = widget.service.loadDashboard();
    });
  }

  Future<void> _refresh() async {
    final nextDashboard = widget.service.loadDashboard();
    setState(() {
      _dashboard = nextDashboard;
    });
    await nextDashboard;
  }

  Future<void> _openProject(CollectionProject project) async {
    final callback = widget.onOpenProject;
    if (callback == null) {
      return;
    }
    await callback(project);
    if (mounted) {
      _reload();
    }
  }

  Future<void> _openWantedCards() async {
    final callback = widget.onOpenWantedCards;
    if (callback == null) {
      return;
    }
    await callback();
    if (mounted) {
      _reload();
    }
  }

  Future<void> _confirmStop(CollectionProject project) async {
    final shouldStop = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Stop tracking this project?'),
        content: Text(
          '${project.title} will leave your active Projects list. '
          'Your Vault cards and Wall will not change.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Keep tracking'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Stop tracking'),
          ),
        ],
      ),
    );
    if (shouldStop != true || !mounted) {
      return;
    }

    final key = _projectKey(project);
    setState(() {
      _stoppingProjectKeys.add(key);
    });
    try {
      await widget.service.stopProject(
        subjectType: project.subjectType,
        subjectId: project.subjectId,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Stopped tracking ${project.title}.')),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not stop tracking. Please try again.'),
        ),
      );
      return;
    } finally {
      if (mounted) {
        setState(() {
          _stoppingProjectKeys.remove(key);
        });
      }
    }
    if (mounted) {
      try {
        await _refresh();
      } catch (_) {
        // The FutureBuilder now owns the refresh error state. The watch was
        // already stopped successfully, so do not report the mutation as failed.
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Collection Projects')),
      body: SafeArea(
        child: FutureBuilder<CollectionProjectsSnapshot>(
          future: _dashboard,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _ProjectsMessageList(
                icon: snapshot.error is CollectionProjectAuthenticationException
                    ? Icons.lock_person_outlined
                    : Icons.error_outline_rounded,
                title:
                    snapshot.error is CollectionProjectAuthenticationException
                    ? 'Sign in to view Projects'
                    : 'Unable to load Projects',
                body: snapshot.error is CollectionProjectAuthenticationException
                    ? 'Collection Projects are private and tied to your Grookai Vault account.'
                    : 'Pull to refresh or try again. Your Vault has not changed.',
                action: TextButton.icon(
                  onPressed: _reload,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try again'),
                ),
                onRefresh: _refresh,
              );
            }

            final dashboard =
                snapshot.data ??
                const CollectionProjectsSnapshot(
                  projects: <CollectionProject>[],
                );
            return _buildDashboard(dashboard);
          },
        ),
      ),
    );
  }

  Widget _buildDashboard(CollectionProjectsSnapshot dashboard) {
    final activeProjects = dashboard.activeProjects;
    final completedProjects = dashboard.completedProjects;
    final children = <Widget>[
      const _PrivateProjectsIntro(),
      const SizedBox(height: 12),
      _WantedCardsTile(
        count: dashboard.wantedCardCount,
        onTap: widget.onOpenWantedCards == null ? null : _openWantedCards,
      ),
      const SizedBox(height: 20),
    ];

    if (dashboard.projects.isEmpty) {
      children.add(const _EmptyProjectsCard());
    } else {
      if (activeProjects.isNotEmpty) {
        children.add(
          _ProjectSection(
            title: 'In progress',
            projects: activeProjects,
            stoppingProjectKeys: _stoppingProjectKeys,
            onOpenProject: widget.onOpenProject == null ? null : _openProject,
            onStopProject: _confirmStop,
          ),
        );
      }
      if (completedProjects.isNotEmpty) {
        if (activeProjects.isNotEmpty) {
          children.add(const SizedBox(height: 20));
        }
        children.add(
          _ProjectSection(
            title: 'Completed',
            projects: completedProjects,
            stoppingProjectKeys: _stoppingProjectKeys,
            onOpenProject: widget.onOpenProject == null ? null : _openProject,
            onStopProject: _confirmStop,
          ),
        );
      }
    }
    children.add(const SizedBox(height: 24));

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: children,
      ),
    );
  }
}

class _PrivateProjectsIntro extends StatelessWidget {
  const _PrivateProjectsIntro();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.primaryContainer.withValues(alpha: 0.34),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.primary.withValues(alpha: 0.14)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.shield_outlined, color: colors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Private by default',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Projects track your set and Pokémon progress without posting to Pulse or Wall.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WantedCardsTile extends StatelessWidget {
  const _WantedCardsTile({required this.count, this.onTap});

  final int? count;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final safeCount = count?.clamp(0, 1 << 31);
    final countLabel = switch (safeCount) {
      null => 'Saved privately',
      1 => '1 wanted card',
      _ => '$safeCount wanted cards',
    };

    return Card(
      key: const ValueKey<String>('wanted-cards-project-tile'),
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: CircleAvatar(
          backgroundColor: colors.tertiaryContainer,
          foregroundColor: colors.onTertiaryContainer,
          child: const Icon(Icons.favorite_border_rounded),
        ),
        title: Text(
          'Wanted Cards',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text('$countLabel · Only visible to you'),
        trailing: onTap == null
            ? null
            : const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}

class _EmptyProjectsCard extends StatelessWidget {
  const _EmptyProjectsCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return DecoratedBox(
      key: const ValueKey<String>('collection-projects-empty-state'),
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            Icon(Icons.flag_outlined, size: 34, color: colors.primary),
            const SizedBox(height: 10),
            Text(
              'No collection projects yet',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              'Start tracking from a set or Pokémon page. Progress stays private until you explicitly choose to share cards.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProjectSection extends StatelessWidget {
  const _ProjectSection({
    required this.title,
    required this.projects,
    required this.stoppingProjectKeys,
    required this.onStopProject,
    this.onOpenProject,
  });

  final String title;
  final List<CollectionProject> projects;
  final Set<String> stoppingProjectKeys;
  final ValueChanged<CollectionProject>? onOpenProject;
  final ValueChanged<CollectionProject> onStopProject;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        for (var index = 0; index < projects.length; index++) ...[
          if (index > 0) const SizedBox(height: 10),
          _CollectionProjectTile(
            project: projects[index],
            isStopping: stoppingProjectKeys.contains(
              _projectKey(projects[index]),
            ),
            onTap: onOpenProject == null
                ? null
                : () => onOpenProject!(projects[index]),
            onStop: () => onStopProject(projects[index]),
          ),
        ],
      ],
    );
  }
}

class _CollectionProjectTile extends StatelessWidget {
  const _CollectionProjectTile({
    required this.project,
    required this.isStopping,
    required this.onStop,
    this.onTap,
  });

  final CollectionProject project;
  final bool isStopping;
  final VoidCallback? onTap;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final nextMilestone = project.nextMilestone;

    return Card(
      key: ValueKey<String>(_projectKey(project)),
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ProjectLeading(project: project),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            project.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _SubjectBadge(subjectType: project.subjectType),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: project.completionPercent / 100,
                        minHeight: 7,
                        backgroundColor: colors.surfaceContainerHighest,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            project.progressLabel,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ),
                        Text(
                          '${project.completionPercent}%',
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: project.isComplete
                                ? colors.primary
                                : colors.onSurface,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      project.isComplete
                          ? 'Complete'
                          : nextMilestone == null
                          ? 'Progress is up to date'
                          : 'Next milestone: $nextMilestone%',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: project.isComplete
                            ? colors.primary
                            : colors.onSurfaceVariant,
                        fontWeight: project.isComplete
                            ? FontWeight.w800
                            : FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              isStopping
                  ? const SizedBox.square(
                      dimension: 40,
                      child: Padding(
                        padding: EdgeInsets.all(10),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : IconButton(
                      tooltip: 'Stop tracking ${project.title}',
                      onPressed: onStop,
                      icon: const Icon(Icons.visibility_off_outlined),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProjectLeading extends StatelessWidget {
  const _ProjectLeading({required this.project});

  final CollectionProject project;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final imageUrl = (project.imageUrl ?? '').trim();
    final fallback = Icon(
      project.subjectType == CollectionProjectSubjectType.set
          ? Icons.collections_bookmark_outlined
          : Icons.catching_pokemon_outlined,
      color: colors.primary,
    );
    return Container(
      width: 48,
      height: 48,
      padding: const EdgeInsets.all(7),
      decoration: BoxDecoration(
        color: colors.primaryContainer.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(12),
      ),
      child: imageUrl.isEmpty
          ? fallback
          : Image.network(
              imageUrl,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => fallback,
            ),
    );
  }
}

class _SubjectBadge extends StatelessWidget {
  const _SubjectBadge({required this.subjectType});

  final CollectionProjectSubjectType subjectType;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.secondaryContainer.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          subjectType.label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: colors.onSecondaryContainer,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _ProjectsMessageList extends StatelessWidget {
  const _ProjectsMessageList({
    required this.icon,
    required this.title,
    required this.body,
    required this.onRefresh,
    this.action,
  });

  final IconData icon;
  final String title;
  final String body;
  final Future<void> Function() onRefresh;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 72),
          Icon(icon, size: 42, color: colors.primary),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),
          if (action != null) ...[
            const SizedBox(height: 12),
            Center(child: action),
          ],
        ],
      ),
    );
  }
}

String _projectKey(CollectionProject project) =>
    'collection-project-${project.subjectType.databaseValue}-${project.subjectId}';
