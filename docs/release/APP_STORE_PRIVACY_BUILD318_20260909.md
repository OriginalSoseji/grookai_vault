# Build318 Privacy Disclosure Reconciliation

Audit date: September 9, 2026. Native source:
`526559d2a470f693566fc8e3b949cece0a1b6352`. Web source inspected:
`27d81439926b57432c5e09de72c6f5ee390b6520`.

Status: code-backed disclosure worksheet; NOT published in App Store Connect.
Apple blocked review-item creation with `STATE_ERROR.APP_DATA_USAGES_REQUIRED`.
Authenticated console access is required; API build selection is not publication
of these answers. Preserve the August7 worksheet as historical evidence only.

## Current Collection

| Data | Evidence | Use / questionnaire treatment |
|---|---|---|
| Name, email, user ID | Supabase sign-in, account/profile ownership | Account-linked; app functionality |
| Photos/videos | User-chosen profile/card photos, memory and scanner media | Account-linked where uploaded; app functionality |
| Messages, support, other user content | Collector messages, reports, notes, memories, collections and Binders | Account-linked; app functionality |
| Coarse location | `lib/services/network/local_discovery_settings_service.dart`: owner-scoped area/region/country upsert | Optional but collected; account-linked; app functionality and nearby-content personalization |
| Purchase history | `lib/services/sealed/owned_sealed_service_v1.dart`: acquisition cost; vendor disposition records | Collector-entered acquisition/transaction records; account-linked; app functionality |
| Other financial information | Collection values, acquisition costs, sale amounts, trade cash in `lib/services/gvvi/vendor_pricing_workspace_service.dart` and sealed details | Account-linked collection/transaction values; not payment-card or bank credentials; app functionality |
| Device ID | `lib/services/notifications/grookai_push_notification_service.dart`: installation/push registration | Notification delivery; app functionality; do not declare tracking |
| Product interaction | `lib/services/network/card_engagement_service.dart`: account-linked feed events and wants; web telemetry | App functionality; disclose analytics where used to measure engagement, and personalization where used to order suggestions |
| Crash/other diagnostic data | `lib/services/diagnostics/grookai_crash_reporting_service.dart`: Crashlytics enabled in release | Reliability/diagnostics; app functionality. Do not claim anonymous solely because no explicit Crashlytics user-ID setter was found |
| Search history (web) | `apps/web/src/lib/telemetry/trackServerEvent.ts`: persisted `search_query`; founder top-search metrics | Website collects search queries for analytics. Reconcile any native embedded-web flow before applying a blanket native-app exclusion |

No advertising/tracking integration was found in this bounded client audit.
This is not a claim to have audited every vendor's current privacy policy.
No payment details, credit scores, health data, address-book import or GPS
collection was found in the reviewed native flows. Coarse location is manually
provided; its absence from OS location permissions does not mean it is uncollected.
Free-text memory places and messages remain user content, not a GPS feed.

## Before Publishing

1. Select collection = yes. Do not reuse the older no-purchases/no-financial-info/
   no-coarse-location exclusions. Optional normal functionality still counts.
2. Map uses per type, not a blanket functionality-only checkbox. Verify SDK
   diagnostic linking and native embedded-web search scope in the console review.
3. No cross-company advertising tracking is authorized or implemented by this
   change. Never invent a tracking purpose to satisfy a form.
4. Verify privacy/support/deletion URLs and read back published console state.
5. Keep `ios/Runner/PrivacyInfo.xcprivacy` distinct from the App Store questionnaire:
   its empty collected-data array is NOT evidence that the app collects no data.

Definitions checked against [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).
Apple includes user-entered acquisition history, assets/financial information,
and manually supplied coarse location when those data are collected. Purpose,
linking and tracking declarations must reflect actual uses, not whether payment
processing or GPS permission exists.

No store privacy publication, legal agreement, account or production-data write
was performed by creating this worksheet.
