create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- helper: build the HTTP headers JSON once per command
-- NOTE: pg_net expects jsonb; we pass strings and cast to jsonb.

-- sv8 page 1 @ 06:05 UTC
select cron.schedule(
  'nightly-sv8-page1',
  '5 6 * * *',
  <paste DB password>select net.http_post(
      url     := 'https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/import-prices',
      headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg","Content-Type":"application/json"}'::jsonb,
      body    := '{"set_code":"sv8","cardLimit":120,"cardOffset":0}'::jsonb
  );<paste DB password>
);

-- sv8 page 2 @ 06:10 UTC
select cron.schedule(
  'nightly-sv8-page2',
  '10 6 * * *',
  <paste DB password>select net.http_post(
      url     := 'https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/import-prices',
      headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg","Content-Type":"application/json"}'::jsonb,
      body    := '{"set_code":"sv8","cardLimit":120,"cardOffset":120}'::jsonb
  );<paste DB password>
);

-- sv8 page 3 @ 06:15 UTC
select cron.schedule(
  'nightly-sv8-page3',
  '15 6 * * *',
  <paste DB password>select net.http_post(
      url     := 'https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/import-prices',
      headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg","Content-Type":"application/json"}'::jsonb,
      body    := '{"set_code":"sv8","cardLimit":120,"cardOffset":240}'::jsonb
  );<paste DB password>
);

-- sv8pt5 page 1 @ 06:20 UTC
select cron.schedule(
  'nightly-sv8pt5-page1',
  '20 6 * * *',
  <paste DB password>select net.http_post(
      url     := 'https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/import-prices',
      headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg","Content-Type":"application/json"}'::jsonb,
      body    := '{"set_code":"sv8pt5","cardLimit":120,"cardOffset":0}'::jsonb
  );<paste DB password>
);

-- sv8pt5 page 2 @ 06:25 UTC
select cron.schedule(
  'nightly-sv8pt5-page2',
  '25 6 * * *',
  <paste DB password>select net.http_post(
      url     := 'https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/import-prices',
      headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg","Content-Type":"application/json"}'::jsonb,
      body    := '{"set_code":"sv8pt5","cardLimit":120,"cardOffset":120}'::jsonb
  );<paste DB password>
);

-- show jobs
select jobid, schedule, command from cron.job order by jobid desc;
