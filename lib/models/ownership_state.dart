enum OwnershipAction {
  addToVault,
  viewYourCopy,
  addAnotherCopy,
  openManageCard,
  none,
}

class OwnershipState {
  const OwnershipState({
    required this.owned,
    required this.ownedCount,
    required this.primaryVaultItemId,
    required this.primaryGvviId,
    required this.hasExactCopy,
    required this.onWall,
    required this.inPlay,
    required this.isSelfContext,
    required this.bestAction,
  });

  const OwnershipState.empty({required this.isSelfContext})
    : owned = false,
      ownedCount = 0,
      primaryVaultItemId = null,
      primaryGvviId = null,
      hasExactCopy = false,
      onWall = false,
      inPlay = false,
      bestAction = OwnershipAction.none;

  final bool owned;
  final int ownedCount;
  final String? primaryVaultItemId;
  final String? primaryGvviId;
  final bool hasExactCopy;
  final bool onWall;
  final bool inPlay;
  final bool isSelfContext;
  final OwnershipAction bestAction;

  @override
  String toString() {
    return 'OwnershipState('
        'owned: $owned, '
        'ownedCount: $ownedCount, '
        'primaryVaultItemId: $primaryVaultItemId, '
        'primaryGvviId: $primaryGvviId, '
        'hasExactCopy: $hasExactCopy, '
        'onWall: $onWall, '
        'inPlay: $inPlay, '
        'isSelfContext: $isSelfContext, '
        'bestAction: $bestAction'
        ')';
  }
}
