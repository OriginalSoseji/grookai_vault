# PKG-32A Parenthetical Name Qualifier Guarded Dry-Run V1

Rollback-only proof for parent name updates where Grookai has a generic trainer card name and the Master Index has the externally verified parenthetical qualifier.

No DB writes were committed. No migrations were created. No child rows were inserted, updated, or deleted.

| metric | value |
| --- | --- |
| package_id | PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES |
| fingerprint | ee81961d70dd94f3fcee5718efcc745bc6bcba47ad08e0e86c83ee2355509298 |
| sql_hash | 2312c1110b922f56f17a5c5429f6a383638b6be91ed9960bc725009321fc4303 |
| parent_updates_in_dry_run | 6 |
| affected_child_rows | 9 |
| blocked_rows | 0 |
| committed | false |
| notice | PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES dry-run passed: parent names updated 6, child writes 0, fingerprint ee81961d70dd94f3fcee5718efcc745bc6bcba47ad08e0e86c83ee2355509298 |

## Parent Updates

| set | number | old_name | new_name | child_rows |
| --- | --- | --- | --- | --- |
| sv01 | 189 | Professor's Research | Professor's Research (Professor Sada) | 2 |
| sv01 | 240 | Professor's Research | Professor's Research (Professor Sada) | 1 |
| sv01 | 241 | Professor's Research | Professor's Research (Professor Turo) | 1 |
| sv02 | 172 | Boss's Orders | Boss's Orders (Ghetsis) | 3 |
| sv02 | 248 | Boss's Orders | Boss's Orders (Ghetsis) | 1 |
| sv02 | 265 | Boss's Orders | Boss's Orders (Ghetsis) | 1 |
