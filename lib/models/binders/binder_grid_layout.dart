/// Local page-view geometry, independent of checklist identity or completion.
enum BinderGridLayout {
  twoByTwo(2, 2),
  threeByThree(3, 3),
  fourByThree(4, 3),
  fourByFour(4, 4);

  const BinderGridLayout(this.columns, this.rows);
  final int columns;
  final int rows;
  int get pockets => columns * rows;
  String get storageKey => '${columns}x$rows';
  String get label => '$columns × $rows';

  static BinderGridLayout fromStorage(String? value) => values.firstWhere(
    (layout) => layout.storageKey == value,
    orElse: () => threeByThree,
  );
}
