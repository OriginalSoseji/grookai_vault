# MESSAGING CONTEXT AND READ STATE V1

## Purpose
Make messaging feel card-anchored and live by improving thread context and fixing read-state lifecycle.

## Scope Lock
- inbox/thread/state refresh only
- no schema changes
- no broad visual redesign

## Current Problems
- card context in messages is too weak
- thread does not strongly communicate which card the conversation is about
- read state does not refresh promptly after opening a thread
- inbox statuses can remain stale after viewing/sending

## Audit
- inbox screen owner:
  - `lib/screens/network/network_inbox_screen.dart`
- thread screen owner:
  - `lib/screens/network/network_thread_screen.dart`
- mark-read path:
  - no mobile mark-read helper exists today
  - thread open currently only loads messages; it does not persist any read-state update
- inbox refresh path:
  - inbox loads on `initState`, manual pull-to-refresh, or app-bar reload only
  - opening a thread uses `Navigator.push(...)` without awaiting a result, so returning from thread does not refresh state
- status derivation path:
  - summaries come from `CardInteractionService.fetchThreadSummaries()`
  - unread/new is driven by `card_interaction_group_states.has_unread`
  - current code also forces `hasUnread` true whenever the grouped row direction is `received`, which can leave stale unread/new state even after the thread has been opened
  - thread pills map to:
    - `Archived` when archived
    - `Closed` when closed
    - `New` when `hasUnread`
    - `Active` otherwise
- known stale behavior observed:
  - opening a thread does not clear unread/new state
  - going back to inbox does not refresh status chips automatically
  - reply/send reloads the thread body only and does not explicitly signal the inbox to refresh
  - inbox rows lead with counterpart identity and latest message, but the card-specific purpose is still too easy to miss

## Status Lifecycle Contract
- unread means:
  - the current user has a `card_interaction_group_states` row for this card/counterpart pair with `has_unread = true`
- new means:
  - the per-thread inbox pill for an active thread whose current summary still has unread state
- active means:
  - the thread is neither archived nor closed and does not currently have unread state
- inbox means:
  - all non-archived, non-closed threads, whether unread or already active
- sent means:
  - active threads originally started by the current user, based on the earliest message in the conversation rather than the latest one
- closed means:
  - any thread whose group-state row is closed or archived
- transition on open:
  - loading a thread marks the existing group-state row read by setting `has_unread = false` and updating `last_read_at`
  - thread-local state flips from `New` to `Active`
- transition on send:
  - reply insertion keeps the sender side read/active through existing trigger behavior
  - thread view reloads messages and keeps local unread state cleared
- transition on return:
  - inbox reloads after thread route returns so list filters and row pills immediately reflect the updated group-state row
