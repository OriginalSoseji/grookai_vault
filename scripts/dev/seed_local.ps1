param(
  [string]$Email = 'tester@grookai.local',
  [string]$ImageUrl = 'https://picsum.photos/720/960'
)

function Invoke-Sql {
  param([string]$Sql)
  Write-Host "SEED_LOCAL: SQL => $Sql"
  & docker exec -i supabase_db_grookai_vault psql -U postgres -d postgres -t -A -v "ON_ERROR_STOP=1" -c $Sql
}

try {
  Write-Host "SEED_LOCAL: Looking up user by email '$Email'"
  $emailEsc = $Email.Replace("'","''")
  $emailSql = "select id from auth.users where email='$emailEsc' limit 1;"
  $raw = Invoke-Sql -Sql $emailSql
  $uid = ($raw | ForEach-Object { $_.Trim() }) -join ''
  Write-Host "SEED_LOCAL: Lookup raw=[$raw] parsed=[$uid]"
  if (-not $uid) {
    Write-Error "SEED_LOCAL: User not found for email '$Email'"; exit 1
  }
  Write-Host "SEED_LOCAL: Found user id $uid"

  $escapedImg = $ImageUrl.Replace("'","''")
  $doSqlTpl = @'
do $$
declare
  v_owner uuid := '__UID__';
  v_listing uuid;
  has_listing_images boolean;
  has_listed_at boolean;
begin
  -- guards
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='listings') then
    return;
  end if;
  select exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='listing_images'
  ) into has_listing_images;
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='listings' and column_name='listed_at'
  ) into has_listed_at;

  if has_listed_at then
    insert into public.listings(owner_id,title,visibility,status,listed_at)
    values (v_owner,'Seed Listing (dev)','public','active',now())
    returning id into v_listing;
  else
    insert into public.listings(owner_id,title,visibility,status)
    values (v_owner,'Seed Listing (dev)','public','active')
    returning id into v_listing;
  end if;

  if has_listing_images then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='listing_images' and column_name='thumb_3x4_url'
    ) then
      insert into public.listing_images(listing_id,image_url,thumb_3x4_url)
      values (v_listing,'__IMG__',null);
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='listing_images' and column_name='thumb_url'
    ) then
      insert into public.listing_images(listing_id,image_url,thumb_url)
      values (v_listing,'__IMG__',null);
    else
      insert into public.listing_images(listing_id,image_url)
      values (v_listing,'__IMG__');
    end if;
  end if;

  if exists (select 1 from pg_matviews where schemaname='public' and matviewname='wall_thumbs_3x4') then
    execute 'refresh materialized view public.wall_thumbs_3x4';
  end if;
end $$;
'@
  $doSql = $doSqlTpl.Replace('__UID__', $uid).Replace('__IMG__', $escapedImg)
  Invoke-Sql -Sql $doSql | Out-Null

  # REST smokes
  $status = supabase status | Out-String
  $pubKey = ($status | Select-String -Pattern "Publishable key:").ToString().Split(":")[-1].Trim()
  if (-not $pubKey) { Write-Error "SEED_LOCAL: Publishable key not found"; exit 1 }
  $api = 'http://127.0.0.1:54321'
  $h = @{ apikey=$pubKey; Authorization="Bearer $pubKey"; Prefer='count=exact' }

  $u1 = "$api/rest/v1/listings?select=id&limit=1"
  $u2 = "$api/rest/v1/wall_feed_view?select=listing_id&limit=1"

  try {
    $r1 = Invoke-WebRequest $u1 -Headers $h -Method GET -ErrorAction Stop
    $r2 = Invoke-WebRequest $u2 -Headers $h -Method GET -ErrorAction Stop
  } catch {
    Write-Host "SEED_LOCAL: First REST attempt failed; retrying without Authorization header"
    $h = @{ apikey=$pubKey; Prefer='count=exact' }
    $r1 = Invoke-WebRequest $u1 -Headers $h -Method GET -ErrorAction Stop
    $r2 = Invoke-WebRequest $u2 -Headers $h -Method GET -ErrorAction Stop
  }

  $range1 = $r1.Headers['Content-Range']
  $range2 = $r2.Headers['Content-Range']
  $c1 = if ($range1) { [int]($range1.Split('/')[-1]) } else { ($r1.Content | ConvertFrom-Json).Count }
  $c2 = if ($range2) { [int]($range2.Split('/')[-1]) } else { ($r2.Content | ConvertFrom-Json).Count }
  Write-Host "SEED_LOCAL: LISTINGS_COUNT=$c1"
  Write-Host "SEED_LOCAL: FEED_COUNT=$c2"
  if ($c1 -ge 1 -and $c2 -ge 1) { exit 0 } else { exit 1 }
}
catch {
  Write-Error ("SEED_LOCAL: ERROR: " + $_)
  exit 1
}
