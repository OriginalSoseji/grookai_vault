param(
  [string]$DbContainer = ""
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
  if ($LASTEXITCODE -ne 0 -or $containers.Count -ne 1) {
    throw "Pass -DbContainer; exactly one local supabase_db container is required."
  }
  return $containers[0]
}

function Invoke-LocalSql {
  param([string]$Container, [string]$Sql)
  $output = $Sql |
    & docker exec -i $Container psql `
      -U postgres -d postgres -v ON_ERROR_STOP=1 -At 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ($output -join [Environment]::NewLine)
  }
  return ($output -join [Environment]::NewLine)
}

function New-RaceSql {
  param(
    [ValidateSet("authenticated", "service_role", "postgres")]
    [string]$Role,
    [string]$UserSeed,
    [long]$TargetMilliseconds,
    [string]$Body
  )

  $identity = switch ($Role) {
    "authenticated" {
@"
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  md5('$UserSeed')::uuid::text,
  true
);
"@
    }
    "service_role" {
@"
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
"@
    }
    default { "" }
  }

  return @"
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
$identity
select pg_sleep(
  greatest(
    0.0,
    extract(
      epoch from (
        to_timestamp($TargetMilliseconds / 1000.0) - clock_timestamp()
      )
    )
  )
);
$Body
commit;
"@
}

function Invoke-ConcurrentPair {
  param(
    [string]$Container,
    [string]$LeftSql,
    [string]$RightSql,
    [string]$Label,
    [string]$AllowedErrorPattern = "(?i)unavailable|conflict|capacity|not_authorized"
  )

  $runner = {
    param($ContainerName, $Statement)
    $commandOutput = $Statement |
      & docker exec -i $ContainerName psql `
        -U postgres -d postgres -v ON_ERROR_STOP=1 -At 2>&1
    [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($commandOutput -join [Environment]::NewLine)
    }
  }

  $jobs = @(
    Start-Job -ScriptBlock $runner -ArgumentList $Container, $LeftSql
    Start-Job -ScriptBlock $runner -ArgumentList $Container, $RightSql
  )
  try {
    $null = Wait-Job -Job $jobs -Timeout 20
    if (@($jobs | Where-Object { $_.State -ne "Completed" }).Count -gt 0) {
      $jobs | Stop-Job
      throw "$Label exceeded the 20-second deadline."
    }
    $results = @($jobs | Receive-Job)
    $allOutput = $results.Output -join [Environment]::NewLine
    if ($allOutput -match "(?i)deadlock detected|lock timeout|statement timeout|canceling statement") {
      throw "$Label encountered a lock failure:`n$allOutput"
    }
    $unexpected = @(
      $results |
        Where-Object {
          $_.ExitCode -ne 0 -and $_.Output -notmatch $AllowedErrorPattern
        }
    )
    if ($unexpected.Count -gt 0) {
      throw "$Label returned an unexpected error:`n$($unexpected.Output -join [Environment]::NewLine)"
    }
    if (@($results | Where-Object { $_.ExitCode -eq 0 }).Count -lt 1) {
      throw "$Label had no successful terminal writer:`n$allOutput"
    }
    return $results
  }
  finally {
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-Verification {
  param([string]$Container, [string]$Label, [string]$AssertionSql)
  $result = Invoke-LocalSql -Container $Container -Sql @"
do `$verify`$
begin
$AssertionSql
end;
`$verify`$;
select 'PASS';
"@
  if ($result -notmatch "(?m)^PASS\s*$") {
    throw "$Label returned an unexpected verification result: $result"
  }
  Write-Host "PASS: $Label"
}

$container = Resolve-DbContainer -RequestedContainer $DbContainer
$ready = Invoke-LocalSql -Container $container -Sql @'
select (
  to_regprocedure(
    'public.binder_service_canonical_refresh_v1(uuid,text,text)'
  ) is not null
)::text;
'@
if ($ready.Trim().ToLowerInvariant() -ne "true") {
  throw "Collaborative Binder migrations are not installed in $container."
}

$flagRows = Invoke-LocalSql -Container $container -Sql @'
select flag_key || '=' || enabled::text
from public.binder_feature_flags
where flag_key in ('schema_internal', 'shared')
order by flag_key;
'@
$flagState = @{}
foreach ($row in ($flagRows -split "\r?\n")) {
  if ($row -match "^([^=]+)=(true|false)$") {
    $flagState[$Matches[1]] = $Matches[2]
  }
}
if ($flagState.Count -ne 2) {
  throw "Could not capture Binder feature-flag state."
}

$cleanupSql = @'
begin;
set local session_replication_role = replica;

do $cleanup$
declare
  v_binder_ids uuid[];
  v_public_ids uuid[];
  v_table record;
begin
  select
    coalesce(array_agg(id), '{}'::uuid[]),
    coalesce(array_agg(public_id), '{}'::uuid[])
  into v_binder_ids, v_public_ids
  from public.binders
  where title like 'Binder Race Boundary:%';

  if cardinality(v_binder_ids) > 0 then
    for v_table in
      select distinct columns.table_schema, columns.table_name
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
      using v_binder_ids;
    end loop;

    delete from public.binder_refresh_signals
    where binder_public_id = any(v_public_ids);
    delete from public.binders where id = any(v_binder_ids);
  end if;
end;
$cleanup$;

delete from public.binder_idempotency_keys
where (
  operation in (
    'binder_service_canonical_refresh_v1',
    'binder_service_vault_instance_changed_v1'
  )
  and idempotency_key in (
    encode(
      extensions.digest(
        convert_to('brb-milestone-left', 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    encode(
      extensions.digest(
        convert_to('brb-milestone-right', 'UTF8'),
        'sha256'
      ),
      'hex'
    )
  )
);

delete from public.vault_item_instances
where user_id in (
  select id
  from auth.users
  where email like 'binder-boundary-%@example.test'
);
delete from public.vault_owners
where user_id in (
  select id
  from auth.users
  where email like 'binder-boundary-%@example.test'
);
delete from public.card_print_species
where card_print_id = md5('brb-card')::uuid;
delete from public.card_prints
where id = md5('brb-card')::uuid;
delete from public.pokemon_species
where id = md5('brb-species')::uuid;
delete from public.sets
where id = md5('brb-set')::uuid;
delete from auth.users
where email like 'binder-boundary-%@example.test';

commit;
'@

$setupSql = @'
begin;
set local statement_timeout = '30s';

update public.binder_feature_flags
set enabled = true
where flag_key in ('schema_internal', 'shared');

insert into auth.users (
  id,
  email,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
select
  md5(seed)::uuid,
  email,
  false,
  false,
  now(),
  now()
from (
  values
    ('brb-owner', 'binder-boundary-owner@example.test'),
    ('brb-member', 'binder-boundary-member@example.test'),
    ('brb-invitee', 'binder-boundary-invitee@example.test'),
    ('brb-transfer-target', 'binder-boundary-transfer-target@example.test'),
    ('brb-recipient', 'binder-boundary-recipient@example.test'),
    (
      'brb-account-boundary-user',
      'binder-boundary-account-capacity@example.test'
    )
) identities(seed, email);

insert into auth.users (
  id,
  email,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
select
  md5('brb-boundary-user-' || sequence_number::text)::uuid,
  'binder-boundary-capacity-' || sequence_number::text || '@example.test',
  false,
  false,
  now(),
  now()
from generate_series(1, 51) sequence_number;

insert into public.sets (id, game, code, name)
values (
  md5('brb-set')::uuid,
  'pokemon',
  'BRB',
  'Binder Boundary Race Probe'
);
insert into public.pokemon_species (
  id,
  national_dex_number,
  canonical_name,
  display_name,
  slug
) values (
  md5('brb-species')::uuid,
  99997,
  'Binder Boundary Race Species',
  'Binder Boundary Race Species',
  'binder-boundary-race-species'
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
  md5('brb-card')::uuid,
  (select id from public.games where code = 'pokemon'),
  md5('brb-set')::uuid,
  'Binder Boundary Race Card',
  '1',
  'BRB',
  'GV-BRB-001',
  'identity',
  'binder-boundary/GV-BRB-001/front.webp'
);
insert into public.card_print_species (
  card_print_id,
  species_id,
  role,
  counts_for_completion,
  source
) values (
  md5('brb-card')::uuid,
  md5('brb-species')::uuid,
  'primary',
  true,
  'binder_test'
);

insert into public.vault_owners (
  user_id,
  owner_code,
  next_instance_index
) values (
  md5('brb-member')::uuid,
  'BRB1',
  7
);
insert into public.vault_item_instances (
  id,
  user_id,
  gv_vi_id,
  card_print_id
)
select
  md5('brb-instance-' || sequence_number::text)::uuid,
  md5('brb-member')::uuid,
  public.generate_gv_vi_id_v1('BRB1', sequence_number),
  md5('brb-card')::uuid
from generate_series(1, 6) sequence_number;

-- Eight isolated primary race Binders.
insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  species_id,
  checklist_mode,
  read_access,
  discoverability,
  join_policy,
  contribution_policy
)
select
  md5('brb-binder-' || scenario)::uuid,
  md5('brb-public-' || scenario)::uuid,
  case
    when scenario = 'membership-boundary'
      then md5('brb-boundary-user-1')::uuid
    else md5('brb-owner')::uuid
  end,
  'Binder Race Boundary: ' || scenario,
  'species',
  md5('brb-species')::uuid,
  'card_prints',
  case when scenario = 'visibility-approval' then 'public' else 'private' end,
  case when scenario = 'visibility-approval' then 'listed' else 'unlisted' end,
  case
    when scenario in (
      'invitation-replay',
      'transfer-invite',
      'membership-boundary'
    ) then 'invite_only'
    else 'closed'
  end,
  case
    when scenario = 'visibility-approval' then 'approval_required'
    when scenario in (
      'duplicate-contribution',
      'member-removal',
      'vault-archive',
      'milestone'
    ) then 'members_direct'
    else 'owner_only'
  end
from (
  values
    ('duplicate-contribution'),
    ('member-removal'),
    ('vault-archive'),
    ('invitation-replay'),
    ('visibility-approval'),
    ('transfer-invite'),
    ('milestone'),
    ('membership-boundary')
) scenarios(scenario);

-- Owner members for all non-capacity scenarios.
insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
)
select
  md5('brb-owner-member-' || scenario)::uuid,
  md5('brb-binder-' || scenario)::uuid,
  md5('brb-owner')::uuid,
  'owner',
  'active',
  now()
from (
  values
    ('duplicate-contribution'),
    ('member-removal'),
    ('vault-archive'),
    ('invitation-replay'),
    ('visibility-approval'),
    ('transfer-invite'),
    ('milestone')
) scenarios(scenario);

-- Contributor members used by copy races.
insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
)
select
  md5('brb-member-row-' || scenario)::uuid,
  md5('brb-binder-' || scenario)::uuid,
  md5('brb-member')::uuid,
  'contributor',
  'active',
  now()
from (
  values
    ('duplicate-contribution'),
    ('member-removal'),
    ('vault-archive'),
    ('visibility-approval'),
    ('milestone')
) scenarios(scenario);

insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
) values (
  md5('brb-transfer-target-member')::uuid,
  md5('brb-binder-transfer-invite')::uuid,
  md5('brb-transfer-target')::uuid,
  'contributor',
  'active',
  now()
);

insert into public.binder_invitations (
  id,
  binder_id,
  inviter_user_id,
  is_account_targeted,
  intended_user_id,
  max_role,
  token_hash,
  status,
  expires_at
) values (
  md5('brb-replay-invitation')::uuid,
  md5('brb-binder-invitation-replay')::uuid,
  md5('brb-owner')::uuid,
  false,
  null,
  'contributor',
  public.binder_token_hash_v1('brb-invitation-replay-token-000001'),
  'pending',
  now() + interval '1 day'
);

insert into public.binder_owner_transfer_offers (
  id,
  binder_id,
  current_owner_user_id,
  target_member_id,
  target_user_id,
  former_owner_role,
  status,
  expires_at
) values (
  md5('brb-transfer-offer')::uuid,
  md5('brb-binder-transfer-invite')::uuid,
  md5('brb-owner')::uuid,
  md5('brb-transfer-target-member')::uuid,
  md5('brb-transfer-target')::uuid,
  'manager',
  'pending',
  now() + interval '1 day'
);

-- Pending contribution for policy/approval serialization.
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
  added_by_user_id
) values (
  md5('brb-visibility-contribution')::uuid,
  md5('brb-binder-visibility-approval')::uuid,
  md5('brb-member-row-visibility-approval')::uuid,
  md5('brb-member')::uuid,
  1,
  md5('brb-instance-4')::uuid,
  'pending',
  public.generate_gv_vi_id_v1('BRB1', 4),
  md5('brb-card')::uuid,
  'manual',
  md5('brb-member')::uuid
);

-- Active contribution with no existing progress state for duplicate crossing.
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
) values (
  md5('brb-milestone-contribution')::uuid,
  md5('brb-binder-milestone')::uuid,
  md5('brb-member-row-milestone')::uuid,
  md5('brb-member')::uuid,
  1,
  md5('brb-instance-5')::uuid,
  'active',
  public.generate_gv_vi_id_v1('BRB1', 5),
  md5('brb-card')::uuid,
  'manual',
  md5('brb-member')::uuid,
  now()
);

-- Membership boundary begins at 49 active members.
insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
)
select
  md5('brb-boundary-member-' || sequence_number::text)::uuid,
  md5('brb-binder-membership-boundary')::uuid,
  md5('brb-boundary-user-' || sequence_number::text)::uuid,
  case when sequence_number = 1 then 'owner' else 'contributor' end,
  'active',
  now()
from generate_series(1, 49) sequence_number;

insert into public.binder_invitations (
  id,
  binder_id,
  inviter_user_id,
  is_account_targeted,
  intended_user_id,
  max_role,
  token_hash,
  status,
  expires_at
)
select
  md5('brb-boundary-invitation-' || sequence_number::text)::uuid,
  md5('brb-binder-membership-boundary')::uuid,
  md5('brb-boundary-user-1')::uuid,
  true,
  md5('brb-boundary-user-' || sequence_number::text)::uuid,
  'contributor',
  public.binder_token_hash_v1(
    'brb-boundary-invitation-token-' || sequence_number::text
  ),
  'pending',
  now() + interval '1 day'
from generate_series(50, 51) sequence_number;

-- Account-wide membership boundary begins at 99 active memberships. Two
-- different Binders then invite the same account concurrently.
insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  species_id,
  checklist_mode,
  join_policy,
  contribution_policy
)
select
  md5('brb-account-binder-' || sequence_number::text)::uuid,
  md5('brb-account-public-' || sequence_number::text)::uuid,
  md5('brb-owner')::uuid,
  'Binder Race Boundary: account-membership-' || sequence_number::text,
  'species',
  md5('brb-species')::uuid,
  'card_prints',
  case when sequence_number in (100, 101)
    then 'invite_only'
    else 'closed'
  end,
  'owner_only'
from generate_series(1, 101) sequence_number;

insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
)
select
  md5('brb-account-owner-' || sequence_number::text)::uuid,
  md5('brb-account-binder-' || sequence_number::text)::uuid,
  md5('brb-owner')::uuid,
  'owner',
  'active',
  now()
from generate_series(1, 101) sequence_number;

insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
)
select
  md5('brb-account-member-' || sequence_number::text)::uuid,
  md5('brb-account-binder-' || sequence_number::text)::uuid,
  md5('brb-account-boundary-user')::uuid,
  'contributor',
  'active',
  now()
from generate_series(1, 99) sequence_number;

insert into public.binder_invitations (
  id,
  binder_id,
  inviter_user_id,
  is_account_targeted,
  intended_user_id,
  max_role,
  token_hash,
  status,
  expires_at
)
select
  md5('brb-account-invitation-' || sequence_number::text)::uuid,
  md5('brb-account-binder-' || sequence_number::text)::uuid,
  md5('brb-owner')::uuid,
  true,
  md5('brb-account-boundary-user')::uuid,
  'contributor',
  public.binder_token_hash_v1(
    'brb-account-invitation-token-' || sequence_number::text
  ),
  'pending',
  now() + interval '1 day'
from generate_series(100, 101) sequence_number;

-- Exact-copy fanout boundary: 19 live links, two concurrent attempts.
insert into public.binders (
  id,
  public_id,
  owner_user_id,
  title,
  target_kind,
  species_id,
  checklist_mode,
  contribution_policy
)
select
  md5('brb-fanout-binder-' || sequence_number::text)::uuid,
  md5('brb-fanout-public-' || sequence_number::text)::uuid,
  md5('brb-owner')::uuid,
  'Binder Race Boundary: fanout-' || sequence_number::text,
  'species',
  md5('brb-species')::uuid,
  'card_prints',
  'members_direct'
from generate_series(1, 21) sequence_number;

insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
)
select
  md5('brb-fanout-owner-member-' || sequence_number::text)::uuid,
  md5('brb-fanout-binder-' || sequence_number::text)::uuid,
  md5('brb-owner')::uuid,
  'owner',
  'active',
  now()
from generate_series(1, 21) sequence_number;
insert into public.binder_members (
  id,
  binder_id,
  user_id,
  role,
  state,
  joined_at
)
select
  md5('brb-fanout-member-' || sequence_number::text)::uuid,
  md5('brb-fanout-binder-' || sequence_number::text)::uuid,
  md5('brb-member')::uuid,
  'contributor',
  'active',
  now()
from generate_series(1, 21) sequence_number;

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
)
select
  md5('brb-fanout-contribution-' || sequence_number::text)::uuid,
  md5('brb-fanout-binder-' || sequence_number::text)::uuid,
  md5('brb-fanout-member-' || sequence_number::text)::uuid,
  md5('brb-member')::uuid,
  1,
  md5('brb-instance-6')::uuid,
  'active',
  public.generate_gv_vi_id_v1('BRB1', 6),
  md5('brb-card')::uuid,
  'manual',
  md5('brb-member')::uuid,
  now()
from generate_series(1, 19) sequence_number;

commit;
'@

try {
  $null = Invoke-LocalSql -Container $container -Sql $cleanupSql
  $null = Invoke-LocalSql -Container $container -Sql $setupSql

  # 1. Simultaneous duplicate contribution.
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $duplicateLeft = New-RaceSql -Role authenticated -UserSeed "brb-member" `
    -TargetMilliseconds $target -Body @"
select public.binder_contribution_add_v1(
  md5('brb-public-duplicate-contribution')::uuid,
  md5('brb-instance-1')::uuid,
  'brb-duplicate-left'
);
"@
  $duplicateRight = New-RaceSql -Role authenticated -UserSeed "brb-member" `
    -TargetMilliseconds $target -Body @"
select public.binder_contribution_add_v1(
  md5('brb-public-duplicate-contribution')::uuid,
  md5('brb-instance-1')::uuid,
  'brb-duplicate-right'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $duplicateLeft -RightSql $duplicateRight `
    -Label "simultaneous duplicate contribution"
  Invoke-Verification -Container $container `
    -Label "simultaneous duplicate contribution" -AssertionSql @"
  if (
    select count(*)
    from public.binder_contributions
    where binder_id = md5('brb-binder-duplicate-contribution')::uuid
      and vault_item_instance_id = md5('brb-instance-1')::uuid
      and state in ('pending', 'active')
  ) <> 1 then
    raise exception 'duplicate_contribution_boundary_failed';
  end if;
"@

  # 2. Member removal during contribution.
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $removeMember = New-RaceSql -Role authenticated -UserSeed "brb-owner" `
    -TargetMilliseconds $target -Body @"
select public.binder_member_remove_v1(
  md5('brb-member-row-member-removal')::uuid,
  'boundary race',
  'brb-member-remove'
);
"@
  $removeAdd = New-RaceSql -Role authenticated -UserSeed "brb-member" `
    -TargetMilliseconds $target -Body @"
select public.binder_contribution_add_v1(
  md5('brb-public-member-removal')::uuid,
  md5('brb-instance-2')::uuid,
  'brb-member-remove-add'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $removeMember -RightSql $removeAdd `
    -Label "member removal during contribution"
  Invoke-Verification -Container $container `
    -Label "member removal during contribution" -AssertionSql @"
  if (
    select state
    from public.binder_members
    where id = md5('brb-member-row-member-removal')::uuid
  ) <> 'removed'
  or exists (
    select 1
    from public.binder_contributions
    where binder_id = md5('brb-binder-member-removal')::uuid
      and state in ('pending', 'active')
  ) then
    raise exception 'member_removal_contribution_boundary_failed';
  end if;
"@

  # 3. Vault archival during contribution.
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $archiveAdd = New-RaceSql -Role authenticated -UserSeed "brb-member" `
    -TargetMilliseconds $target -Body @"
select public.binder_contribution_add_v1(
  md5('brb-public-vault-archive')::uuid,
  md5('brb-instance-3')::uuid,
  'brb-archive-add'
);
"@
  $archiveWrite = New-RaceSql -Role postgres -UserSeed "" `
    -TargetMilliseconds $target -Body @"
update public.vault_item_instances
set archived_at = now()
where id = md5('brb-instance-3')::uuid;
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $archiveAdd -RightSql $archiveWrite `
    -Label "Vault archival during contribution"
  Invoke-Verification -Container $container `
    -Label "Vault archival during contribution" -AssertionSql @"
  if (
    select archived_at is null
    from public.vault_item_instances
    where id = md5('brb-instance-3')::uuid
  )
  or exists (
    select 1
    from public.binder_contributions
    where binder_id = md5('brb-binder-vault-archive')::uuid
      and state in ('pending', 'active')
  ) then
    raise exception 'vault_archive_contribution_boundary_failed';
  end if;
"@

  # 4. Invitation replay.
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $replayLeft = New-RaceSql -Role authenticated -UserSeed "brb-invitee" `
    -TargetMilliseconds $target -Body @"
select public.binder_invite_accept_v1(
  'brb-invitation-replay-token-000001',
  'brb-replay-left'
);
"@
  $replayRight = New-RaceSql -Role authenticated -UserSeed "brb-invitee" `
    -TargetMilliseconds $target -Body @"
select public.binder_invite_accept_v1(
  'brb-invitation-replay-token-000001',
  'brb-replay-right'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $replayLeft -RightSql $replayRight `
    -Label "invitation replay"
  Invoke-Verification -Container $container `
    -Label "invitation replay" -AssertionSql @"
  if (
    select status
    from public.binder_invitations
    where id = md5('brb-replay-invitation')::uuid
  ) <> 'accepted'
  or (
    select count(*)
    from public.binder_members
    where binder_id = md5('brb-binder-invitation-replay')::uuid
      and user_id = md5('brb-invitee')::uuid
      and state = 'active'
  ) <> 1
  or (
    select count(*)
    from public.binder_activity_events
    where binder_id = md5('brb-binder-invitation-replay')::uuid
      and event_type = 'member_joined'
      and actor_user_id = md5('brb-invitee')::uuid
  ) <> 1 then
    raise exception 'invitation_replay_boundary_failed';
  end if;
"@

  # 5. Visibility/policy change during contribution approval.
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $approval = New-RaceSql -Role authenticated -UserSeed "brb-owner" `
    -TargetMilliseconds $target -Body @"
select public.binder_contribution_decide_v1(
  md5('brb-visibility-contribution')::uuid,
  'approve',
  'brb-visibility-approve'
);
"@
  $visibility = New-RaceSql -Role authenticated -UserSeed "brb-owner" `
    -TargetMilliseconds $target -Body @"
select public.binder_update_policy_v1(
  md5('brb-public-visibility-approval')::uuid,
  'private',
  'unlisted',
  'closed',
  'owner_only',
  'brb-visibility-private'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $approval -RightSql $visibility `
    -Label "visibility change during approval"
  Invoke-Verification -Container $container `
    -Label "visibility change during approval" -AssertionSql @"
  if exists (
    select 1
    from public.binders
    where id = md5('brb-binder-visibility-approval')::uuid
      and (
        read_access <> 'private'
        or discoverability <> 'unlisted'
        or contribution_policy <> 'owner_only'
      )
  )
  or exists (
    select 1
    from public.binder_contributions
    where id = md5('brb-visibility-contribution')::uuid
      and state = 'pending'
  ) then
    raise exception 'visibility_approval_boundary_failed';
  end if;
"@

  # 6. Owner transfer during invitation creation/member authority mutation.
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $transfer = New-RaceSql -Role authenticated -UserSeed "brb-transfer-target" `
    -TargetMilliseconds $target -Body @"
select public.binder_owner_transfer_accept_v1(
  md5('brb-transfer-offer')::uuid,
  'brb-transfer-accept'
);
"@
  $invite = New-RaceSql -Role authenticated -UserSeed "brb-owner" `
    -TargetMilliseconds $target -Body @"
select public.binder_invite_create_v1(
  md5('brb-public-transfer-invite')::uuid,
  'contributor',
  'brb-transfer-invite-create',
  md5('brb-recipient')::uuid,
  now() + interval '1 day'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $transfer -RightSql $invite `
    -Label "owner transfer during invite/member mutation"
  Invoke-Verification -Container $container `
    -Label "owner transfer during invite/member mutation" -AssertionSql @"
  if (
    select owner_user_id
    from public.binders
    where id = md5('brb-binder-transfer-invite')::uuid
  ) is distinct from md5('brb-transfer-target')::uuid
  or (
    select count(*)
    from public.binder_members
    where binder_id = md5('brb-binder-transfer-invite')::uuid
      and state = 'active'
      and role = 'owner'
  ) <> 1
  or (
    select count(*)
    from public.binder_invitations
    where binder_id = md5('brb-binder-transfer-invite')::uuid
      and intended_user_id = md5('brb-recipient')::uuid
      and status = 'pending'
  ) <> 1 then
    raise exception 'transfer_invite_boundary_failed';
  end if;
"@

  # 7. Duplicate milestone crossing.
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $milestoneLeft = New-RaceSql -Role service_role -UserSeed "" `
    -TargetMilliseconds $target -Body @"
select public.binder_service_canonical_refresh_v1(
  md5('brb-binder-milestone')::uuid,
  'brb-milestone-left',
  'brb-milestone-left'
);
"@
  $milestoneRight = New-RaceSql -Role service_role -UserSeed "" `
    -TargetMilliseconds $target -Body @"
select public.binder_service_canonical_refresh_v1(
  md5('brb-binder-milestone')::uuid,
  'brb-milestone-right',
  'brb-milestone-right'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $milestoneLeft -RightSql $milestoneRight `
    -Label "duplicate milestone crossing" -AllowedErrorPattern "(?!)"
  Invoke-Verification -Container $container `
    -Label "duplicate milestone crossing" -AssertionSql @"
  if (
    select count(*)
    from public.binder_progress_crossings
    where binder_id = md5('brb-binder-milestone')::uuid
  ) <> 5
  or (
    select count(*)
    from public.binder_activity_events
    where binder_id = md5('brb-binder-milestone')::uuid
      and event_type = 'milestone_crossed'
  ) <> 5 then
    raise exception 'duplicate_milestone_boundary_failed';
  end if;
"@

  # 8. Membership capacity boundary (49 -> 50).
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $memberBoundaryLeft = New-RaceSql -Role authenticated `
    -UserSeed "brb-boundary-user-50" -TargetMilliseconds $target -Body @"
select public.binder_invite_respond_v1(
  md5('brb-boundary-invitation-50')::uuid,
  'accept',
  'brb-boundary-accept-50'
);
"@
  $memberBoundaryRight = New-RaceSql -Role authenticated `
    -UserSeed "brb-boundary-user-51" -TargetMilliseconds $target -Body @"
select public.binder_invite_respond_v1(
  md5('brb-boundary-invitation-51')::uuid,
  'accept',
  'brb-boundary-accept-51'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $memberBoundaryLeft -RightSql $memberBoundaryRight `
    -Label "membership 49-to-50 boundary"
  Invoke-Verification -Container $container `
    -Label "membership 49-to-50 boundary" -AssertionSql @"
  if (
    select count(*)
    from public.binder_members
    where binder_id = md5('brb-binder-membership-boundary')::uuid
      and state in ('active', 'suspended')
  ) <> 50
  or (
    select count(*)
    from public.binder_invitations
    where binder_id = md5('brb-binder-membership-boundary')::uuid
      and status = 'accepted'
  ) <> 1 then
    raise exception 'membership_capacity_boundary_failed';
  end if;
"@

  # 9. Account-wide membership capacity boundary (99 -> 100).
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $accountBoundaryLeft = New-RaceSql -Role authenticated `
    -UserSeed "brb-account-boundary-user" -TargetMilliseconds $target -Body @"
select public.binder_invite_respond_v1(
  md5('brb-account-invitation-100')::uuid,
  'accept',
  'brb-account-accept-100'
);
"@
  $accountBoundaryRight = New-RaceSql -Role authenticated `
    -UserSeed "brb-account-boundary-user" -TargetMilliseconds $target -Body @"
select public.binder_invite_respond_v1(
  md5('brb-account-invitation-101')::uuid,
  'accept',
  'brb-account-accept-101'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $accountBoundaryLeft -RightSql $accountBoundaryRight `
    -Label "account membership 99-to-100 boundary"
  Invoke-Verification -Container $container `
    -Label "account membership 99-to-100 boundary" -AssertionSql @"
  if (
    select count(*)
    from public.binder_members
    where user_id = md5('brb-account-boundary-user')::uuid
      and state in ('active', 'suspended')
  ) <> 100
  or (
    select count(*)
    from public.binder_invitations
    where id in (
      md5('brb-account-invitation-100')::uuid,
      md5('brb-account-invitation-101')::uuid
    )
      and status = 'accepted'
  ) <> 1 then
    raise exception 'account_membership_capacity_boundary_failed';
  end if;
"@

  # 10. Exact-copy fanout boundary (19 -> 20).
  $target = [DateTimeOffset]::UtcNow.AddMilliseconds(900).ToUnixTimeMilliseconds()
  $fanoutLeft = New-RaceSql -Role authenticated -UserSeed "brb-member" `
    -TargetMilliseconds $target -Body @"
select public.binder_contribution_add_v1(
  md5('brb-fanout-public-20')::uuid,
  md5('brb-instance-6')::uuid,
  'brb-fanout-add-20'
);
"@
  $fanoutRight = New-RaceSql -Role authenticated -UserSeed "brb-member" `
    -TargetMilliseconds $target -Body @"
select public.binder_contribution_add_v1(
  md5('brb-fanout-public-21')::uuid,
  md5('brb-instance-6')::uuid,
  'brb-fanout-add-21'
);
"@
  $null = Invoke-ConcurrentPair -Container $container `
    -LeftSql $fanoutLeft -RightSql $fanoutRight `
    -Label "exact-copy 19-to-20 fanout boundary"
  Invoke-Verification -Container $container `
    -Label "exact-copy 19-to-20 fanout boundary" -AssertionSql @"
  if (
    select count(*)
    from public.binder_contributions
    where vault_item_instance_id = md5('brb-instance-6')::uuid
      and state in ('pending', 'active')
  ) <> 20
  or (
    select count(*)
    from public.binder_contributions
    where binder_id in (
      md5('brb-fanout-binder-20')::uuid,
      md5('brb-fanout-binder-21')::uuid
    )
      and vault_item_instance_id = md5('brb-instance-6')::uuid
      and state in ('pending', 'active')
  ) <> 1 then
    raise exception 'exact_copy_fanout_boundary_failed';
  end if;
"@
}
finally {
  try {
    $null = Invoke-LocalSql -Container $container -Sql $cleanupSql
  }
  finally {
    $restoreSql = @"
update public.binder_feature_flags
set enabled = case flag_key
  when 'schema_internal' then $($flagState['schema_internal'])
  when 'shared' then $($flagState['shared'])
  else enabled
end
where flag_key in ('schema_internal', 'shared');
"@
    $null = Invoke-LocalSql -Container $container -Sql $restoreSql
  }
}

Write-Host (
  "Collaborative Binders boundary race suite passed all 10 synchronized " +
  "race contracts with no deadlocks or timeout failures."
)
