# FINAL OWNERSHIP SIGNAL SYNC CLOSEOUT V1

## Purpose
Convert the last async ownership callers to snapshot-based sync rendering and remove the async fallback from OwnershipSignal.

## Remaining Caller Audit
- main.dart caller(s): catalog card action surface still creates `ownershipFuture` and rebuilds with `FutureBuilder<OwnershipState>` before refresh/update actions.
- public_collector_screen.dart caller(s): public wall/viewer-owned hint path still passes `Future<OwnershipState>` through tile widgets into `_PublicViewerOwnershipHint`.
- public_gvvi_screen.dart caller(s): public GVVI viewer-owned bridge still stores `_viewerOwnershipFuture` and renders through `FutureBuilder<OwnershipState>`.
- fallback removal safe after this pass?: pending
