import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';

// Binder public IDs use all 128 random bits, so they are not constrained to a
// UUID version/variant layout.
const _publicId = '00112233-4455-0677-0899-aabbccddeeff';
const _targetId = '10112233-4455-6677-8899-aabbccddeeff';
const _slotId = '20112233-4455-6677-8899-aabbccddeeff';
const _cardPrintId = '30112233-4455-6677-8899-aabbccddeeff';
const _joinRequestId = '406a4510-59ac-4a3e-95b9-38da2b2ca417';
const _contributionActionRef = '506a4510-59ac-4a3e-95b9-38da2b2ca417';
const _memberActionRef = '606a4510-59ac-4a3e-95b9-38da2b2ca417';
const _invitationId = '706a4510-59ac-4a3e-95b9-38da2b2ca417';
const _viewLinkId = '806a4510-59ac-4a3e-95b9-38da2b2ca417';
const _canonicalImage =
    'https://grookaivault.com/api/canon/cards/GV-ME04-001/image';

Map<String, dynamic> _hostileChecklistItem() => <String, dynamic>{
  'slot_public_id': _slotId,
  'slot_id': '70112233-4455-6677-8899-aabbccddeeff',
  'position': 4,
  'card_print_id': _cardPrintId,
  'card_printing_id': '80112233-4455-6677-8899-aabbccddeeff',
  'gv_id': 'GV-CANONICAL-BUT-NOT-NEEDED',
  'gv_vi_id': 'GVVI-PRIVATE-COPY',
  'vault_item_instance_id': '90112233-4455-6677-8899-aabbccddeeff',
  'instance_id': 'a0112233-4455-6677-8899-aabbccddeeff',
  'member_id': 'b0112233-4455-6677-8899-aabbccddeeff',
  'name': '<b>Pikachu</b>',
  'set_label': 'Mega Evolution',
  'number': '026',
  'finish_label': 'Reverse Holo',
  'image_url': _canonicalImage,
  'hosted_image': true,
  'required_quantity': 2,
  'active_quantity': 1,
  'owned_eligible_count': 99,
  'contributed_by_you_count': 88,
  'pending_count': 77,
  'contribution_ids': <String>['private-contribution-id'],
  'pending_contribution_ids': <String>['private-pending-id'],
  'own_contribution_ids': <String>['private-own-id'],
  'removable_contribution_ids': <String>['private-remove-id'],
  'contributions': <Map<String, dynamic>>[
    <String, dynamic>{
      'contribution_id': 'private-contribution-id',
      'member_id': 'private-member-id',
      'vault_item_instance_id': 'private-copy-id',
      'can_remove': true,
    },
  ],
  'attribution_labels': <String>['Leaked collector name'],
  'contributors': <Map<String, dynamic>>[
    <String, dynamic>{
      'alias': 'Secret collector',
      'identity_visible': false,
      'member_id': 'private-member-id',
      'member_action_ref': _memberActionRef,
    },
    <String, dynamic>{
      'alias': '<i>Family Collector</i>',
      'identity_visible': true,
      'member_id': 'another-private-member-id',
    },
  ],
  'contribution_actions': <Map<String, dynamic>>[
    <String, dynamic>{
      'contribution_action_ref': _contributionActionRef,
      'member_action_ref': _memberActionRef,
      'alias': 'Hidden action alias',
      'identity_visible': false,
      'permissions': <String, dynamic>{'can_report': true, 'can_block': true},
      'vault_item_instance_id': 'private-copy-id',
      'member_id': 'private-member-id',
    },
    <String, dynamic>{
      'contribution_action_ref': _contributionActionRef,
      'member_action_ref': _memberActionRef,
      'identity_visible': true,
      'alias': 'String permission must fail closed',
      'permissions': <String, dynamic>{'can_report': 'true', 'can_block': 1},
    },
    <String, dynamic>{
      'contribution_action_ref': 'not-a-uuid',
      'member_action_ref': 'also-not-a-uuid',
      'permissions': <String, dynamic>{'can_report': true, 'can_block': true},
    },
  ],
  'contribution_actions_has_more': true,
  'needs_review': true,
  'unexpected_nested_authority': <String, dynamic>{
    'user_id': 'private-user-id',
    'email': 'private@example.com',
    'price': 999,
  },
};

Map<String, dynamic> _hostileDetailEnvelope() => <String, dynamic>{
  'ok': true,
  'binder': <String, dynamic>{
    'id': 'deadbeef-dead-dead-dead-deadbeefdead',
    'binder_id': 'private-binder-id',
    'public_id': _publicId,
    'title': '<b>Family Binder</b>',
    'description': '<script>unsafe()</script>A shared goal',
    'target_kind': 'species',
    'target': <String, dynamic>{
      'kind': 'species',
      'id': _targetId,
      'key': 'pikachu',
      'label': '<strong>Pikachu</strong>',
      'owner_user_id': 'private-owner-id',
    },
    'checklist_mode': 'card_prints',
    'read_access': 'public',
    'discoverability': 'listed',
    'join_policy': 'request_to_join',
    'contribution_policy': 'members_direct',
    'lifecycle': 'active',
    'moderated': true,
    'moderation_approved': true,
    'cover_image_url': _canonicalImage,
    'cover_card_print_id': 'private-cover-authority-id',
    'viewer_role': 'owner',
    'is_external_projection': false,
  },
  'progress': <String, dynamic>{
    'member': <String, dynamic>{
      'completed_slots': 999,
      'total_slots': 999,
      'unit': 'private_member_progress',
    },
    'external': <String, dynamic>{
      'completed_slots': 1,
      'total_slots': 3,
      'unit': 'card_prints',
      'member_id': 'private-member-id',
    },
  },
  'member_summary': <String, dynamic>{
    'contributor_count': 2,
    'member_count': 49,
    'pending_contribution_count': 48,
    'pending_join_request_count': 47,
  },
  'viewer': <String, dynamic>{
    'role': 'owner',
    'member_id': 'private-member-id',
    'user_id': 'private-user-id',
    'can_request_to_join': true,
    'join_request_status': 'pending',
    'join_request_id': _joinRequestId,
  },
  'permissions': <String, dynamic>{
    'can_report': true,
    'can_block_owner': true,
    'can_add_copy': true,
    'can_invite': true,
    'can_approve': true,
    'can_manage_members': true,
    'can_edit': true,
    'can_manage_policy': true,
    'can_transfer': true,
    'can_archive': true,
    'can_leave': true,
    'can_share': true,
  },
  'membership': <String, dynamic>{
    'alias': 'Private membership alias',
    'state': 'suspended',
    'epoch': 99,
    'notification_preference': 'immediate',
  },
  'consent': <String, dynamic>{
    'content_scope': 'public',
    'identity_scope': 'public',
    'content_revision': 99,
    'identity_revision': 99,
  },
  'view_links': <Map<String, dynamic>>[
    <String, dynamic>{'id': 'private-link-id', 'plaintext_token': 'secret'},
  ],
  'join_requests': <Map<String, dynamic>>[
    <String, dynamic>{'id': 'someone-elses-request'},
  ],
  'invitations': <Map<String, dynamic>>[
    <String, dynamic>{'id': 'private-invite', 'plaintext_token': 'secret'},
  ],
  'owner_transfer_offer': <String, dynamic>{
    'id': 'private-offer',
    'target_member_id': 'private-member-id',
  },
  'checklist_page': <String, dynamic>{
    'items': <Map<String, dynamic>>[_hostileChecklistItem()],
    'next_position': 4,
    'next_cursor': <String, dynamic>{
      'position': 4,
      'member_id': 'private-member-cursor',
      'id': 'private-cursor-id',
    },
    'member_completed_slots': 999,
    'external_completed_slots': 1,
  },
  'unexpected_root_authority': <String, dynamic>{
    'auth_user_id': 'private-user-id',
    'email': 'private@example.com',
  },
};

Map<String, dynamic> _exploreRow({
  String publicId = _publicId,
  String coverImageUrl = _canonicalImage,
}) => <String, dynamic>{
  'id': 'private-binder-row-id',
  'binder_id': 'private-binder-authority-id',
  'public_id': publicId,
  'title': '<b>Community Pikachu Binder</b>',
  'description': List<String>.filled(1100, 'd').join(),
  'target_kind': 'species',
  'target_label': 'Pikachu',
  'target_key': 'pikachu',
  'target_id': 'private-target-id',
  'checklist_mode': 'card_prints',
  'completed_slots': 4,
  'total_slots': 10,
  'member_count': 9,
  'pending_approval_count': 99,
  'viewer_role': 'owner',
  'read_access': 'public',
  'discoverability': 'listed',
  'join_policy': 'request_to_join',
  'contribution_policy': 'members_direct',
  'lifecycle': 'active',
  'moderation_state': 'clear',
  'cover_image_url': coverImageUrl,
  'owner_user_id': 'private-owner-user-id',
  'binder': <String, dynamic>{
    'public_id': publicId,
    'title': 'Community Pikachu Binder',
    'description': 'nested description',
    'target_kind': 'species',
    'target': <String, dynamic>{
      'id': 'private-target-id',
      'key': 'pikachu',
      'label': 'Pikachu',
      'owner_user_id': 'private-owner-id',
    },
    'checklist_mode': 'card_prints',
    'discoverability': 'listed',
    'moderated': true,
    'cover_image_url': coverImageUrl,
    'membership': <String, dynamic>{
      'role': 'owner',
      'member_id': 'private-member-id',
    },
  },
  'progress': <String, dynamic>{
    'completed_slots': 4,
    'total_slots': 10,
    'unit': 'card_prints',
    'member': <String, dynamic>{'completed_slots': 999},
  },
  'member_summary': <String, dynamic>{
    'contributor_count': 3,
    'member_count': 49,
    'pending_contribution_count': 48,
  },
  'permissions': <String, dynamic>{
    'can_add_copy': true,
    'can_manage_members': true,
  },
  'checklist': <Map<String, dynamic>>[_hostileChecklistItem()],
};

Map<String, dynamic> _templateRow({
  String publicId = _publicId,
  String coverImageUrl = _canonicalImage,
  int? adoptionCount = 6,
}) => <String, dynamic>{
  'id': 'private-template-row-id',
  'template_id': 'private-template-authority-id',
  'template_public_id': publicId,
  'public_id': publicId,
  'title': '<b>Family Template</b>',
  'description': List<String>.filled(1100, 't').join(),
  'target_kind': 'species',
  'target': <String, dynamic>{
    'id': 'private-target-id',
    'owner_user_id': 'private-owner-id',
  },
  'checklist_slot_count': 5000,
  'slot_count': 5000,
  'version_number': 2000000,
  'version': 2000000,
  'adoption_count': adoptionCount,
  'is_system': true,
  'authority_kind': 'private-author-user',
  'author_user_id': 'private-author-user-id',
  'cover_image_url': coverImageUrl,
  'definition': <String, dynamic>{
    'members': <String>['private-member-id'],
    'vault_item_instance_id': 'private-copy-id',
  },
};

void main() {
  group('external Binder mobile allow-lists', () {
    test(
      'public detail keeps display data and drops member/copy authority fields',
      () {
        final detail = BinderDetail.fromExternalJson(
          _hostileDetailEnvelope(),
          audience: BinderExternalAudience.public,
          authenticatedViewer: true,
        );

        expect(detail.summary.id, _publicId);
        expect(detail.summary.publicId, _publicId);
        expect(detail.summary.title, 'Family Binder');
        expect(detail.summary.description, 'unsafe()A shared goal');
        expect(detail.summary.targetId, _targetId);
        expect(detail.summary.targetKey, 'pikachu');
        expect(detail.summary.targetLabel, 'Pikachu');
        expect(detail.summary.role, BinderRole.viewer);
        expect(detail.summary.joinPolicy, BinderJoinPolicy.closed);
        expect(
          detail.summary.contributionPolicy,
          BinderContributionPolicy.ownerOnly,
        );
        expect(detail.summary.completedSlots, 1);
        expect(detail.summary.totalSlots, 3);
        expect(detail.summary.memberCount, 2);
        expect(detail.summary.pendingApprovalCount, 0);
        expect(detail.summary.coverImageUrl, _canonicalImage);
        expect(detail.summary.isExternalProjection, isTrue);

        expect(detail.alias, isNull);
        expect(detail.membershipEpoch, 1);
        expect(detail.contentConsent, BinderConsentScope.none);
        expect(detail.identityConsent, BinderConsentScope.none);
        expect(detail.coverCardPrintId, isNull);
        expect(detail.pendingJoinRequestCount, 0);
        expect(detail.notificationPreference, 'digest');
        expect(detail.viewLinks, isEmpty);
        expect(detail.pendingJoinRequests, isEmpty);
        expect(detail.pendingInvitations, isEmpty);
        expect(detail.ownerTransferOffer, isNull);
        expect(detail.permissions.canReport, isTrue);
        expect(detail.permissions.canBlockOwner, isTrue);
        expect(detail.permissions.canAddCopy, isFalse);
        expect(detail.permissions.canInvite, isFalse);
        expect(detail.permissions.canApprove, isFalse);
        expect(detail.permissions.canManageMembers, isFalse);
        expect(detail.permissions.canEdit, isFalse);
        expect(detail.permissions.canManagePolicy, isFalse);
        expect(detail.permissions.canTransfer, isFalse);
        expect(detail.permissions.canArchive, isFalse);
        expect(detail.permissions.canLeave, isFalse);
        expect(detail.permissions.canShare, isFalse);

        expect(detail.joinRequestState, BinderJoinRequestState.pending);
        expect(detail.pendingJoinRequest?.id, _joinRequestId);
        expect(detail.canRequestToJoin, isFalse);

        final page = detail.externalChecklist;
        expect(page.items, hasLength(1));
        expect(page.nextCursor?.position, 4);
        expect(page.nextCursor?.memberId, isNull);
        expect(page.memberCompletedSlots, isNull);
        final item = page.items.single;
        expect(item.slotId, _slotId);
        expect(item.cardPrintId, _cardPrintId);
        expect(item.cardPrintingId, isNull);
        expect(item.gvId, isNull);
        expect(item.name, 'Pikachu');
        expect(item.imageUrl, _canonicalImage);
        expect(item.hasHostedImage, isTrue);
        expect(item.requiredQuantity, 2);
        expect(item.activeQuantity, 1);
        expect(item.ownedEligibleCount, 0);
        expect(item.contributedByYouCount, 0);
        expect(item.pendingCount, 0);
        expect(item.contributions, isEmpty);
        expect(item.contributionIds, isEmpty);
        expect(item.pendingContributionIds, isEmpty);
        expect(item.ownContributionIds, isEmpty);
        expect(item.removableContributionIds, isEmpty);
        expect(item.attributionLabels, <String>[
          'A Binder member',
          'Family Collector',
        ]);
        expect(item.publicContributionActions, hasLength(1));
        final action = item.publicContributionActions.single;
        expect(action.contributionActionReference, _contributionActionRef);
        expect(action.memberActionReference, _memberActionRef);
        expect(action.alias, isNull);
        expect(action.canReport, isTrue);
        expect(action.canBlock, isTrue);
        expect(item.publicContributionActionsHaveMore, isTrue);
        expect(item.needsReview, isTrue);
      },
    );

    test('view-link detail force-drops join and every action capability', () {
      final detail = BinderDetail.fromExternalJson(
        _hostileDetailEnvelope(),
        audience: BinderExternalAudience.viewLink,
        authenticatedViewer: true,
      );

      expect(detail.summary.readAccess, BinderReadAccess.link);
      expect(detail.summary.discoverability, BinderDiscoverability.unlisted);
      expect(detail.permissions.canReport, isFalse);
      expect(detail.permissions.canBlockOwner, isFalse);
      expect(detail.canRequestToJoin, isFalse);
      expect(detail.joinRequestState, isNull);
      expect(detail.pendingJoinRequest, isNull);
      expect(
        detail.externalChecklist.items.single.publicContributionActions,
        isEmpty,
      );
      expect(
        detail.externalChecklist.items.single.publicContributionActionsHaveMore,
        isFalse,
      );
      expect(detail.externalChecklist.items.single.attributionLabels, <String>[
        'A Binder member',
        'Family Collector',
      ]);
    });

    test('anonymous public parsing rejects action refs and unsafe images', () {
      final hostileUrls = <String>[
        'https://provider.example/card.png',
        'http://grookaivault.com/api/canon/cards/GV-ME04-001/image',
        'https://www.grookaivault.com/api/canon/cards/GV-ME04-001/image',
        'https://grookaivault.com.evil.example/api/canon/cards/GV-ME04-001/image',
        'https://user:pass@grookaivault.com/api/canon/cards/GV-ME04-001/image',
        'https://grookaivault.com:444/api/canon/cards/GV-ME04-001/image',
        'https://grookaivault.com/api/canon/cards/GV-ME04-001/image?next=evil',
        'https://grookaivault.com/api/canon/cards/GV-ME04-001/image#secret',
        'https://grookaivault.com/api/canon/cards/%2e%2e/image',
        'https://localhost/api/canon/cards/GV-ME04-001/image',
      ];
      final items = <Map<String, dynamic>>[
        for (var index = 0; index < hostileUrls.length; index++)
          <String, dynamic>{
            ..._hostileChecklistItem(),
            'slot_public_id':
                '${(index + 1).toRadixString(16).padLeft(8, '0')}-'
                '4455-6677-8899-aabbccddeeff',
            'image_url': hostileUrls[index],
            'card': <String, dynamic>{'image_url': hostileUrls[index]},
          },
      ];
      final page = BinderChecklistPage.fromExternalJson(<String, dynamic>{
        'items': items,
        'has_more': true,
        'next_cursor': <String, dynamic>{
          'member_id': 'private-member-id',
          'id': 'private-id',
        },
      }, audience: BinderExternalAudience.public);

      expect(page.items, hasLength(hostileUrls.length));
      expect(page.items.every((item) => item.imageUrl == null), isTrue);
      expect(
        page.items.every((item) => item.publicContributionActions.isEmpty),
        isTrue,
      );
      expect(page.hasMore, isFalse);
      expect(page.nextCursor, isNull);
    });

    test('public contributor and action overlays are bounded to 20 rows', () {
      final item = _hostileChecklistItem();
      item['contributors'] = <Map<String, dynamic>>[
        for (var index = 0; index < 25; index++)
          <String, dynamic>{
            'identity_visible': true,
            'alias': 'Collector $index',
          },
      ];
      item['contribution_actions'] = <Map<String, dynamic>>[
        for (var index = 0; index < 25; index++)
          <String, dynamic>{
            'contribution_action_ref':
                '${(index + 1).toRadixString(16).padLeft(8, '0')}-'
                '59ac-4a3e-95b9-38da2b2ca417',
            'member_action_ref':
                '${(index + 101).toRadixString(16).padLeft(8, '0')}-'
                '82cb-44cc-8243-93538f80df77',
            'permissions': <String, dynamic>{
              'can_report': true,
              'can_block': true,
            },
          },
      ];
      final page = BinderChecklistPage.fromExternalJson(
        <String, dynamic>{
          'items': <Map<String, dynamic>>[item],
        },
        audience: BinderExternalAudience.public,
        authenticatedViewer: true,
      );

      expect(page.items.single.attributionLabels, hasLength(20));
      expect(page.items.single.publicContributionActions, hasLength(20));
    });

    test('external cover URLs use the same canonical first-party boundary', () {
      final envelope = _hostileDetailEnvelope();
      final binder = envelope['binder']! as Map<String, dynamic>;
      binder['cover_image_url'] =
          'https://provider.example/private-copy-image.png';
      final detail = BinderDetail.fromExternalJson(
        envelope,
        audience: BinderExternalAudience.public,
        authenticatedViewer: true,
      );

      expect(detail.summary.coverImageUrl, isNull);
    });

    test('invitation preview never retains bearer or authority fields', () {
      final expiry = DateTime.now()
          .toUtc()
          .add(const Duration(days: 7))
          .toIso8601String();
      final invitation = BinderInvitation.fromPreviewJson(<String, dynamic>{
        'id': 'private-invitation-id',
        'invitation_id': 'another-private-invitation-id',
        'token': 'root-plaintext-bearer',
        'plaintext_token': 'root-plaintext-bearer',
        'state': 'active',
        'maximum_role': 'manager',
        'binder_public_id': _publicId,
        'binder_title': '<b>${List<String>.filled(100, 'B').join()}</b>',
        'inviter_label': '<i>${List<String>.filled(60, 'I').join()}</i>',
        'expires_at': expiry,
        'is_account_targeted': 'true',
        'privacy_copy':
            '<script>hidden()</script>'
            '${List<String>.filled(400, 'P').join()}',
        'invitation': <String, dynamic>{
          'id': 'nested-private-invitation-id',
          'member_id': 'private-member-id',
          'token': 'nested-plaintext-bearer',
          'plaintext_token': 'nested-plaintext-bearer',
          'maximum_role': 'owner',
        },
        'binder': <String, dynamic>{
          'id': 'private-binder-id',
          'public_id': _publicId,
          'owner_user_id': 'private-owner-id',
          'title': 'Nested Binder title',
        },
      });

      expect(invitation.id, isEmpty);
      expect(invitation.plaintextToken, isNull);
      expect(invitation.binderPublicId, _publicId);
      expect(invitation.state, BinderInvitationState.pending);
      expect(invitation.maximumRole, BinderRole.manager);
      expect(invitation.binderTitle, hasLength(80));
      expect(invitation.binderTitle, isNot(contains('<')));
      expect(invitation.inviterLabel, hasLength(40));
      expect(invitation.inviterLabel, isNot(contains('<')));
      expect(invitation.expiresAt, isNotNull);
      expect(invitation.isAccountTargeted, isFalse);
      expect(invitation.privacyCopy, hasLength(300));
      expect(invitation.privacyCopy, isNot(contains('<')));
    });

    test(
      'member inbox, dashboard, and detail reads always discard bearers',
      () {
        final hostileInvitation = <String, dynamic>{
          'id': _invitationId,
          'invitation_id': _invitationId,
          'state': 'pending',
          'maximum_role': 'manager',
          'binder_public_id': _publicId,
          'binder_title': '<b>${List<String>.filled(100, 'B').join()}</b>',
          'inviter_label': '<i>${List<String>.filled(100, 'I').join()}</i>',
          'expires_at': DateTime.now()
              .toUtc()
              .add(const Duration(days: 7))
              .toIso8601String(),
          'is_account_targeted': 'true',
          'token': 'member-read-root-token-123456',
          'plaintext_token': 'member-read-root-token-123456',
          'invitation': <String, dynamic>{
            'token': 'nested-member-read-token-123456',
            'plaintext_token': 'nested-member-read-token-123456',
            'intended_user_id': 'private-user-id',
          },
        };
        final inboxInvitation = BinderInvitation.fromMemberReadJson(
          hostileInvitation,
        );
        final dashboard = BinderLibraryPage.fromJson(<String, dynamic>{
          'binders': const <Map<String, dynamic>>[],
          'invitations': <Map<String, dynamic>>[hostileInvitation],
        });

        final detailEnvelope = _hostileDetailEnvelope();
        detailEnvelope['view_links'] = <Map<String, dynamic>>[
          <String, dynamic>{
            'id': _viewLinkId,
            'view_link_id': _viewLinkId,
            'label': '<b>${List<String>.filled(100, 'L').join()}</b>',
            'expires_at': '2026-08-01T12:00:00Z',
            'token': 'detail-view-link-token-123456',
            'plaintext_token': 'detail-view-link-token-123456',
            'url': 'https://grookaivault.com/b/detail-view-link-token-123456',
            'authority': <String, dynamic>{
              'token': 'nested-detail-view-link-token-123456',
              'created_by_user_id': 'private-user-id',
            },
          },
        ];
        detailEnvelope['invitations'] = <Map<String, dynamic>>[
          hostileInvitation,
        ];
        final detail = BinderDetail.fromJson(detailEnvelope);

        for (final invitation in <BinderInvitation>[
          inboxInvitation,
          dashboard.invitations.single,
          detail.pendingInvitations.single,
        ]) {
          expect(invitation.id, _invitationId);
          expect(invitation.binderPublicId, _publicId);
          expect(invitation.binderTitle, hasLength(80));
          expect(invitation.binderTitle, isNot(contains('<')));
          expect(invitation.inviterLabel, hasLength(80));
          expect(invitation.inviterLabel, isNot(contains('<')));
          expect(invitation.isAccountTargeted, isFalse);
          expect(invitation.plaintextToken, isNull);
        }

        final link = detail.viewLinks.single;
        expect(link.id, _viewLinkId);
        expect(link.label, hasLength(80));
        expect(link.label, isNot(contains('<')));
        expect(link.plaintextToken, isNull);
        expect(link.url, isNull);

        final nestedText = BinderInvitation.fromMemberReadJson(
          <String, dynamic>{
            'id': _invitationId,
            'state': 'pending',
            'binder_public_id': _publicId,
            'binder_title': <String, dynamic>{
              'plaintext_token': 'nested-title-token-123456',
            },
            'inviter_label': <String>['nested-inviter-token-123456'],
          },
        );
        expect(nestedText.binderTitle, isNull);
        expect(nestedText.inviterLabel, isNull);

        final nestedLinkLabel = BinderViewLink.fromMemberReadJson(
          <String, dynamic>{
            'id': _viewLinkId,
            'label': <String, dynamic>{
              'plaintext_token': 'nested-label-token-123456',
            },
          },
        );
        expect(nestedLinkLabel.label, 'View-only link');
        expect(nestedLinkLabel.plaintextToken, isNull);
      },
    );

    test('only explicit mutation factories retain strict one-time bearers', () {
      const inviteToken = 'invite_Capability-0123456789';
      final invitation =
          BinderInvitation.fromCreateResponseJson(<String, dynamic>{
            'invitation_id': _invitationId,
            'binder_public_id': _publicId,
            'state': 'pending',
            'maximum_role': 'contributor',
            'token': inviteToken,
          });
      expect(invitation.plaintextToken, inviteToken);

      const viewToken = 'view_Capability-01234567890';
      final link =
          BinderViewLink.fromCreateOrRotateResponseJson(<String, dynamic>{
            'view_link_id': _viewLinkId,
            'binder_public_id': _publicId,
            'label': 'Family view',
            'token': viewToken,
            'url': 'https://grookaivault.com/b/$viewToken',
          });
      expect(link.plaintextToken, viewToken);
      expect(link.url, 'https://grookaivault.com/b/$viewToken');

      for (final invalidToken in <String>[
        'too-short',
        'contains.standard.base64=',
        ' leading-base64url-token-12345',
        'jwt.style.token-is-not-allowed',
        List<String>.filled(257, 'a').join(),
      ]) {
        final invalidInvitation =
            BinderInvitation.fromCreateResponseJson(<String, dynamic>{
              'invitation_id': _invitationId,
              'binder_public_id': _publicId,
              'state': 'pending',
              'maximum_role': 'contributor',
              'token': invalidToken,
            });
        final invalidLink =
            BinderViewLink.fromCreateOrRotateResponseJson(<String, dynamic>{
              'view_link_id': _viewLinkId,
              'binder_public_id': _publicId,
              'token': invalidToken,
              'url': 'https://grookaivault.com/b/$invalidToken',
            });
        expect(invalidInvitation.plaintextToken, isNull);
        expect(invalidLink.plaintextToken, isNull);
        expect(invalidLink.url, isNull);
      }

      final mismatchedUrl =
          BinderViewLink.fromCreateOrRotateResponseJson(<String, dynamic>{
            'view_link_id': _viewLinkId,
            'binder_public_id': _publicId,
            'token': viewToken,
            'url': 'https://evil.example/b/$viewToken',
          });
      expect(mismatchedUrl.plaintextToken, viewToken);
      expect(mismatchedUrl.url, isNull);

      final invalidAuthority =
          BinderInvitation.fromCreateResponseJson(<String, dynamic>{
            'invitation_id': 'not-a-uuid',
            'binder_public_id': _publicId,
            'state': 'pending',
            'token': inviteToken,
          });
      expect(invalidAuthority.id, isEmpty);
      expect(invalidAuthority.plaintextToken, isNull);

      final nonPending =
          BinderInvitation.fromCreateResponseJson(<String, dynamic>{
            'invitation_id': _invitationId,
            'binder_public_id': _publicId,
            'state': 'active',
            'token': inviteToken,
          });
      expect(nonPending.state, BinderInvitationState.pending);
      expect(nonPending.plaintextToken, isNull);

      final invalidLinkAuthority =
          BinderViewLink.fromCreateOrRotateResponseJson(<String, dynamic>{
            'view_link_id': 'not-a-uuid',
            'binder_public_id': _publicId,
            'token': viewToken,
          });
      expect(invalidLinkAuthority.id, isEmpty);
      expect(invalidLinkAuthority.plaintextToken, isNull);
    });

    test('Explore accepts only moderated listed public summaries', () {
      final summary = BinderSummary.tryFromExternalExploreJson(_exploreRow());
      expect(summary, isNotNull);
      expect(summary!.id, _publicId);
      expect(summary.publicId, _publicId);
      expect(summary.title, 'Community Pikachu Binder');
      expect(summary.description, hasLength(1000));
      expect(summary.targetId, isNull);
      expect(summary.targetKey, 'pikachu');
      expect(summary.role, BinderRole.viewer);
      expect(summary.readAccess, BinderReadAccess.public);
      expect(summary.discoverability, BinderDiscoverability.listed);
      expect(summary.joinPolicy, BinderJoinPolicy.closed);
      expect(summary.contributionPolicy, BinderContributionPolicy.ownerOnly);
      expect(summary.pendingApprovalCount, 0);
      expect(summary.completedSlots, 4);
      expect(summary.totalSlots, 10);
      expect(summary.memberCount, 3);
      expect(summary.coverImageUrl, _canonicalImage);
      expect(summary.isExternalProjection, isTrue);

      final unsafeImage = BinderSummary.tryFromExternalExploreJson(
        _exploreRow(coverImageUrl: 'https://provider.example/card.png'),
      );
      expect(unsafeImage?.coverImageUrl, isNull);

      for (final mutation in <void Function(Map<String, dynamic>)>[
        (row) => row['read_access'] = 'link',
        (row) => row['discoverability'] = 'unlisted',
        (row) => row['lifecycle'] = 'archived',
        (row) => row['moderation_state'] = 'forced_unlisted',
        (row) => (row['binder'] as Map<String, dynamic>)['moderated'] = false,
        (row) => (row['binder'] as Map<String, dynamic>)['public_id'] =
            'different-public-id',
      ]) {
        final row = _exploreRow();
        mutation(row);
        expect(BinderSummary.tryFromExternalExploreJson(row), isNull);
      }
    });

    test('Explore rows and cursors are bounded and field-specific', () {
      final items = BinderSummary.externalExploreItems(<Map<String, dynamic>>[
        for (var index = 0; index < 25; index++)
          _exploreRow(
            publicId:
                '${(index + 1).toRadixString(16).padLeft(8, '0')}-'
                '4455-0677-0899-aabbccddeeff',
          ),
      ]);
      expect(items, hasLength(20));

      final cursor = BinderCursor.fromExternalCreatedCursor(<String, dynamic>{
        'id': '706a4510-59ac-4a3e-95b9-38da2b2ca417',
        'created_at': '2026-07-23T12:00:00Z',
        'member_id': 'private-member-id',
        'instance_id': 'private-copy-id',
        'requested_at': '2026-07-23T12:00:00Z',
      });
      expect(cursor?.id, '706a4510-59ac-4a3e-95b9-38da2b2ca417');
      expect(cursor?.createdAt, DateTime.utc(2026, 7, 23, 12));
      expect(cursor?.memberId, isNull);
      expect(cursor?.instanceId, isNull);
      expect(cursor?.requestedAt, isNull);
    });

    test('Template list/detail parsing drops authority and bounds fields', () {
      final template = BinderTemplate.tryFromExternalJson(_templateRow());
      expect(template, isNotNull);
      expect(template!.id, _publicId);
      expect(template.title, 'Family Template');
      expect(template.description, hasLength(1000));
      expect(template.targetKind, BinderTargetKind.species);
      expect(template.slotCount, 1000);
      expect(template.version, 1000000);
      expect(template.coverImageUrl, _canonicalImage);
      expect(template.adoptionCount, 6);
      expect(template.isSystem, isFalse);

      final underThreshold = BinderTemplate.tryFromExternalJson(
        _templateRow(adoptionCount: 4),
      );
      expect(underThreshold?.adoptionCount, isNull);
      final unsafeImage = BinderTemplate.tryFromExternalJson(
        _templateRow(coverImageUrl: 'https://provider.example/template.png'),
      );
      expect(unsafeImage?.coverImageUrl, isNull);

      final templates = BinderTemplate.externalItems(<Map<String, dynamic>>[
        for (var index = 0; index < 25; index++)
          _templateRow(
            publicId:
                '${(index + 1).toRadixString(16).padLeft(8, '0')}-'
                '4455-0677-0899-aabbccddeeff',
          ),
      ]);
      expect(templates, hasLength(20));
      expect(
        BinderTemplate.tryFromExternalJson(<String, dynamic>{
          ..._templateRow(),
          'template_public_id': 'not-a-uuid',
          'public_id': 'also-not-a-uuid',
        }),
        isNull,
      );
    });

    test('Template checklist is canonical-only and drops all authority', () {
      final hostile = _hostileChecklistItem();
      hostile['active_quantity'] = 99;
      hostile['image_url'] = 'https://provider.example/private-copy-image.png';
      hostile['card'] = <String, dynamic>{
        'image_url': 'https://provider.example/private-copy-image.png',
        'vault_item_instance_id': 'private-copy-id',
      };
      final hostilePage = BinderChecklistPage.fromExternalJson(
        <String, dynamic>{
          'items': <Map<String, dynamic>>[hostile],
        },
        audience: BinderExternalAudience.template,
        authenticatedViewer: true,
      );
      final item = hostilePage.items.single;
      expect(item.cardPrintingId, isNull);
      expect(item.gvId, isNull);
      expect(item.imageUrl, isNull);
      expect(item.activeQuantity, 0);
      expect(item.ownedEligibleCount, 0);
      expect(item.contributedByYouCount, 0);
      expect(item.pendingCount, 0);
      expect(item.contributions, isEmpty);
      expect(item.publicContributionActions, isEmpty);
      expect(item.publicContributionActionsHaveMore, isFalse);
      expect(item.contributionIds, isEmpty);
      expect(item.pendingContributionIds, isEmpty);
      expect(item.ownContributionIds, isEmpty);
      expect(item.removableContributionIds, isEmpty);
      expect(item.attributionLabels, isEmpty);
      expect(item.needsReview, isFalse);

      final boundedPage = BinderChecklistPage.fromExternalJson(
        <String, dynamic>{
          'items': <Map<String, dynamic>>[
            for (var index = 0; index < 55; index++)
              <String, dynamic>{
                ..._hostileChecklistItem(),
                'slot_public_id':
                    '${(index + 1).toRadixString(16).padLeft(8, '0')}-'
                    '4455-0677-8899-aabbccddeeff',
              },
          ],
        },
        audience: BinderExternalAudience.template,
      );
      expect(boundedPage.items, hasLength(50));

      final malformedPage = BinderChecklistPage.fromExternalJson(
        <String, dynamic>{
          'items': <Map<String, dynamic>>[
            <String, dynamic>{
              ..._hostileChecklistItem(),
              'slot_public_id': 'not-a-uuid',
              'slot_id': 'also-not-a-uuid',
            },
          ],
        },
        audience: BinderExternalAudience.template,
      );
      expect(malformedPage.items, isEmpty);
    });

    test('repository external reads never call the generic member parsers', () {
      final source = File(
        'lib/services/binders/binder_repository.dart',
      ).readAsStringSync();

      expect('BinderDetail.fromExternalJson'.allMatches(source), hasLength(2));
      expect(
        'BinderChecklistPage.fromExternalJson'.allMatches(source),
        hasLength(3),
      );
      expect(
        'authenticatedViewer: currentUserId != null'.allMatches(source),
        hasLength(2),
      );
      expect(source, isNot(contains('_detailFromEnvelope(json, external:')));
      expect(source, contains('BinderInvitation.fromPreviewJson(json)'));
      expect(
        source,
        contains('_page(json, BinderInvitation.fromMemberReadJson)'),
      );
      expect(source, contains('BinderInvitation.fromCreateResponseJson(json)'));
      expect(
        'BinderViewLink.fromCreateOrRotateResponseJson(json)'.allMatches(
          source,
        ),
        hasLength(2),
      );
      expect(source, isNot(contains('BinderInvitation.fromJson')));
      expect(source, isNot(contains('BinderViewLink.fromJson')));
      expect(
        source,
        contains("BinderSummary.externalExploreItems(json['items'])"),
      );
      expect(source, contains("BinderTemplate.externalItems(json['items'])"));
      expect(source, contains('BinderTemplate.tryFromExternalJson('));
      expect(source, contains('audience: BinderExternalAudience.template'));
      expect(source, isNot(contains('_page(json, BinderSummary.fromJson)')));
      expect(source, isNot(contains('_page(json, BinderTemplate.fromJson)')));
    });
  });
}
