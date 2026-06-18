# Variant Origin Source Acquisition Queue V1

Read-only queue for remaining parent-level variant origin explanations. This does not promote public copy and does not mutate DB rows.

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## Summary

- Gap rows queued: 73
- Queue groups: 33
- Priority 1 groups: 0
- Priority 2 groups: 0
- Scope-decision groups: 32
- Fingerprint: `2d1c85799be0cf7fd748413e76ece07c45725dbb0df5a2325e39f01ee2a3e704`

## Queue Groups

| priority | lane | token | row_count | sets | promotion_status |
| --- | --- | --- | --- | --- | --- |
| 3 | suffix_or_printed_number_scope_decision | alt | 14 | swsh7 | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | a | 12 | ecard2, exu, g1, xy10, xy3, xy4, xy6, xy9 | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | unkeyed | 7 | g1, sm4, xy4, xy7, xy9, xyp | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | b | 6 | ecard2, exu, xy9 | blocked_until_exact_origin_source |
| 3 | semantic_identity_scope_decision | unkeyed | 4 | pl2, swsh2, swsh4.5 | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | xya | 2 | xyp | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | ! | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | ? | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | c | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | d | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | e | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | f | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | g | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | i | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | j | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | k | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | l | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | m | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | n | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | o | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | p | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | q | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | r | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | s | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | t | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | u | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | v | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | w | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | x | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | xy | 1 | xyp | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | y | 1 | exu | blocked_until_exact_origin_source |
| 3 | suffix_or_printed_number_scope_decision | z | 1 | exu | blocked_until_exact_origin_source |
| 4 | manual_origin_mapping_needed | unkeyed | 2 | bwp | blocked_until_exact_origin_source |

## Source Targets

### alt

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 14
- Sets: swsh7
- Status: `blocked_until_exact_origin_source`
- Sample cards: Rayquaza VMAX swsh7 111; Duraludon V swsh7 122; Dragonite V swsh7 192; Noivern V swsh7 196; Leafeon VMAX swsh7 205; Glaceon VMAX swsh7 209; Sylveon VMAX swsh7 212; Umbreon VMAX swsh7 215
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### a

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 12
- Sets: ecard2, exu, g1, xy10, xy3, xy4, xy6, xy9
- Status: `blocked_until_exact_origin_source`
- Sample cards: Porygon ecard2 103a; Golduck ecard2 50a; Drowzee ecard2 74a; Mr. Mime ecard2 95a; Unown exu A; Jolteon-EX g1 28a; N xy10 105a; M Lucario-EX xy3 55a
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### unkeyed

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 7
- Sets: g1, sm4, xy4, xy7, xy9, xyp
- Status: `blocked_until_exact_origin_source`
- Sample cards: Team Flare Grunt g1 73a; Guzzlord-GX sm4 63a; Aegislash-EX xy4 65a; Hex Maniac xy7 75a; Delinquent xy9 98a; Yveltal-EX xyp XY150a; M Camerupt-EX xyp XY198a
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### b

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 6
- Sets: ecard2, exu, xy9
- Status: `blocked_until_exact_origin_source`
- Sample cards: Porygon ecard2 103b; Golduck ecard2 50b; Drowzee ecard2 74b; Mr. Mime ecard2 95b; Unown exu B; Delinquent xy9 98b
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### unkeyed

- Lane: `semantic_identity_scope_decision`
- Priority: 3
- Rows: 4
- Sets: pl2, swsh2, swsh4.5
- Status: `blocked_until_exact_origin_source`
- Sample cards: Team Galactic's Invention G-107 Technical Machine G pl2 95; Boss's Orders (Giovanni) swsh2 154; Boss's Orders (Lysandre) swsh4.5 58; Professor's Research (Professor Juniper) swsh4.5 60
- Recommended source targets:
  - card-specific checklist page proving exact parenthetical/name subject
  - governance decision on whether this is public origin copy or search/display metadata

### xya

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 2
- Sets: xyp
- Status: `blocked_until_exact_origin_source`
- Sample cards: M Sharpedo-EX xyp XY200a; Jirachi xyp XY67a
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### !

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu !
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### ?

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu ?
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### c

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu C
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### d

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu D
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### e

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu E
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### f

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu F
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### g

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu G
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### i

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu I
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### j

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu J
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### k

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu K
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### l

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu L
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### m

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu M
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### n

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu N
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### o

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu O
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### p

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu P
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### q

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu Q
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### r

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu R
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### s

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu S
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### t

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu T
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### u

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu U
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### v

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu V
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### w

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu W
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### x

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu X
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### xy

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: xyp
- Status: `blocked_until_exact_origin_source`
- Sample cards: Karen xyp XY177
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### y

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu Y
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### z

- Lane: `suffix_or_printed_number_scope_decision`
- Priority: 3
- Rows: 1
- Sets: exu
- Status: `blocked_until_exact_origin_source`
- Sample cards: Unown exu Z
- Recommended source targets:
  - set checklist page proving the printed suffix or special number
  - card-specific source page for exact set/name/number
  - governance decision on whether this belongs in public origin copy or printed identity docs

### unkeyed

- Lane: `manual_origin_mapping_needed`
- Priority: 4
- Rows: 2
- Sets: bwp
- Status: `blocked_until_exact_origin_source`
- Sample cards: Reshiram bwp BW004; Zekrom bwp BW005
- Recommended source targets:
  - card-specific official/checklist source
  - collector reference with exact card identity and variant label
  - marketplace exact product page only as supporting evidence
