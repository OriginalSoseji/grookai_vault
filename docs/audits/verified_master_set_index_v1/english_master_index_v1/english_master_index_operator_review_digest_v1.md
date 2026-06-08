# English Master Index Operator Review Digest V1

This digest condenses the operator approval packet into review priorities.

It is not approval, not SQL, not a migration, and not an execution artifact.

## Status

| Field | Value |
| --- | --- |
| audit_only | true |
| approval_recorded | false |
| approval_status | operator_approval_not_recorded |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| pass | true |
| stop_findings | 0 |

## Summary

| Metric | Value |
| --- | ---: |
| approval rows | 106 |
| affected sets | 12 |
| child printing rows verified | 143 |
| high priority rows | 11 |
| medium priority rows | 27 |
| standard rows | 68 |

## Review Order

- Review high-priority name changes first.
- Review alphanumeric number rows next because SH/AR-style numbering can hide identity mistakes.
- Review standard set_code/number fill-ins by set.
- Do not approve any row unless source evidence and proposed fields are both accepted.
- Do not proceed to fresh snapshot or execution artifact until approval is explicitly recorded outside this digest.

## High Priority: Name Changes

| Priority | Flags | Set | Card Print ID | Source ID | Current Set | Proposed Set | Current Number | Proposed Number | Current Name | Proposed Name |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | ex10 | 2fdd39c8-7afa-4031-be84-649ac28a7b72 | ex10-113 |  | ex10 |  | 113 | Entei Star | Entei ★ |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | ex10 | 043dbc47-0815-4ef4-b31d-2027f70f2338 | ex10-114 |  | ex10 |  | 114 | Raikou Star | Raikou ★ |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | ex10 | 584c31ad-d7ac-4356-b9cc-4de3152511b2 | ex10-115 |  | ex10 |  | 115 | Suicune Star | Suicune ★ |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl2 | 8c817161-627f-4ff5-aa27-127757b88213 | pl2-71 |  | pl2 |  | 71 | Nidoran♀ | Nidoran ♀ |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl2 | bc120b0e-4aad-47c1-989b-a733435a2000 | pl2-72 |  | pl2 |  | 72 | Nidoran♂ | Nidoran ♂ |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl4 | 460e6437-4bc8-4a1c-90fc-546481f225e2 | pl4-94 |  | pl4 |  | 94 | Arceus LV. X | Arceus LV.X |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl4 | c5125a59-32a9-4a0f-98af-4cf4ad5d6d64 | pl4-95 |  | pl4 |  | 95 | Arceus LV. X | Arceus LV.X |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl4 | ad751d34-d43b-4644-ae2e-622725f781cd | pl4-96 |  | pl4 |  | 96 | Arceus LV. X | Arceus LV.X |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl4 | 1352eb03-1519-4e31-b7ad-a2d4af24ef65 | pl4-97 |  | pl4 |  | 97 | Gengar LV. X | Gengar LV.X |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl4 | 2fb3462d-4a19-4412-b8cd-848a669549a0 | pl4-98 |  | pl4 |  | 98 | Salamence LV. X | Salamence LV.X |
| high | name_change, number_change, set_code_change, currently_missing_set_code, currently_missing_number | pl4 | b319332c-aea7-4f3c-ad4c-02f0874b2d60 | pl4-99 |  | pl4 |  | 99 | Tangrowth LV. X | Tangrowth LV.X |

## Medium Priority: Alphanumeric Numbering

| Priority | Flags | Set | Card Print ID | Source ID | Current Set | Proposed Set | Current Number | Proposed Number | Current Name | Proposed Name |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | dp7 | e8444009-0c47-48a6-af07-f5b450ac0082 | dp7-SH1 |  | dp7 |  | SH1 | Drifloon | Drifloon |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | d139fca7-558c-4dad-9a46-f94e4d45ab6b | ecard3-H13 |  | ecard3 |  | H13 | Kabutops | Kabutops |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | 8c78b35f-6dd0-4b12-9709-8b4198ad3089 | ecard3-H14 |  | ecard3 |  | H14 | Ledian | Ledian |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | 02a4156d-5f67-4969-8288-c440938a923c | ecard3-H16 |  | ecard3 |  | H16 | Magcargo | Magcargo |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | bb73d56c-c46f-4341-b4a1-825a10c2406b | ecard3-H17 |  | ecard3 |  | H17 | Magcargo | Magcargo |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | 28d7a9bb-fcff-4e93-861d-d200770984d6 | ecard3-H18 |  | ecard3 |  | H18 | Magneton | Magneton |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | 415065f4-68dd-44a9-a0f0-d6375e203275 | ecard3-H22 |  | ecard3 |  | H22 | Piloswine | Piloswine |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | b7c244c2-35bf-4dbd-836c-1341a777d65e | ecard3-H23 |  | ecard3 |  | H23 | Politoed | Politoed |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | e99d7d18-af64-4d34-b62c-8a795f6da2c3 | ecard3-H24 |  | ecard3 |  | H24 | Poliwrath | Poliwrath |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | 9a1cc452-e8b4-48bf-acc9-e592fe9cc521 | ecard3-H27 |  | ecard3 |  | H27 | Rhydon | Rhydon |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | abcf71f3-edd8-4130-aaa3-b7fecada39e2 | ecard3-H30 |  | ecard3 |  | H30 | Umbreon | Umbreon |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | ecard3 | 7cbee94f-9f6a-441d-98e1-6a50da7f72d7 | ecard3-H31 |  | ecard3 |  | H31 | Vaporeon | Vaporeon |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl1 | 74b9d351-aecc-4ff9-8ed2-958311074af7 | pl1-SH4 |  | pl1 |  | SH4 | Lotad | Lotad |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl1 | e48e17b9-b693-4882-9e9f-d177dbce37c8 | pl1-SH5 |  | pl1 |  | SH5 | Swablu | Swablu |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl2 | f5ada689-45c1-4b23-ac62-6a9f0bc11c97 | pl2-RT2 |  | pl2 |  | RT2 | Frost Rotom | Frost Rotom |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl2 | 949f5c1d-6d29-41cd-91c9-0be81e5360c5 | pl2-RT4 |  | pl2 |  | RT4 | Mow Rotom | Mow Rotom |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl2 | 0a14f347-5dd0-425a-9c9c-ffd134a9de4f | pl2-RT6 |  | pl2 |  | RT6 | Charon's Choice | Charon's Choice |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl3 | 9089264b-fd13-4261-94ac-b252ab89f6c7 | pl3-SH8 |  | pl3 |  | SH8 | Relicanth | Relicanth |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl3 | e8a8c0b0-2213-4701-89a9-8926cc0d5669 | pl3-SH9 |  | pl3 |  | SH9 | Yanma | Yanma |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | cf859f9b-f1d6-41ec-9e38-c7fd27743777 | pl4-AR2 |  | pl4 |  | AR2 | Arceus | Arceus |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | 8b2c91cf-bd7c-4564-84ca-5863e1414257 | pl4-AR3 |  | pl4 |  | AR3 | Arceus | Arceus |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | 61cd00a6-3418-4980-ade8-b26c8d0b4d5c | pl4-AR4 |  | pl4 |  | AR4 | Arceus | Arceus |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | 63a0a7b8-bdfa-4a08-ad30-680bcc45802e | pl4-AR5 |  | pl4 |  | AR5 | Arceus | Arceus |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | 67e47461-e03c-4da3-8557-d3df639dbb98 | pl4-AR7 |  | pl4 |  | AR7 | Arceus | Arceus |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | 0db1b355-bb14-4042-8597-4afd1d9a2b77 | pl4-AR8 |  | pl4 |  | AR8 | Arceus | Arceus |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | 502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda | pl4-SH10 |  | pl4 |  | SH10 | Bagon | Bagon |
| medium | number_change, set_code_change, currently_missing_set_code, currently_missing_number, alphanumeric_number | pl4 | 22a0396f-a0fe-4680-8568-71246489db3c | pl4-SH11 |  | pl4 |  | SH11 | Ponyta | Ponyta |

## Standard Rows By Set

| Set | Name | Rows | Child Printings |
| --- | --- | ---: | ---: |
| col1 | Call of Legends | 2 | 6 |
| dp7 | Stormfront | 7 | 9 |
| ecard2 | Aquapolis | 13 | 26 |
| ecard3 | Skyridge | 4 | 8 |
| fut2020 | Pokémon Futsal 2020 | 1 | 1 |
| mep | MEP Black Star Promos | 10 | 10 |
| pl1 | Platinum | 7 | 8 |
| pl2 | Rising Rivals | 12 | 17 |
| pl3 | Supreme Victors | 7 | 7 |
| pl4 | Arceus | 4 | 9 |
| swsh2 | Rebel Clash | 1 | 2 |

## Explicit Non-Authorizations

- This digest is not approval.
- This digest is not an execution artifact.
- This digest does not record operator approval.
- This digest does not allow DB writes, migrations, cleanup, quarantine, insertion, deletion, or hiding.

Source artifact: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_operator_approval_packet_v1.json`
