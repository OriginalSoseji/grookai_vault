-- Template view for failing scans (create if scan_events exists)
-- select * from scan_events
-- where coalesce((meta->>'best_confidence')::numeric, 0) < 0.6
--    or (meta->>'type') in ('scan_none')
-- order by ts desc
-- limit 200;

