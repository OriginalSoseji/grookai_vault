param(
  [string]$DbContainer = "",
  [ValidateRange(1, 100)]
  [int]$Iterations = 5
)

$ErrorActionPreference = "Stop"

function Resolve-DbContainer {
  param([string]$RequestedContainer)

  if (-not [string]::IsNullOrWhiteSpace($RequestedContainer)) {
    return $RequestedContainer
  }

  $containers = @(
    & docker ps --filter "name=supabase_db" --format "{{.Names}}" |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  )
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect local Docker containers."
  }
  if ($containers.Count -ne 1) {
    throw (
      "Expected exactly one running local supabase_db container; found " +
      "$($containers.Count). Pass -DbContainer explicitly."
    )
  }
  return $containers[0]
}

function Invoke-LocalSql {
  param(
    [string]$Container,
    [string]$Sql
  )

  $output = $Sql |
    & docker exec -i $Container psql `
      -U postgres `
      -d postgres `
      -v ON_ERROR_STOP=1 `
      -At 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ($output -join [Environment]::NewLine)
  }
  return ($output -join [Environment]::NewLine)
}

function Invoke-ConcurrentPair {
  param(
    [string]$Container,
    [string]$LeftSql,
    [string]$RightSql,
    [string]$Label
  )

  $runner = {
    param($ContainerName, $Statement)
    $commandOutput = $Statement |
      & docker exec -i $ContainerName psql `
        -U postgres `
        -d postgres `
        -v ON_ERROR_STOP=1 `
        -At 2>&1
    [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($commandOutput -join [Environment]::NewLine)
    }
  }

  $leftJob = Start-Job -ScriptBlock $runner -ArgumentList $Container, $LeftSql
  $rightJob = Start-Job -ScriptBlock $runner -ArgumentList $Container, $RightSql
  $jobs = @($leftJob, $rightJob)

  try {
    $null = Wait-Job -Job $jobs -Timeout 20
    $unfinished = @($jobs | Where-Object { $_.State -ne "Completed" })
    if ($unfinished.Count -gt 0) {
      $unfinished | Stop-Job
      throw "$Label exceeded the 20-second race deadline."
    }

    $results = @($jobs | Receive-Job)
    $joinedOutput = ($results.Output -join [Environment]::NewLine)
    if ($joinedOutput -match "(?i)deadlock detected|lock timeout|statement timeout|canceling statement") {
      throw "$Label encountered a lock failure:`n$joinedOutput"
    }

    return $results
  }
  finally {
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
  }
}

$container = Resolve-DbContainer -RequestedContainer $DbContainer

$probeCheckSql = @'
select (
  to_regprocedure(
    'public.binder_service_account_delete_v1(uuid,text,text)'
  ) is not null
)::text;
'@
$probeReady = Invoke-LocalSql -Container $container -Sql $probeCheckSql
if ($probeReady.Trim().ToLowerInvariant() -ne "true") {
  throw "Collaborative Binder migrations are not present in $container."
}

$originalSchemaFlag = Invoke-LocalSql -Container $container -Sql @'
select enabled::text
from public.binder_feature_flags
where flag_key = 'schema_internal';
'@
$originalSchemaFlag = $originalSchemaFlag.Trim().ToLowerInvariant()
if ($originalSchemaFlag -notin @("true", "false")) {
  throw "Could not capture the schema_internal feature-flag state."
}

$cleanupSql = @'
begin;
set local session_replication_role = replica;

do $cleanup$
declare
  v_table record;
begin
  for v_table in
    select distinct
      columns.table_schema,
      columns.table_name
    from information_schema.columns columns
    where columns.table_schema = 'public'
      and columns.column_name = 'binder_id'
      and columns.table_name like 'binder\_%' escape '\'
  loop
    execute format(
      'delete from %I.%I where binder_id = any ($1)',
      v_table.table_schema,
      v_table.table_name
    )
    using array[
      'bc400000-0000-0000-0000-000000000001'::uuid,
      'bc400000-0000-0000-0000-000000000002'::uuid
    ];
  end loop;
end;
$cleanup$;

delete from public.binder_refresh_signals
where binder_public_id in (
  'bc410000-0000-0000-0000-000000000001',
  'bc410000-0000-0000-0000-000000000002'
);

delete from public.binder_idempotency_keys
where (
  actor_key = 'service:account_deletion'
  and operation = 'binder_service_account_delete_v1'
  and idempotency_key = any (
    array(
      select encode(
        extensions.digest(
          convert_to(
            'binder-race-account-delete-' || sequence_number::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      )
      from generate_series(1, 100) sequence_number
    )
  )
);

delete from public.binder_rate_limit_events
where actor_user_id in (
  'bc000000-0000-0000-0000-000000000001',
  'bc000000-0000-0000-0000-000000000002'
);
delete from public.binders
where id in (
  'bc400000-0000-0000-0000-000000000001',
  'bc400000-0000-0000-0000-000000000002'
);
delete from public.vault_item_instances
where id in (
  'bc300000-0000-0000-0000-000000000001',
  'bc300000-0000-0000-0000-000000000002'
);
delete from public.vault_owners
where user_id = 'bc000000-0000-0000-0000-000000000002';
delete from public.card_print_species
where card_print_id = 'bc200000-0000-0000-0000-000000000001';
delete from public.card_prints
where id = 'bc200000-0000-0000-0000-000000000001';
delete from public.pokemon_species
where id = 'bc110000-0000-0000-0000-000000000001';
delete from public.sets
where id = 'bc100000-0000-0000-0000-000000000001';
delete from auth.users
where id in (
  'bc000000-0000-0000-0000-000000000001',
  'bc000000-0000-0000-0000-000000000002'
);

commit;
'@

$setupSql = @'
begin;
set local statement_timeout = '20s';

update public.binder_feature_flags
set enabled = true
where flag_key = 'schema_internal';

insert into auth.users (
  id,
  email,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
) values
  (
    'bc000000-0000-0000-0000-000000000001',
    'binder-race-owner@example.test',
    false,
    false,
    now(),
    now()
  ),
  (
    'bc000000-0000-0000-0000-000000000002',
    'binder-race-member@example.test',
    false,
    false,
    now(),
    now()
  );

insert into public.sets (id, game, code, name)
values (
  'bc100000-0000-0000-0000-000000000001',
  'pokemon',
  'BCR',
  'Binder Concurrency Probe'
);
insert into public.pokemon_species (
  id,
  national_dex_number,
  canonical_name,
  display_name,
  slug
) values (
  'bc110000-0000-0000-0000-000000000001',
  99998,
  'Binder Concurrency Probe Species',
  'Binder Concurrency Probe Species',
  'binder-concurrency-probe-species'
);
insert into public.card_prints (
  id,
  game_id,
  set_id,
  name,
  number,
  set_code,
  gv_id,
  image_source,
  image_path
) values (
  'bc200000-0000-0000-0000-000000000001',
  (select id from public.games where code = 'pokemon'),
  'bc100000-0000-0000-0000-000000000001',
  'Binder Concurrency Probe Card',
  '1',
  'BCR',
  'GV-BCR-001',
  'identity',
  'binder-race/GV-BCR-001/front.webp'
);
insert into public.card_print_species (
  card_print_id,
  species_id,
  role,
  counts_for_completion,
  source
) values (
  'bc200000-0000-0000-0000-000000000001',
  'bc110000-0000-0000-0000-000000000001',
  'primary',
  true,
  'binder_test'
);

insert into public.vault_owners (
  user_id,
  owner_code,
  next_instance_index
) values (
  'bc000000-0000-0000-0000-000000000002',
  'BCR1',
  3
);
insert into public.vault_item_instances (
  id,
  user_id,
  gv_vi_id,
  card_print_id
) values
  (
    'bc300000-0000-0000-0000-000000000001',
    'bc000000-0000-0000-0000-000000000002',
    public.generate_gv_vi_id_v1('BCR1', 1),
    'bc200000-0000-0000-0000-000000000001'
  ),
  (
    'bc300000-0000-0000-0000-000000000002',
    'bc000000-0000-0000-0000-000000000002',
    public.generate_gv_vi_id_v1('BCR1', 2),
    'bc200000-0000-0000-0000-000000000001'
  );

insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  species_id,
  checklist_mode
) values
  (
    'bc400000-0000-0000-0000-000000000001',
    'bc410000-0000-0000-0000-000000000001',
    'bc000000-0000-0000-0000-000000000001',
    'Withdraw Delete Race',
    'species',
    'bc110000-0000-0000-0000-000000000001',
    'card_prints'
  ),
  (
    'bc400000-0000-0000-0000-000000000002',
    'bc410000-0000-0000-0000-000000000002',
    'bc000000-0000-0000-0000-000000000001',
    'Account Delete Race',
    'species',
    'bc110000-0000-0000-0000-000000000001',
    'card_prints'
  );

insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  display_alias,
  joined_at
) values
  (
    'bc500000-0000-0000-0000-000000000001',
    'bc400000-0000-0000-0000-000000000001',
    'bc000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    null,
    now()
  ),
  (
    'bc500000-0000-0000-0000-000000000002',
    'bc400000-0000-0000-0000-000000000001',
    'bc000000-0000-0000-0000-000000000002',
    'contributor',
    'active',
    'Race Member One',
    now()
  ),
  (
    'bc500000-0000-0000-0000-000000000003',
    'bc400000-0000-0000-0000-000000000002',
    'bc000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    null,
    now()
  ),
  (
    'bc500000-0000-0000-0000-000000000004',
    'bc400000-0000-0000-0000-000000000002',
    'bc000000-0000-0000-0000-000000000002',
    'contributor',
    'active',
    'Race Member Two',
    now()
  );

insert into public.binder_contributions (
  id,
  binder_id,
  contributor_member_id,
  contributor_user_id,
  contributor_membership_epoch,
  vault_item_instance_id,
  state,
  snapshot_gv_vi_id,
  snapshot_card_print_id,
  source,
  added_by_user_id,
  activated_at
) values
  (
    'bc600000-0000-0000-0000-000000000001',
    'bc400000-0000-0000-0000-000000000001',
    'bc500000-0000-0000-0000-000000000002',
    'bc000000-0000-0000-0000-000000000002',
    1,
    'bc300000-0000-0000-0000-000000000001',
    'active',
    public.generate_gv_vi_id_v1('BCR1', 1),
    'bc200000-0000-0000-0000-000000000001',
    'manual',
    'bc000000-0000-0000-0000-000000000002',
    now()
  ),
  (
    'bc600000-0000-0000-0000-000000000002',
    'bc400000-0000-0000-0000-000000000002',
    'bc500000-0000-0000-0000-000000000004',
    'bc000000-0000-0000-0000-000000000002',
    1,
    'bc300000-0000-0000-0000-000000000002',
    'active',
    public.generate_gv_vi_id_v1('BCR1', 2),
    'bc200000-0000-0000-0000-000000000001',
    'manual',
    'bc000000-0000-0000-0000-000000000002',
    now()
  );

commit;
'@

$verifySql = @'
do $verify$
begin
  if (
    select lifecycle
    from public.binders
    where id = 'bc400000-0000-0000-0000-000000000001'
  ) <> 'deleted_tombstone' then
    raise exception 'withdraw_delete_binder_not_terminal';
  end if;

  if (
    select state
    from public.binder_contributions
    where id = 'bc600000-0000-0000-0000-000000000001'
  ) in ('pending', 'active') then
    raise exception 'withdraw_delete_contribution_still_live';
  end if;

  if (
    select lifecycle
    from public.binders
    where id = 'bc400000-0000-0000-0000-000000000002'
  ) <> 'deleted_tombstone' then
    raise exception 'account_delete_binder_not_terminal';
  end if;

  if exists (
    select 1
    from public.binder_members
    where id = 'bc500000-0000-0000-0000-000000000004'
      and (
        state <> 'removed'
        or user_id is not null
        or display_alias is not null
      )
  ) then
    raise exception 'account_delete_membership_not_scrubbed';
  end if;

  if exists (
    select 1
    from public.binder_contributions
    where id = 'bc600000-0000-0000-0000-000000000002'
      and (
        state in ('pending', 'active')
        or contributor_user_id is not null
        or added_by_user_id is not null
      )
  ) then
    raise exception 'account_delete_contribution_not_terminal_or_scrubbed';
  end if;
end;
$verify$;

select 'PASS';
'@

try {
  $null = Invoke-LocalSql -Container $container -Sql $cleanupSql

  for ($iteration = 1; $iteration -le $Iterations; $iteration++) {
    $null = Invoke-LocalSql -Container $container -Sql $setupSql

    $targetMilliseconds = [DateTimeOffset]::UtcNow.AddMilliseconds(900).
      ToUnixTimeMilliseconds()

    $withdrawSql = @"
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bc000000-0000-0000-0000-000000000002';
select pg_sleep(
  greatest(
    0.0,
    extract(
      epoch from (
        to_timestamp($targetMilliseconds / 1000.0) - clock_timestamp()
      )
    )
  )
);
select public.binder_contribution_withdraw_v1(
  'bc600000-0000-0000-0000-000000000001',
  'binder-race-withdraw-$iteration'
);
commit;
"@
    $deleteOneSql = @"
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bc000000-0000-0000-0000-000000000001';
select pg_sleep(
  greatest(
    0.0,
    extract(
      epoch from (
        to_timestamp($targetMilliseconds / 1000.0) - clock_timestamp()
      )
    )
  )
);
select public.binder_delete_v1(
  'bc410000-0000-0000-0000-000000000001',
  'DELETE Withdraw Delete Race',
  'binder-race-delete-one-$iteration'
);
commit;
"@

    $firstRace = Invoke-ConcurrentPair `
      -Container $container `
      -LeftSql $withdrawSql `
      -RightSql $deleteOneSql `
      -Label "Withdraw vs BinderDelete iteration $iteration"
    $unexpectedFirst = @(
      $firstRace |
        Where-Object {
          $_.ExitCode -ne 0 -and $_.Output -notmatch "(?i)unavailable"
        }
    )
    if ($unexpectedFirst.Count -gt 0) {
      throw (
        "Withdraw vs BinderDelete returned an unexpected error:`n" +
        ($unexpectedFirst.Output -join [Environment]::NewLine)
      )
    }

    $targetMilliseconds = [DateTimeOffset]::UtcNow.AddMilliseconds(900).
      ToUnixTimeMilliseconds()
    $accountDeleteSql = @"
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
set local role service_role;
set local request.jwt.claim.role = 'service_role';
select pg_sleep(
  greatest(
    0.0,
    extract(
      epoch from (
        to_timestamp($targetMilliseconds / 1000.0) - clock_timestamp()
      )
    )
  )
);
select public.binder_service_account_delete_v1(
  'bc000000-0000-0000-0000-000000000002',
  'binder-race-account-delete-$iteration',
  'binder-race-account-delete-$iteration'
);
commit;
"@
    $deleteTwoSql = @"
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bc000000-0000-0000-0000-000000000001';
select pg_sleep(
  greatest(
    0.0,
    extract(
      epoch from (
        to_timestamp($targetMilliseconds / 1000.0) - clock_timestamp()
      )
    )
  )
);
select public.binder_delete_v1(
  'bc410000-0000-0000-0000-000000000002',
  'DELETE Account Delete Race',
  'binder-race-delete-two-$iteration'
);
commit;
"@

    $secondRace = Invoke-ConcurrentPair `
      -Container $container `
      -LeftSql $accountDeleteSql `
      -RightSql $deleteTwoSql `
      -Label "AccountDelete vs BinderDelete iteration $iteration"
    $unexpectedSecond = @($secondRace | Where-Object { $_.ExitCode -ne 0 })
    if ($unexpectedSecond.Count -gt 0) {
      throw (
        "AccountDelete vs BinderDelete returned an unexpected error:`n" +
        ($unexpectedSecond.Output -join [Environment]::NewLine)
      )
    }

    $verification = Invoke-LocalSql -Container $container -Sql $verifySql
    if ($verification -notmatch "(?m)^PASS\s*$") {
      throw "Unexpected verification result: $verification"
    }

    Write-Host (
      "PASS iteration $iteration/${Iterations}: " +
      "Withdraw/Delete and AccountDelete/Delete reached terminal invariants."
    )
    $null = Invoke-LocalSql -Container $container -Sql $cleanupSql
  }
}
finally {
  try {
    $null = Invoke-LocalSql -Container $container -Sql $cleanupSql
  }
  finally {
    $restoreSql = @"
update public.binder_feature_flags
set enabled = $originalSchemaFlag
where flag_key = 'schema_internal';
"@
    $null = Invoke-LocalSql -Container $container -Sql $restoreSql
  }
}

Write-Host (
  "Collaborative Binders concurrency probe passed $Iterations iteration(s); " +
  "no deadlocks, lock timeouts, or terminal-state violations."
)
