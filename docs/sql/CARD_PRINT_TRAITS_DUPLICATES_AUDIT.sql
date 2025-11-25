-- Duplicate audit for card_print_traits

-- Total trait rows
select count(*) as trait_rows
from card_print_traits;

-- Distinct card_print_ids
select count(distinct card_print_id) as distinct_card_print_ids
from card_print_traits;

-- Card_print_ids with more than one trait row
select count(*) as duplicated_card_print_ids
from (
  select card_print_id
  from card_print_traits
  group by card_print_id
  having count(*) > 1
) d;

-- Sample duplicates
select
  card_print_id,
  count(*) as rows_per_print
from card_print_traits
group by card_print_id
having count(*) > 1
order by rows_per_print desc
limit 20;
