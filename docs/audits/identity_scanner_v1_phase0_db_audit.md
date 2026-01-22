# Identity Scanner V1 Phase 0 — DB Audit

## condition_snapshots shape (psql \d+)
```
                                                     Table "public.condition_snapshots"
     Column     |           Type           | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description 
----------------+--------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 id             | uuid                     |           | not null | gen_random_uuid() | plain    |             |              | 
 vault_item_id  | uuid                     |           | not null |                   | plain    |             |              | 
 user_id        | uuid                     |           | not null |                   | plain    |             |              | 
 created_at     | timestamp with time zone |           | not null | now()             | plain    |             |              | 
 images         | jsonb                    |           | not null |                   | extended |             |              | 
 scan_quality   | jsonb                    |           | not null |                   | extended |             |              | 
 measurements   | jsonb                    |           | not null |                   | extended |             |              | 
 defects        | jsonb                    |           | not null |                   | extended |             |              | 
 confidence     | numeric                  |           | not null |                   | main     |             |              | 
 device_meta    | jsonb                    |           |          |                   | extended |             |              | 
 fingerprint_id | uuid                     |           |          |                   | plain    |             |              | 
 card_print_id  | uuid                     |           |          |                   | plain    |             |              | 
Indexes:
    "condition_snapshots_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "condition_analysis_failures" CONSTRAINT "condition_analysis_failures_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES condition_snapshots(id) ON DELETE RESTRICT
    TABLE "condition_snapshot_analyses" CONSTRAINT "condition_snapshot_analyses_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES condition_snapshots(id) ON DELETE RESTRICT
    TABLE "fingerprint_bindings" CONSTRAINT "fingerprint_bindings_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES condition_snapshots(id) ON DELETE RESTRICT
    TABLE "fingerprint_provenance_events" CONSTRAINT "fingerprint_provenance_events_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES condition_snapshots(id) ON DELETE RESTRICT
Policies:
    POLICY "gv_condition_snapshots_insert" FOR INSERT
      TO authenticated
      WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
    POLICY "gv_condition_snapshots_select" FOR SELECT
      TO authenticated
      USING ((user_id = ( SELECT auth.uid() AS uid)))
Triggers:
    trg_condition_snapshots_block_delete BEFORE DELETE ON condition_snapshots FOR EACH ROW EXECUTE FUNCTION gv_condition_snapshots_block_mutation()
    trg_condition_snapshots_block_update BEFORE UPDATE ON condition_snapshots FOR EACH ROW EXECUTE FUNCTION gv_condition_snapshots_block_mutation()
    trg_condition_snapshots_set_auth_uid BEFORE INSERT ON condition_snapshots FOR EACH ROW EXECUTE FUNCTION gv_condition_snapshots_set_auth_uid()
Access method: heap
```

## RLS patterns (pg_policies)
```
           tablename           |           policyname           |  cmd   |                  qual                   
-------------------------------+--------------------------------+--------+-----------------------------------------
 condition_snapshots           | gv_condition_snapshots_insert  | INSERT | 
 condition_snapshots           | gv_condition_snapshots_select  | SELECT | (user_id = ( SELECT auth.uid() AS uid))
 fingerprint_bindings          | gv_fingerprint_bindings_insert | INSERT | 
 fingerprint_bindings          | gv_fingerprint_bindings_select | SELECT | (user_id = ( SELECT auth.uid() AS uid))
 fingerprint_bindings          | gv_fingerprint_bindings_update | UPDATE | (user_id = ( SELECT auth.uid() AS uid))
 fingerprint_provenance_events | gv_fingerprint_prov_insert     | INSERT | 
 fingerprint_provenance_events | gv_fingerprint_prov_select     | SELECT | (user_id = ( SELECT auth.uid() AS uid))
```
