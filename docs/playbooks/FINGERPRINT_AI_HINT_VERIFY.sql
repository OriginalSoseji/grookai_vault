-- Fingerprint AI hint verification (manual run in Supabase DB)

-- Expect exactly one ai_hint per analysis_key (unique constraint should enforce)
select analysis_key, event_type, count(*) as n
from public.fingerprint_provenance_events
where event_type = 'fingerprint_ai_hint'
group by analysis_key, event_type
order by n desc, analysis_key desc;

-- Baseline binding count (optional sanity check; should remain unchanged by ai hint)
select count(*) as bindings_count from public.fingerprint_bindings;
