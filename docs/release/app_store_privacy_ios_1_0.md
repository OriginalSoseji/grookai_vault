# App Store Privacy Answers: iOS 1.0

These answers are based on the current iOS beta build and a code/config scan on 2026-05-22.

Apple's public App Store Connect API covers the privacy policy URL, but not the App Privacy nutrition-label data-type questionnaire. Complete this in App Store Connect as an Admin.

## High-Level Answers

- Tracking: No
- Does this app collect data: Yes
- Data linked to the user: Yes for the selected data types below
- Data used for tracking: No for every selected data type

## Select These Data Types

Contact Info:

- Name
- Email Address

User Content:

- Photos or Videos
- Emails or Text Messages
- Other User Content

Identifiers:

- User ID

Usage Data:

- Product Interaction

## Purposes

For each selected data type, choose:

- App Functionality

Do not choose:

- Third-Party Advertising
- Developer's Advertising or Marketing
- Tracking

## Notes By Data Type

- Name: profile display name / public collector identity when the user provides it.
- Email Address: Supabase email auth and App Review/demo account support.
- Photos or Videos: card photos, profile avatar/banner media, warehouse/evidence/scanner media when users choose to upload.
- Emails or Text Messages: in-app collector messaging / card interaction messages.
- Other User Content: vault entries, collection state, card condition/notes, public wall/profile content, slugs.
- User ID: Supabase auth user id and ownership/profile/message relationships.
- Product Interaction: vault actions, follows, card interactions, feed/thread opens, and collection-management activity used to operate app features.

## Do Not Select Unless The App Changes

- Location
- Contacts
- Purchases
- Financial Info
- Health & Fitness
- Browsing History
- Search History
- Sensitive Info
- Device ID
- Crash Data
- Performance Data
- Other Diagnostic Data
