import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_feature_flags.dart';
import 'package:grookai_vault/services/binders/binder_rpc_contract.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';

Map<String, dynamic> _summaryJson({
  String id = 'binder-internal-1',
  String publicId = 'binder-public-1',
  String role = 'owner',
  int completed = 7,
  int total = 25,
  String readAccess = 'private',
  String discoverability = 'unlisted',
  String joinPolicy = 'closed',
  String contributionPolicy = 'owner_only',
}) {
  return <String, dynamic>{
    'id': id,
    'public_id': publicId,
    'title': 'Pikachu Family Binder',
    'description': 'Built together without moving anyone’s Vault copies.',
    'target_kind': 'species',
    'target_label': 'Pikachu',
    'target_id': 'species-pikachu',
    'checklist_mode': 'card_prints',
    'completed_slots': completed,
    'total_slots': total,
    'member_count': 2,
    'viewer_role': role,
    'read_access': readAccess,
    'discoverability': discoverability,
    'join_policy': joinPolicy,
    'contribution_policy': contributionPolicy,
    'lifecycle': 'active',
    'moderation_state': 'clear',
    'updated_at': '2026-07-23T12:00:00Z',
  };
}

void main() {
  group('Binder rollout gates', () {
    test('all production gates default off', () {
      const flags = BinderFeatureFlags.production;

      expect(flags.schema, isFalse);
      expect(flags.personalAvailable, isFalse);
      expect(flags.sharedAvailable, isFalse);
      expect(flags.viewLinksAvailable, isFalse);
      expect(flags.publicAvailable, isFalse);
      expect(flags.communityAvailable, isFalse);
      expect(flags.templatesAvailable, isFalse);
      expect(flags.notificationsAvailable, isFalse);
      expect(flags.pulseSharingAvailable, isFalse);
      expect(flags.setBindersAvailable, isFalse);
      expect(flags.customBindersAvailable, isFalse);
    });

    test('later phases cannot bypass prerequisites', () {
      const flags = BinderFeatureFlags(
        schema: false,
        personal: true,
        shared: true,
        viewLinks: true,
        publicBinders: true,
        community: true,
        templates: true,
        notifications: true,
        pulseSharing: true,
        setBinders: true,
        customBinders: true,
      );

      expect(flags.personalAvailable, isFalse);
      expect(flags.communityAvailable, isFalse);
      expect(flags.viewLinksAvailable, isFalse);
    });
  });

  group('Binder routes and secret handling', () {
    test('parses canonical and custom-scheme Binder routes', () {
      final library = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('https://grookaivault.com/binders'),
      );
      final binder = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('grookai://binders/binder-public-1'),
      );
      final invite = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('grookaivault://binder-invites/secret-token'),
      );
      final view = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('https://grookaivault.com/b/secret-token'),
      );

      expect(library?.kind, GrookaiCanonicalRouteKind.binderLibrary);
      expect(binder?.kind, GrookaiCanonicalRouteKind.binder);
      expect(binder?.value, 'binder-public-1');
      expect(invite?.kind, GrookaiCanonicalRouteKind.binderInvitation);
      expect(view?.kind, GrookaiCanonicalRouteKind.binderViewLink);
    });

    test('diagnostics redact bearer tokens and all parameter values', () {
      const token = 'super-secret-token-123';
      final description = GrookaiWebRouteService.redactedDiagnosticUri(
        Uri.parse(
          'https://grookaivault.com/b/$token'
          '?code=oauth-secret&next=/private#access_token=fragment-secret',
        ),
      );
      final customDescription = GrookaiWebRouteService.redactedDiagnosticUri(
        Uri.parse('grookai://binder-invites/$token?source=private-value'),
      );

      expect(description, contains('/b/[redacted]'));
      expect(description, contains('code'));
      expect(description, contains('access_token'));
      expect(description, isNot(contains(token)));
      expect(description, isNot(contains('oauth-secret')));
      expect(description, isNot(contains('fragment-secret')));
      expect(customDescription, contains('/binder-invites/[redacted]'));
      expect(customDescription, isNot(contains(token)));
      expect(customDescription, isNot(contains('private-value')));
    });

    test('unsupported hosts never resolve as Binder routes', () {
      expect(
        GrookaiWebRouteService.parseCanonicalUri(
          Uri.parse('https://example.com/binders/binder-public-1'),
        ),
        isNull,
      );
    });
  });

  group('Binder model boundaries', () {
    test('progress is clamped and uses collector-facing units', () {
      final summary = BinderSummary.fromJson(
        _summaryJson(completed: 100, total: 25),
      );

      expect(summary.completionPercent, 100);
      expect(summary.progressLabel, '25 of 25 card prints');
      expect(summary.isComplete, isTrue);
    });

    test('uses exact server progress unit and parses master variants', () {
      final summary = BinderSummary.fromJson(<String, dynamic>{
        ..._summaryJson(),
        'checklist_mode': 'master_variants',
        'progress': <String, dynamic>{
          'completed_slots': 8,
          'total_slots': 40,
          'unit': 'finish_options',
        },
      });

      expect(summary.checklistMode, BinderChecklistMode.masterVariants);
      expect(summary.progressUnit, 'finish_options');
      expect(summary.effectiveProgressUnit, 'finish options');
      expect(summary.progressLabel, '8 of 40 finish options');
    });

    test('opaque contribution capabilities drive allowed actions', () {
      final item = BinderChecklistItem.fromJson(<String, dynamic>{
        'slot_id': 'slot-1',
        'card_print_id': 'print-1',
        'name': 'Pikachu',
        'required_quantity': 1,
        'active_quantity': 1,
        'contributions': <Map<String, dynamic>>[
          <String, dynamic>{
            'contribution_id': 'contribution-own',
            'can_withdraw': true,
          },
          <String, dynamic>{
            'contribution_id': 'contribution-managed',
            'can_remove': true,
          },
          <String, dynamic>{
            'contribution_id': 'contribution-pending',
            'can_decide': true,
            'status': 'pending',
          },
        ],
      });

      expect(
        item.contributionIds,
        containsAll(<String>[
          'contribution-own',
          'contribution-managed',
          'contribution-pending',
        ]),
      );
      expect(item.ownContributionIds, <String>['contribution-own']);
      expect(item.removableContributionIds, <String>['contribution-managed']);
      expect(item.pendingContributionIds, <String>['contribution-pending']);
    });

    test(
      'public contribution actions retain only opaque Binder references',
      () {
        final item = BinderChecklistItem.fromJson(<String, dynamic>{
          'slot_id': 'slot-public-1',
          'card_print_id': 'canonical-card-1',
          'name': 'Pikachu',
          'required_quantity': 1,
          'active_quantity': 1,
          'contribution_actions': <Map<String, dynamic>>[
            <String, dynamic>{
              'contribution_action_ref': 'action-contribution-1',
              'member_action_ref': 'action-member-1',
              'alias': 'Family Collector',
              'identity_visible': true,
              'permissions': <String, dynamic>{
                'can_report': true,
                'can_block': true,
              },
            },
          ],
          'contribution_actions_has_more': true,
        });

        final action = item.publicContributionActions.single;
        expect(action.contributionActionReference, 'action-contribution-1');
        expect(action.memberActionReference, 'action-member-1');
        expect(action.alias, 'Family Collector');
        expect(action.canReport, isTrue);
        expect(action.canBlock, isTrue);
        expect(item.publicContributionActionsHaveMore, isTrue);
        expect(item.contributions, isEmpty);
      },
    );

    test('custom slot serialization happens only from visual selections', () {
      const draft = BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: 'canonical-card-1',
          name: 'Pikachu',
          setLabel: 'Mega Evolution',
          number: '026',
        ),
        finish: BinderFinishOption(
          label: 'Reverse Holo',
          cardPrintingId: 'governed-printing-1',
          finishKey: 'reverse_holo',
        ),
        requiredQuantity: 2,
      );

      expect(draft.finish.label, 'Reverse Holo');
      expect(draft.toWireJson(), <String, dynamic>{
        'card_print_id': 'canonical-card-1',
        'card_printing_id': 'governed-printing-1',
        'required_quantity': 2,
      });
      expect(draft.toWireJson(), isNot(contains('name')));
      expect(draft.toWireJson(), isNot(contains('finish_label')));
    });

    test('hosted-cover capability is server-authored checklist data', () {
      final item = BinderChecklistItem.fromJson(<String, dynamic>{
        'slot_id': 'slot-hosted-1',
        'card_print_id': 'canonical-card-1',
        'name': 'Pikachu',
        'required_quantity': 1,
        'active_quantity': 0,
        'card': <String, dynamic>{'hosted_image': true},
      });

      expect(item.hasHostedImage, isTrue);
    });

    test('owner transfer can explicitly leave the former owner out', () {
      final offer = BinderOwnerTransferOffer.fromJson(<String, dynamic>{
        'offer_id': 'offer-1',
        'target_member_id': 'member-2',
        'former_owner_role': 'leave',
      });

      expect(
        offer.formerOwnerDisposition,
        BinderOwnerTransferDisposition.leave,
      );
      expect(offer.formerOwnerDisposition.leavesBinder, isTrue);
    });

    test('public safety capabilities fail closed when omitted', () {
      final omitted = BinderPermissions.fromJson(const <String, dynamic>{});
      final granted = BinderPermissions.fromJson(const <String, dynamic>{
        'can_report': true,
        'can_block_owner': true,
      });

      expect(omitted.canReport, isFalse);
      expect(omitted.canBlockOwner, isFalse);
      expect(granted.canReport, isTrue);
      expect(granted.canBlockOwner, isTrue);
    });

    test('consent revision mismatch requires a new explicit choice', () {
      final detail = BinderDetail.fromJson(<String, dynamic>{
        'binder': <String, dynamic>{
          ..._summaryJson(readAccess: 'public'),
          'external_projection_revision': 5,
        },
        'permissions': <String, dynamic>{},
        'consent': <String, dynamic>{
          'content_scope': 'public',
          'identity_scope': 'none',
          'content_revision': 4,
          'identity_revision': 4,
        },
      });

      expect(detail.externalProjectionRevision, 5);
      expect(detail.requiresContentConsent, isTrue);
      expect(detail.requiresIdentityConsent, isTrue);
    });

    test(
      'parses the external detail envelope without private policy fields',
      () {
        final detail = BinderDetail.fromJson(<String, dynamic>{
          'binder': <String, dynamic>{
            'id': 'binder-public-1',
            'public_id': 'binder-public-1',
            'title': 'Public Pikachu Binder',
            'target_kind': 'species',
            'target_label': 'Pikachu',
            'checklist_mode': 'card_prints',
            'read_access': 'public',
            'discoverability': 'listed',
            'lifecycle': 'active',
            'is_external_projection': true,
          },
          'progress': <String, dynamic>{
            'external': <String, dynamic>{
              'completed_slots': 12,
              'total_slots': 30,
              'unit': 'card_prints',
            },
          },
          'member_summary': <String, dynamic>{'contributor_count': 4},
          'viewer': <String, dynamic>{
            'can_request_to_join': false,
            'join_request_status': 'pending',
            'join_request_id': 'request-opaque-1',
          },
        });

        expect(detail.summary.progressLabel, '12 of 30 card prints');
        expect(detail.summary.memberCount, 4);
        expect(detail.joinRequestState, BinderJoinRequestState.pending);
        expect(detail.pendingJoinRequest?.id, 'request-opaque-1');
        expect(detail.canRequestToJoin, isFalse);
      },
    );

    test(
      'dashboard cache excludes invitations, tokens, and legacy actions',
      () {
        final page = BinderLibraryPage(
          binders: <BinderSummary>[BinderSummary.fromJson(_summaryJson())],
          invitations: const <BinderInvitation>[
            BinderInvitation(
              id: 'invite-1',
              state: BinderInvitationState.pending,
              maximumRole: BinderRole.contributor,
              plaintextToken: 'never-cache-this-token',
            ),
          ],
          suspendedBinders: const <BinderSuspendedAccess>[
            BinderSuspendedAccess(publicId: 'suspended-public-id'),
          ],
          legacyCandidates: const <BinderLegacyCandidate>[],
        );

        final encoded = page.encodeForCache();
        final decoded = BinderLibraryPage.decodeCache(encoded);
        final json = jsonDecode(encoded) as Map<String, dynamic>;

        expect(json.keys, unorderedEquals(<String>['binders', 'loaded_at']));
        expect(encoded, isNot(contains('never-cache-this-token')));
        expect(decoded?.binders.single.title, 'Pikachu Family Binder');
        expect(decoded?.invitations, isEmpty);
        expect(decoded?.suspendedBinders, isEmpty);
        expect(decoded?.legacyCandidates, isEmpty);
      },
    );

    test('library sections are mutually exclusive collector lanes', () {
      final owned = BinderSummary.fromJson(_summaryJson());
      final shared = BinderSummary.fromJson(
        _summaryJson(
          id: 'shared-id',
          publicId: 'shared-public-id',
          role: 'contributor',
        ),
      );
      final sharedComplete = BinderSummary.fromJson(
        _summaryJson(
          id: 'shared-complete-id',
          publicId: 'shared-complete-public-id',
          role: 'viewer',
          completed: 25,
          total: 25,
        ),
      );
      final page = BinderLibraryPage(
        binders: <BinderSummary>[owned, shared, sharedComplete],
      );

      expect(page.continueBuilding, <BinderSummary>[owned]);
      expect(page.sharedWithMe, <BinderSummary>[shared]);
      expect(page.completed, <BinderSummary>[sharedComplete]);
    });

    test(
      'immediate invite and view-link responses keep safe display fields',
      () {
        final invitation =
            BinderInvitation.fromCreateResponseJson(<String, dynamic>{
              'invitation_id': '106a4510-59ac-4a3e-95b9-38da2b2ca417',
              'state': 'pending',
              'maximum_role': 'contributor',
              'binder_public_id': '00112233-4455-0677-0899-aabbccddeeff',
              'binder_title': 'Family Binder',
              'is_account_targeted': true,
              'plaintext_token': 'one-time-invite-token',
            });
        final viewLink =
            BinderViewLink.fromCreateOrRotateResponseJson(<String, dynamic>{
              'view_link_id': '206a4510-59ac-4a3e-95b9-38da2b2ca417',
              'binder_public_id': '00112233-4455-0677-0899-aabbccddeeff',
              'label': 'Grandparents view',
              'plaintext_token': 'one-time-view-token-1',
              'url': 'https://grookaivault.com/b/one-time-view-token-1',
            });

        expect(invitation.maximumRole, BinderRole.contributor);
        expect(invitation.isAccountTargeted, isTrue);
        expect(invitation.binderTitle, 'Family Binder');
        expect(invitation.plaintextToken, 'one-time-invite-token');
        expect(viewLink.label, 'Grandparents view');
        expect(viewLink.plaintextToken, 'one-time-view-token-1');
        expect(
          viewLink.url,
          'https://grookaivault.com/b/one-time-view-token-1',
        );
      },
    );
  });

  group('Locked RPC vocabulary', () {
    test('uses versioned read and mutation endpoints', () {
      expect(BinderRpc.dashboard, 'binder_dashboard_v1');
      expect(BinderRpc.detail, 'binder_detail_v1');
      expect(BinderRpc.checklist, 'binder_checklist_v1');
      expect(BinderRpc.inviteRespond, 'binder_invite_respond_v1');
      expect(BinderRpc.contributionRemove, 'binder_contribution_remove_v1');
      expect(BinderRpc.blockOwner, 'binder_block_owner_v1');
      expect(BinderRpc.blockMember, 'binder_block_member_v1');
      expect(BinderRpc.invitationInbox, 'binder_invitation_inbox_v1');
      expect(BinderRpc.pendingContributions, 'binder_pending_contributions_v1');
      expect(BinderRpc.publicActionReport, 'binder_public_action_report_v1');
      expect(BinderRpc.publicMemberBlock, 'binder_public_member_block_v1');
      expect(BinderRpc.pulseMilestoneShare, 'binder_pulse_milestone_share_v1');
      expect(BinderParam.publicId, 'p_public_id');
      expect(BinderParam.idempotencyKey, 'p_idempotency_key');
    });

    test('preserves required explicit nulls and removes optional nulls', () {
      final metadata = BinderRpc.compactRequestParams(
        BinderRpc.updateMetadata,
        <String, dynamic>{
          'p_title': 'Pikachu',
          'p_cover_card_print_id': null,
          'p_optional_unused': null,
        },
      );
      final preferences = BinderRpc.compactRequestParams(
        BinderRpc.memberPreferences,
        <String, dynamic>{
          'p_public_id': 'binder-public-1',
          'p_alias': null,
          'p_optional_unused': null,
        },
      );
      final templateClone = BinderRpc.compactRequestParams(
        BinderRpc.templateClone,
        <String, dynamic>{
          'p_template_public_id': 'template-1',
          'p_version_number': null,
        },
      );
      final legacyDecision = BinderRpc.compactRequestParams(
        BinderRpc.legacyDecide,
        <String, dynamic>{'p_watch_id': 'watch-1', 'p_title': null},
      );

      expect(metadata, containsPair('p_cover_card_print_id', null));
      expect(metadata, isNot(contains('p_optional_unused')));
      expect(preferences, containsPair('p_alias', null));
      expect(preferences, isNot(contains('p_optional_unused')));
      expect(templateClone, containsPair('p_version_number', null));
      expect(legacyDecision, containsPair('p_title', null));
    });

    test('delete confirmation includes the current exact title', () {
      expect(
        binderDeleteConfirmation('Pikachu Family Binder'),
        'DELETE Pikachu Family Binder',
      );
    });
  });

  group('Binder cache logout integration', () {
    test('every auth clear path awaits Binder cache purge', () {
      final mainSource = File('lib/main.dart').readAsStringSync();
      final shellSource = File('lib/main_shell.dart').readAsStringSync();
      final recoveryStart = mainSource.indexOf(
        'Future<void> _clearInvalidPersistedSession()',
      );
      final recoveryEnd = mainSource.indexOf(
        'Future<void> _loadEnv()',
        recoveryStart,
      );
      final signOutStart = shellSource.indexOf('Future<void> _signOut()');
      final signOutEnd = shellSource.indexOf(
        'Future<T?> _pushPage',
        signOutStart,
      );

      expect(recoveryStart, greaterThanOrEqualTo(0));
      expect(signOutStart, greaterThanOrEqualTo(0));
      expect(
        mainSource.substring(recoveryStart, recoveryEnd),
        contains('await BinderPrivateCache.purgeCurrent()'),
      );
      expect(
        shellSource.substring(signOutStart, signOutEnd),
        contains('await BinderPrivateCache.purgeCurrent()'),
      );
    });
  });

  test('Realtime listens only to the sanitized Binder signal projection', () {
    final source = File(
      'lib/services/binders/binder_realtime_service.dart',
    ).readAsStringSync();

    expect(source, contains("table: 'binder_refresh_signals'"));
    expect(source, contains("column: 'binder_public_id'"));
    expect(source, isNot(contains("table: 'binders'")));
    expect(source, isNot(contains("table: 'binder_memberships'")));
    expect(source, isNot(contains("table: 'binder_contributions'")));
  });
}
