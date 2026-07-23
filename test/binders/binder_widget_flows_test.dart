import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/binders/binder_collaboration_screens.dart';
import 'package:grookai_vault/screens/binders/binder_discovery_screens.dart';
import 'package:grookai_vault/services/binders/binder_feature_flags.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'package:grookai_vault/widgets/binders/binder_widgets.dart';

BinderDetail _publicDetail({bool canReport = true, bool canBlockOwner = true}) {
  return BinderDetail.fromJson(<String, dynamic>{
    'binder': <String, dynamic>{
      'id': 'binder-internal-1',
      'public_id': 'binder-public-1',
      'title': 'Family Pikachu Binder',
      'description': 'A shared collecting goal.',
      'target_kind': 'species',
      'target_label': 'Pikachu',
      'target_id': 'species-pikachu',
      'checklist_mode': 'card_prints',
      'completed_slots': 2,
      'total_slots': 10,
      'member_count': 2,
      'viewer_role': 'viewer',
      'read_access': 'public',
      'discoverability': 'listed',
      'join_policy': 'request_to_join',
      'contribution_policy': 'approval_required',
      'lifecycle': 'active',
      'moderation_state': 'clear',
      'is_external_projection': true,
    },
    'permissions': <String, dynamic>{
      'can_report': canReport,
      'can_block_owner': canBlockOwner,
    },
    'viewer': <String, dynamic>{
      'can_request_to_join': true,
      'join_request_status': 'none',
    },
    'checklist': <String, dynamic>{'items': <Map<String, dynamic>>[]},
  });
}

class _StubBinderRepository implements BinderRepository {
  _StubBinderRepository({
    this.currentUserId = 'user-1',
    this.invitation,
    this.invitationFailure,
    this.publicDetail,
    this.eligibleCopies = const <BinderEligibleCopy>[],
    this.eligibleCopyPages = const <BinderPage<BinderEligibleCopy>>[],
    this.publicChecklistPages = const <BinderChecklistPage>[],
    this.template,
    this.templateChecklistPages = const <BinderChecklistPage>[],
    this.firstTemplateChecklist,
    this.cloneFailure,
  });

  @override
  String? currentUserId;
  BinderInvitation? invitation;
  BinderException? invitationFailure;
  BinderDetail? publicDetail;
  List<BinderEligibleCopy> eligibleCopies;
  List<BinderPage<BinderEligibleCopy>> eligibleCopyPages;
  List<BinderChecklistPage> publicChecklistPages;
  BinderTemplate? template;
  List<BinderChecklistPage> templateChecklistPages;
  Completer<BinderChecklistPage>? firstTemplateChecklist;
  BinderException? cloneFailure;

  bool previewInvitationCalled = false;
  bool acceptInvitationCalled = false;
  bool declineInvitationCalled = false;
  bool reportCalled = false;
  bool blockOwnerCalled = false;
  String? reportedReason;
  String? contributedInstanceId;
  List<String>? bulkContributedInstanceIds;
  int eligibleCopyLoads = 0;
  int publicChecklistLoads = 0;
  int templateChecklistLoads = 0;
  int cloneTemplateCalls = 0;
  String? clonedTemplateId;
  String? clonedTitle;
  int? clonedVersion;

  @override
  Future<BinderPage<BinderInvitation>> loadInvitationInbox({
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    return const BinderPage<BinderInvitation>(items: <BinderInvitation>[]);
  }

  @override
  Future<BinderPage<BinderSuspendedAccess>> loadSuspendedBinders({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    return const BinderPage<BinderSuspendedAccess>(
      items: <BinderSuspendedAccess>[],
    );
  }

  @override
  Future<BinderInvitation> previewInvitation(String token) async {
    previewInvitationCalled = true;
    if (invitationFailure case final failure?) throw failure;
    return invitation!;
  }

  @override
  Future<String> acceptInvitation(String token) async {
    acceptInvitationCalled = true;
    return invitation?.binderPublicId ?? 'binder-public-1';
  }

  @override
  Future<void> declineInvitation(String token) async {
    declineInvitationCalled = true;
  }

  @override
  Future<BinderPage<BinderEligibleCopy>> loadEligibleCopies({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    if (eligibleCopyPages.isNotEmpty) {
      final index = eligibleCopyLoads.clamp(0, eligibleCopyPages.length - 1);
      eligibleCopyLoads += 1;
      return eligibleCopyPages[index];
    }
    eligibleCopyLoads += 1;
    return BinderPage<BinderEligibleCopy>(items: eligibleCopies);
  }

  @override
  Future<String> addContribution({
    required String publicId,
    required String vaultItemInstanceId,
    String source = 'manual',
  }) async {
    contributedInstanceId = vaultItemInstanceId;
    return 'contribution-1';
  }

  @override
  Future<int> addBulkContributions({
    required String publicId,
    required List<String> vaultItemInstanceIds,
  }) async {
    bulkContributedInstanceIds = List<String>.of(vaultItemInstanceIds);
    return vaultItemInstanceIds.length;
  }

  @override
  Future<BinderDetail> loadPublicDetail(String publicId) async {
    return publicDetail!;
  }

  @override
  Future<BinderDetail> loadViewLink(String token) async {
    return publicDetail!;
  }

  @override
  Future<BinderChecklistPage> loadPublicChecklist({
    required String publicId,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    if (publicChecklistPages.isEmpty) {
      return const BinderChecklistPage(items: <BinderChecklistItem>[]);
    }
    final index = publicChecklistLoads.clamp(
      0,
      publicChecklistPages.length - 1,
    );
    publicChecklistLoads += 1;
    return publicChecklistPages[index];
  }

  @override
  Future<BinderChecklistPage> loadViewLinkChecklist({
    required String token,
    BinderCursor? cursor,
    int limit = 50,
  }) {
    return loadPublicChecklist(
      publicId: 'view-link',
      cursor: cursor,
      limit: limit,
    );
  }

  @override
  Future<BinderPage<BinderTemplate>> loadTemplates({
    BinderCursor? cursor,
    int limit = 20,
  }) async {
    return BinderPage<BinderTemplate>(
      items: template == null
          ? const <BinderTemplate>[]
          : <BinderTemplate>[template!],
    );
  }

  @override
  Future<BinderTemplate> loadTemplate(String publicId) async {
    return template!;
  }

  @override
  Future<BinderChecklistPage> loadTemplateChecklist({
    required String publicId,
    int? version,
    BinderCursor? cursor,
    int limit = 50,
  }) async {
    final call = templateChecklistLoads++;
    if (call == 0 && firstTemplateChecklist != null) {
      return firstTemplateChecklist!.future;
    }
    if (templateChecklistPages.isEmpty) {
      return const BinderChecklistPage(items: <BinderChecklistItem>[]);
    }
    final index = (call - (firstTemplateChecklist == null ? 0 : 1)).clamp(
      0,
      templateChecklistPages.length - 1,
    );
    return templateChecklistPages[index];
  }

  @override
  Future<String> cloneTemplate({
    required String templatePublicId,
    required String title,
    int? version,
  }) async {
    cloneTemplateCalls += 1;
    clonedTemplateId = templatePublicId;
    clonedTitle = title;
    clonedVersion = version;
    if (cloneFailure case final failure?) throw failure;
    return 'cloned-binder-public-1';
  }

  @override
  Future<void> report({
    required BinderReportSurface surface,
    required String surfaceId,
    required String reason,
    String details = '',
  }) async {
    reportCalled = true;
    reportedReason = reason;
  }

  @override
  Future<void> blockOwner(String publicId) async {
    blockOwnerCalled = true;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) {
    return super.noSuchMethod(invocation);
  }
}

Widget _routeLauncher(Widget child) {
  return MaterialApp(
    home: Builder(
      builder: (context) => Scaffold(
        body: Center(
          child: FilledButton(
            onPressed: () => Navigator.of(
              context,
            ).push(MaterialPageRoute<void>(builder: (_) => child)),
            child: const Text('Open flow'),
          ),
        ),
      ),
    ),
  );
}

void main() {
  testWidgets(
    'artwork uses provider image only when hosted primary is absent',
    (tester) async {
      const providerFallback = 'https://provider.example/card.png';
      await tester.pumpWidget(
        const MaterialApp(
          home: BinderArtwork(
            imageUrl: null,
            fallbackImageUrl: providerFallback,
            semanticLabel: 'Pikachu card',
          ),
        ),
      );

      final image = tester.widget<Image>(find.byType(Image));
      expect(image.image, isA<NetworkImage>());
      expect((image.image as NetworkImage).url, providerFallback);
    },
  );

  testWidgets('progress and Vault boundary have complete semantics', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              BinderProgressBar(completed: 3, total: 10, unit: 'card_prints'),
              BinderVaultBoundaryNotice(),
            ],
          ),
        ),
      ),
    );

    expect(
      find.bySemanticsLabel('3 of 10 card prints, 30 percent complete'),
      findsOneWidget,
    );
    expect(find.text('3 of 10 card prints'), findsOneWidget);
    expect(find.textContaining('card_prints'), findsNothing);
    expect(
      find.bySemanticsLabel(
        'Cards stay in each collector’s Vault. '
        'The Binder combines only the copies members choose to contribute.',
      ),
      findsOneWidget,
    );
    handle.dispose();
  });

  testWidgets('exact-copy flow filters by printing and sends exact instance', (
    tester,
  ) async {
    final repository = _StubBinderRepository(
      eligibleCopies: const <BinderEligibleCopy>[
        BinderEligibleCopy(
          instanceId: 'instance-wrong-print',
          cardPrintId: 'print-other',
          name: 'Other Pikachu',
          eligibility: 'eligible',
        ),
        BinderEligibleCopy(
          instanceId: 'instance-exact',
          cardPrintId: 'print-target',
          cardPrintingId: 'printing-reverse-holo',
          name: 'Mega Pikachu ex',
          finishLabel: 'Reverse Holo',
          setLabel: 'Mega Evolution',
          number: '004',
          eligibility: 'eligible',
        ),
      ],
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderExactCopyPickerScreen(
          publicId: 'binder-public-1',
          repository: repository,
          allowMultiple: false,
          cardPrintId: 'print-target',
          contextLabel: 'Mega Pikachu ex',
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();

    expect(find.text('Other Pikachu'), findsNothing);
    expect(find.text('Mega Pikachu ex'), findsOneWidget);
    expect(find.textContaining('Reverse Holo'), findsOneWidget);

    await tester.tap(find.text('Mega Pikachu ex'));
    await tester.pump();
    await tester.tap(find.text('Add selected copy'));
    await tester.pumpAndSettle();

    expect(repository.contributedInstanceId, 'instance-exact');
    expect(repository.bulkContributedInstanceIds, isNull);
  });

  testWidgets('exact-copy flow searches beyond the first eligible-copy page', (
    tester,
  ) async {
    final repository = _StubBinderRepository(
      eligibleCopyPages: const <BinderPage<BinderEligibleCopy>>[
        BinderPage<BinderEligibleCopy>(
          items: <BinderEligibleCopy>[
            BinderEligibleCopy(
              instanceId: 'instance-other',
              cardPrintId: 'print-other',
              name: 'Other target card',
              eligibility: 'eligible',
            ),
          ],
          nextCursor: BinderCursor(
            createdAt: null,
            instanceId: 'instance-other',
          ),
          hasMore: true,
        ),
        BinderPage<BinderEligibleCopy>(
          items: <BinderEligibleCopy>[
            BinderEligibleCopy(
              instanceId: 'instance-target',
              cardPrintId: 'print-target',
              name: 'Target Pikachu',
              eligibility: 'eligible',
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderExactCopyPickerScreen(
          publicId: 'binder-public-1',
          repository: repository,
          allowMultiple: false,
          cardPrintId: 'print-target',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(repository.eligibleCopyLoads, 2);
    expect(find.text('Other target card'), findsNothing);
    expect(find.text('Target Pikachu'), findsOneWidget);
  });

  testWidgets('signed-out invitation reveals no Binder metadata', (
    tester,
  ) async {
    final repository = _StubBinderRepository(
      currentUserId: null,
      invitation: const BinderInvitation(
        id: 'invite-1',
        state: BinderInvitationState.pending,
        maximumRole: BinderRole.contributor,
        binderTitle: 'Secret Family Binder',
        inviterLabel: 'Secret Inviter',
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderInvitationRouteScreen(
          token: 'bearer-secret',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign in to view this invitation'), findsOneWidget);
    expect(find.text('Secret Family Binder'), findsNothing);
    expect(find.text('Secret Inviter'), findsNothing);
    expect(find.text('bearer-secret'), findsNothing);
    expect(repository.previewInvitationCalled, isFalse);
  });

  testWidgets('revoked invitation collapses to a generic unavailable state', (
    tester,
  ) async {
    final repository = _StubBinderRepository(
      invitationFailure: const BinderException(
        BinderFailureKind.revoked,
        'Internal detail that must not reach the screen.',
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderInvitationRouteScreen(
          token: 'revoked-secret',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Invitation unavailable'), findsOneWidget);
    expect(
      find.text('Internal detail that must not reach the screen.'),
      findsNothing,
    );
    expect(find.text('revoked-secret'), findsNothing);
  });

  testWidgets('valid invitation explains role and accepts explicitly', (
    tester,
  ) async {
    final repository = _StubBinderRepository(
      invitation: const BinderInvitation(
        id: 'invite-1',
        state: BinderInvitationState.pending,
        maximumRole: BinderRole.contributor,
        binderPublicId: 'binder-public-1',
        binderTitle: 'Family Pikachu Binder',
        inviterLabel: 'Dad',
      ),
    );

    await tester.pumpWidget(
      _routeLauncher(
        BinderInvitationRouteScreen(
          token: 'one-time-token',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();

    expect(find.text('Family Pikachu Binder'), findsOneWidget);
    expect(find.text('You’re invited as Contributor.'), findsOneWidget);
    expect(
      find.textContaining('Accepting does not enable a public profile'),
      findsOneWidget,
    );

    await tester.tap(find.text('Accept'));
    await tester.pumpAndSettle();
    expect(repository.acceptInvitationCalled, isTrue);
  });

  testWidgets('public Binder exposes Report and confirmed Block actions', (
    tester,
  ) async {
    final repository = _StubBinderRepository(publicDetail: _publicDetail());

    await tester.pumpWidget(
      _routeLauncher(
        BinderExternalProjectionScreen.public(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();

    expect(find.text('Family Pikachu Binder'), findsWidgets);
    expect(find.text('Request to join'), findsOneWidget);

    await tester.tap(find.byTooltip('Safety actions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Report Binder'));
    await tester.pumpAndSettle();
    expect(repository.reportCalled, isFalse);
    expect(find.text('Why are you reporting this Binder?'), findsOneWidget);
    await tester.tap(find.text('Scam or fraud'));
    await tester.pumpAndSettle();
    expect(repository.reportCalled, isTrue);
    expect(repository.reportedReason, 'scam');

    await tester.tap(find.byTooltip('Safety actions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Block Owner'));
    await tester.pumpAndSettle();
    expect(find.text('Block this Binder’s Owner?'), findsOneWidget);
    expect(find.textContaining('Vault copies are unchanged'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Block'));
    await tester.pumpAndSettle();
    expect(repository.blockOwnerCalled, isTrue);
  });

  testWidgets('public owner block is hidden unless expressly granted', (
    tester,
  ) async {
    final repository = _StubBinderRepository(
      publicDetail: _publicDetail(canBlockOwner: false),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderExternalProjectionScreen.public(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Safety actions'));
    await tester.pumpAndSettle();
    expect(find.text('Report Binder'), findsOneWidget);
    expect(find.text('Block Owner'), findsNothing);
    expect(repository.blockOwnerCalled, isFalse);
  });

  testWidgets('owner-self public projection exposes no safety menu', (
    tester,
  ) async {
    final repository = _StubBinderRepository(
      publicDetail: _publicDetail(canReport: false, canBlockOwner: false),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderExternalProjectionScreen.public(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byTooltip('Safety actions'), findsNothing);
    expect(find.text('Report Binder'), findsNothing);
    expect(find.text('Block Owner'), findsNothing);
  });

  testWidgets(
    'Template preview loads every requested checklist page before clone',
    (tester) async {
      final firstPage = Completer<BinderChecklistPage>();
      final repository = _StubBinderRepository(
        template: const BinderTemplate(
          id: 'template-public-1',
          title: 'Pikachu Starter Template',
          targetKind: BinderTargetKind.custom,
          slotCount: 2,
          version: 3,
          description: 'A reviewed two-card checklist.',
        ),
        firstTemplateChecklist: firstPage,
        templateChecklistPages: const <BinderChecklistPage>[
          BinderChecklistPage(
            items: <BinderChecklistItem>[
              BinderChecklistItem(
                slotId: 'slot-2',
                cardPrintId: 'print-2',
                name: 'Pikachu Reverse Holo',
                requiredQuantity: 1,
                activeQuantity: 0,
                finishLabel: 'Reverse Holo',
              ),
            ],
          ),
        ],
        cloneFailure: const BinderException(
          BinderFailureKind.unavailable,
          'Clone stopped after test verification.',
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: BinderTemplatesScreen(
            repository: repository,
            featureFlags: const BinderFeatureFlags.allEnabled(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Pikachu Starter Template'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));

      expect(repository.templateChecklistLoads, 1);
      var buildButton = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Build your own'),
      );
      expect(buildButton.onPressed, isNull);
      expect(repository.cloneTemplateCalls, 0);

      firstPage.complete(
        const BinderChecklistPage(
          items: <BinderChecklistItem>[
            BinderChecklistItem(
              slotId: 'slot-1',
              cardPrintId: 'print-1',
              name: 'Pikachu Holo',
              requiredQuantity: 1,
              activeQuantity: 0,
              finishLabel: 'Holo',
            ),
          ],
          nextCursor: BinderCursor(position: 1),
          hasMore: true,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Pikachu Holo'), findsOneWidget);
      buildButton = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Build your own'),
      );
      expect(buildButton.onPressed, isNotNull);
      await tester.tap(find.text('Load more checklist cards'));
      await tester.pumpAndSettle();

      expect(repository.templateChecklistLoads, 2);
      expect(find.text('Pikachu Reverse Holo'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Build your own'));
      await tester.pumpAndSettle();

      expect(repository.cloneTemplateCalls, 1);
      expect(repository.clonedTemplateId, 'template-public-1');
      expect(repository.clonedTitle, 'Pikachu Starter Template');
      expect(repository.clonedVersion, 3);
    },
  );

  testWidgets('bearer-link projection exposes no Report or Block actions', (
    tester,
  ) async {
    final repository = _StubBinderRepository(publicDetail: _publicDetail());

    await tester.pumpWidget(
      MaterialApp(
        home: BinderExternalProjectionScreen.viewLink(
          token: 'view-link-secret',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Family Pikachu Binder'), findsWidgets);
    expect(find.byTooltip('Safety actions'), findsNothing);
    expect(find.text('Report Binder'), findsNothing);
    expect(find.text('Block Owner'), findsNothing);
    expect(find.text('view-link-secret'), findsNothing);
    expect(repository.reportCalled, isFalse);
    expect(repository.blockOwnerCalled, isFalse);
  });

  testWidgets('public checklist appends its next sanitized page', (
    tester,
  ) async {
    final detail = BinderDetail.fromJson(<String, dynamic>{
      'binder': <String, dynamic>{
        'public_id': 'binder-public-1',
        'title': 'Large Public Binder',
        'target_kind': 'species',
        'target_label': 'Pikachu',
        'checklist_mode': 'card_prints',
        'read_access': 'public',
        'lifecycle': 'active',
        'is_external_projection': true,
      },
      'checklist': <String, dynamic>{
        'items': <Map<String, dynamic>>[
          <String, dynamic>{
            'slot_id': 'slot-1',
            'card_print_id': 'print-1',
            'name': 'First checklist card',
            'required_quantity': 1,
            'active_quantity': 1,
          },
        ],
        'next_cursor': <String, dynamic>{'position': 1},
      },
    });
    final repository = _StubBinderRepository(
      publicDetail: detail,
      publicChecklistPages: const <BinderChecklistPage>[
        BinderChecklistPage(
          items: <BinderChecklistItem>[
            BinderChecklistItem(
              slotId: 'slot-2',
              cardPrintId: 'print-2',
              name: 'Second checklist card',
              requiredQuantity: 1,
              activeQuantity: 0,
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BinderExternalProjectionScreen.public(
          publicId: 'binder-public-1',
          repository: repository,
          featureFlags: const BinderFeatureFlags.allEnabled(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('First checklist card'), findsOneWidget);
    expect(find.text('Second checklist card'), findsNothing);
    await tester.tap(find.text('Load more checklist cards'));
    await tester.pumpAndSettle();

    expect(repository.publicChecklistLoads, 1);
    expect(find.text('Second checklist card'), findsOneWidget);
  });
}
