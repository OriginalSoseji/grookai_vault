# MEE Market Listing Strict Title Evidence Audit V1

- Package: `MARKET-LISTING-STRICT-TITLE-EVIDENCE-AUDIT-V1`
- Fingerprint: `7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec`
- Source review queue: `90dd4d88dbd8eaf911ad76e0d3e40e848ca2a22ae092c42f83a627afda56ddb8`

## Summary

```json
{
  "total_rollups_audited": 2275,
  "strict_title_review_ready_count": 1839,
  "strict_title_review_required_mixed_titles_count": 383,
  "strict_title_blocked_title_mismatch_count": 53,
  "strict_title_blocked_no_candidate_titles_count": 0
}
```

## Buckets

```json
{
  "strict_title_blocked_title_mismatch": 53,
  "strict_title_review_required_mixed_titles": 383,
  "strict_title_review_ready": 1839
}
```

## Samples

```json
{
  "blocked_title_mismatch": [
    {
      "gv_id": "GV-PK-BASE1-1-1999-2000",
      "card_print_id": "38eb357c-736c-4d24-a56c-55b34447cb13",
      "evidence_class": "raw_single",
      "listing_count": 109,
      "seller_count": 90,
      "median_active_ask": 48.8,
      "minimum_active_ask": 7.99,
      "maximum_active_ask": 1159.99,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 7,
        "1999_2000_lane_missing_title_token": 25,
        "base_lane_has_base_set_2_noise": 6
      },
      "sample_failures": [
        {
          "title": "Pokemon Alakazam Holo Art Rare m1S: Mega Symphonia 071/063 NM",
          "total_ask_price": 7.99,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/298379304945?_skw=Pokemon+%22Alakazam%22+1&hash=item4578cadff1:g:13UAAeSw-UlqH3fB"
        },
        {
          "title": "1x Pokemon Alakazam ex Paldean Fates Shiny Ultra Rare 215/091🔥toploaded",
          "total_ask_price": 10.97,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/397916112215?_skw=Pokemon+%22Alakazam%22+1&hash=item5ca5a60557:g:KCAAAeSwyk1p-l1n"
        },
        {
          "title": "1999 Pokemon Alakazam 1/102 Base Set Holo Rare Unlimited WOTC HP/Damaged",
          "total_ask_price": 11.49,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/206368876858?_skw=Pokemon+%22Alakazam%22+1&hash=item300c8b293a:g:U9YAAeSwz6xqO0~o"
        },
        {
          "title": "Pokemon Alakazam (1/105) Base DMG HOLO",
          "total_ask_price": 19.95,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/127939484192?_skw=Pokemon+%22Alakazam%22+1&hash=item1dc9c99a20:g:vnwAAeSwlQtqO8Yi"
        },
        {
          "title": "Pokemon TCG Dark Alakazam 18 Team Rocket Rare 1st Ed LP",
          "total_ask_price": 20,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147315690112?_skw=Pokemon+%22Alakazam%22+1&hash=item224cb30a80:g:WUkAAeSwvQ9qCj16"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-10-FIRST-EDITION",
      "card_print_id": "27f7345f-c75e-4190-a0ed-378d5f1600a8",
      "evidence_class": "raw_single",
      "listing_count": 4,
      "seller_count": 4,
      "median_active_ask": 29.5,
      "minimum_active_ask": 25,
      "maximum_active_ask": 49.99,
      "strict_sample_count": 4,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "first_edition_lane_missing_title_token": 4,
        "base_lane_has_base_set_2_noise": 1
      },
      "sample_failures": [
        {
          "title": "🔥 Mewtwo Holo Rare 10/102 Base Set Unlimited Lightly Played LP Pokemon TCG 🔥",
          "total_ask_price": 25,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/336656816215?_skw=Pokemon+%22Mewtwo%22+10&hash=item4e624f5857:g:jH0AAeSwFARqPZOd"
        },
        {
          "title": "Pokemon TCG Base Set Mewtwo 10/102 Holo Rare Unlimited Autographed",
          "total_ask_price": 28,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137452778716?_skw=Pokemon+%22Mewtwo%22+10&hash=item2000d2f4dc:g:DpYAAeSwvnVqPWW6&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbyuQ9D1vNisy95D8R0BPvAGJFLlHXK5Kb%2BlU7sDqsbxs39tyOP2FZckvrJ3Sv6rvrdEdZqb9BOJVagfScNpdNCLEIv%2FnmeyOUgDOh3ngWb%2FzO8NnK8uoK5iTvqTzTjh4gjoe6sQFcuYOSnCCfO8jqXklOgv2UzGXfW%2F9FTP9SMFuiurgn4%2BEfKeixLjVtr1QvNSRa50LBLP2M5QCsCwdpXPsha5kOL21DxHLpdte2qy%2FDsERBVvtXh5bHivNXFuaAD1Of1NI88ser5qJmwogVKvcw32x80AXp33HZkVZUYTg%3D%3D"
        },
        {
          "title": "Mewtwo 10/130 Holo Rare Base Set 2 Pokemon Holo Moderately Played",
          "total_ask_price": 31,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168464900787?_skw=Pokemon+%22Mewtwo%22+10&hash=item27394a62b3:g:XF4AAeSwWS1qMZWN"
        },
        {
          "title": "Mewtwo 10/102 Holo Holo Rare Base Set Unlimited Pokemon TCG LP",
          "total_ask_price": 49.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318482612874?_skw=Pokemon+%22Mewtwo%22+10&hash=item4a270b028a:g:7FoAAeSwArRqNuRt"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-11-1999-2000",
      "card_print_id": "8df4d1f6-46f5-47cc-b480-6afd30cb7e2b",
      "evidence_class": "raw_single",
      "listing_count": 146,
      "seller_count": 131,
      "median_active_ask": 26.24,
      "minimum_active_ask": 10,
      "maximum_active_ask": 880.99,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "1999_2000_lane_missing_title_token": 24,
        "base_lane_has_base_set_2_noise": 9,
        "base_lane_missing_base_set": 2
      },
      "sample_failures": [
        {
          "title": "Wizards of the Coast Pokemon TCG Base Set Nidoking 11/102 Holo Rare 1999 EN",
          "total_ask_price": 10,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/358698253271?_skw=Pokemon+%22Nidoking%22+11&hash=item538414fbd7:g:xooAAeSwnudqNPJt"
        },
        {
          "title": "Nidoking 11/102 Pokemon Base Set Holo Card Heavily Played/Damaged",
          "total_ask_price": 10.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/188543738155?_skw=Pokemon+%22Nidoking%22+11&hash=item2be615212b:g:j4oAAeSw9tRqOIUD"
        },
        {
          "title": "Wizards of the Coast Pokemon TCG Nidoking 11/102 Base Set Holo Rare Unlimited",
          "total_ask_price": 12,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/298443101514?_skw=Pokemon+%22Nidoking%22+11&hash=item457c98554a:g:QYAAAeSwPYBqOa0n"
        },
        {
          "title": "Nidoking 11/130 Holo Rare Base Set 2 Pokemon Holo Damaged",
          "total_ask_price": 14,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/158020767571?_skw=Pokemon+%22Nidoking%22+11&hash=item24cac58f53:g:CS0AAeSw5oRqOuk1"
        },
        {
          "title": "Nidoking 11/102 Holo Holo Rare Base Set Unlimited Pokemon Holo Damaged",
          "total_ask_price": 14.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/327227660614?_skw=Pokemon+%22Nidoking%22+11&hash=item4c3049d946:g:hmYAAeSwJg5qOcaI"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-12-1999-2000",
      "card_print_id": "4168d1d8-e7c6-495d-9b2d-dacc7c2815a4",
      "evidence_class": "raw_single",
      "listing_count": 145,
      "seller_count": 126,
      "median_active_ask": 18.99,
      "minimum_active_ask": 1.49,
      "maximum_active_ask": 2020,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 15,
        "1999_2000_lane_missing_title_token": 25
      },
      "sample_failures": [
        {
          "title": "SWSH12: Silver Tempest Ninetales #018/195 Uncommon Pokemon Card",
          "total_ask_price": 1.49,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/397301892868?_skw=Pokemon+%22Ninetales%22+12&hash=item5c8109c704:g:LoUAAeSwcu9pIIWs"
        },
        {
          "title": "Ninetales 018/195 Uncommon - Pokemon SWSH12: Silver Tempest",
          "total_ask_price": 1.6,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178147915581?_skw=Pokemon+%22Ninetales%22+12&hash=item297a71773d:g:WnsAAeSwtmpqDH1S"
        },
        {
          "title": "Ninetales - 018/195 Reverse Holo - Silver Tempest (SWSH12) - Pokemon LP",
          "total_ask_price": 1.69,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/278119839330?_skw=Pokemon+%22Ninetales%22+12&hash=item40c13bf662:g:sWkAAeSw6zxqOzzF"
        },
        {
          "title": "Pokemon Ninetales Reverse Holo Uncommon SWSH12: Silver Tempest 018/195 NM",
          "total_ask_price": 1.74,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/157908137480?_skw=Pokemon+%22Ninetales%22+12&hash=item24c40ef608:g:-sAAAeSw6YZqBN-e"
        },
        {
          "title": "Ninetales #018/195 Reverse Holo Uncommon SWSH12: Silver Tempest Pokemon TCG NM",
          "total_ask_price": 1.79,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/117262439109?_skw=Pokemon+%22Ninetales%22+12&hash=item1b4d62d2c5:g:mZ4AAeSw9SlqOPfS"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-12-FIRST-EDITION",
      "card_print_id": "e7f9f059-ddc0-45e5-8caa-b14bfc7e8610",
      "evidence_class": "raw_single",
      "listing_count": 6,
      "seller_count": 6,
      "median_active_ask": 20.17,
      "minimum_active_ask": 14.99,
      "maximum_active_ask": 43,
      "strict_sample_count": 6,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "first_edition_lane_missing_title_token": 6,
        "base_lane_missing_base_set": 1
      },
      "sample_failures": [
        {
          "title": "Pokemon TCG Base Set Ninetales 12/102 Holo Rare 80 HP English 1999 Sugimori",
          "total_ask_price": 14.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/188490602459?_skw=Pokemon+%22Ninetales%22+12&hash=item2be2ea57db:g:Z~gAAeSwnrNqKMjG&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZtD7ZCA0u%2B%2FuF4jd0LTJ%2FbDH5dL3irUh%2BgSxQ4dyxdYg4WP9R3Mco6t8jITdj%2BgPqR6%2FNb90%2FwHkDQXIGAN023HIfZJY0sW4cyDJEh2BjiNNCbgrhKlf0s1v52XTDQdJplUBkR0ykUaB8P9%2F0FtWnO0%2FtgxV97Kb8W4EU4YOK14RR3YMkRpwyU7tq0TwHV1EyhIUZcmoJ1zgLapwceiTjsH4P6iU043b6RatRbGMj7dCsXxevF7l9cq6c%2FynjbLIsK71nZWGH9kPVK4bzRQX43unNhMzOuTqxl2bT8%2FZhObQ%3D%3D"
        },
        {
          "title": "Ninetales 12/102 Holo Rare Base Set WOTC Pokemon Card ",
          "total_ask_price": 15.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/307023674210?_skw=Pokemon+%22Ninetales%22+12&hash=item477c097b62:g:AEYAAeSwQjhqPKrR&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYY2BDDMOEbvSLShzD%2F8jbmfUw%2B82sL4VfYVV4HVmHkPI8lB5xeI1K%2B8XwiiYCUu6JUATCa%2F8z1LCE7gRW30CNPRXV7sGqbil4EKM8xfN24A4ag7Q2wfVYCOLJ4mIsFxcXmKi3uTRb12%2BoyhSm0vuX9Uvb%2B7cdzLAQEiH4G2RXxcCuRuFqbIdVP2upR4fDAFKd1JnHo1xpCUDpP%2Bk5iDJ9JA4NcSQjVZWXg0O86LEQUXq2gP%2Bu6%2BRIeGwW2cDIroQteU%2FKztQlwFcQ%2Fjw0wNVsOVv9jf5M3YGHp6Jc1sGyF4Q%3D%3D"
        },
        {
          "title": "1999 POKEMON GAME 12 NINETALES-HOLO SHADOWLESS",
          "total_ask_price": 20,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236881142837?_skw=Pokemon+%22Ninetales%22+12&hash=item3727376435:g:LLUAAeSwEJpqAVmC&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGanZfzRLqq%2BUBAymcQrqBdNi0bb%2FZXVB7hbGR1zzf6sP2c6c%2FGQ3EO%2FWRdz9SlAMY0yldZTwAVGlu9j%2BFF%2BqMelHRw7rjCFRxTSPYicCMh12kiD%2Fga8SKXLkm%2FFP9KHXDoPEoLx2zlzANrUdpFgJE5HAfVi2uIysLj7lbjF6kI6DWBNdqaRgqdaJPybn4MujW71YuFO1r00dNugD4Ph1%2Bkb6fqeJxW%2F8LjC2P7WoEoCy9HCYQpT%2BNUrjE5uGoMGZSc5fjnPi9qtCZqrMwaGteLP1PulLqOA1qL%2Bxq6FvVZqYQ%3D%3D"
        },
        {
          "title": "Ninetales 12/102 Base Set Holo Rare Unlimited WoTC Pokemon 1999 MP",
          "total_ask_price": 20.34,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137412521925?_skw=Pokemon+%22Ninetales%22+12&hash=item1ffe6cafc5:g:hUcAAeSwpfdqLfmv&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYUgaiJ5MACH5JWPsy1W9HPNrHQFUotl3LYQFdrIy0iaR7QcZoakKVv%2F50c8SJu1qDoTTNxln9KsbdfQL7kGnkaHDJ2O7o7KPKbGcsQG3q1vILPyyJpRnmLjBepMuZ35lp1zq3To1%2FSTXW5YyxfE4L%2Fr4b%2F%2BDJ3B68Ilg0FfrKOFkawaIIdPpJN0P9S3qIP8XH1Gl6v1UFjRel1g7zAMx7JS2Da%2BaxK240pXcJy13JI7%2BZ3rwYsvtzkSpbyATkkBH5xSb5bx9n0M3QvQssQ1tHUWGd92bUuYu6o0rC195qmvA%3D%3D"
        },
        {
          "title": "Pokemon Base Set Ninetales Holo 12/102 - MP",
          "total_ask_price": 23,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178193275526?_skw=Pokemon+%22Ninetales%22+12&hash=item297d259a86:g:bhIAAeSwc7BqIcux"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-13-1999-2000",
      "card_print_id": "f78191cd-f36b-4759-9826-300c2963c8a4",
      "evidence_class": "raw_single",
      "listing_count": 134,
      "seller_count": 117,
      "median_active_ask": 21.93,
      "minimum_active_ask": 9.99,
      "maximum_active_ask": 452.01,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "1999_2000_lane_missing_title_token": 25
      },
      "sample_failures": [
        {
          "title": "Wizards of the Coast Pokemon TCG Poliwrath Base Set 13/102 Holo Rare 90 HP",
          "total_ask_price": 9.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/406963270888?_skw=Pokemon+%22Poliwrath%22+13&hash=item5ec0e6b4e8:g:TcQAAeSwQ7JqG8LH"
        },
        {
          "title": "Poliwrath 13/102 Holo Holo Rare Base Set Unlimited Pokemon DMG",
          "total_ask_price": 10.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/188520610738?_skw=Pokemon+%22Poliwrath%22+13&hash=item2be4b43bb2:g:Ey8AAeSwQMRqMYVK"
        },
        {
          "title": "Poliwrath 13/102 Holo Holo Rare Base Set Unlimited Pokemon Holo Heavily Played",
          "total_ask_price": 10.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/278072123511?_skw=Pokemon+%22Poliwrath%22+13&hash=item40be63e077:g:LjMAAeSwNwJqKHRd"
        },
        {
          "title": "Poliwrath 13/102 Holo Holo Rare Base Set Unlimited Pokemon Holo Heavily Played",
          "total_ask_price": 10.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/127940374150?_skw=Pokemon+%22Poliwrath%22+13&hash=item1dc9d72e86:g:YDoAAeSwQ61qPFDH"
        },
        {
          "title": "Pokemon TCG Poliwrath 13/102 Base Set Holo WOTC Trading Card Vintage 1999",
          "total_ask_price": 11.02,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/306600621733?_skw=Pokemon+%22Poliwrath%22+13&hash=item4762d236a5:g:2tkAAeSwUTtpFjzL"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-13-FIRST-EDITION",
      "card_print_id": "eec1c99c-eaee-4923-b193-691804a6f240",
      "evidence_class": "raw_single",
      "listing_count": 19,
      "seller_count": 18,
      "median_active_ask": 29.99,
      "minimum_active_ask": 15,
      "maximum_active_ask": 100,
      "strict_sample_count": 19,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "first_edition_lane_missing_title_token": 19,
        "base_lane_missing_base_set": 3
      },
      "sample_failures": [
        {
          "title": "Poliwrath 13/102 Base Set Unlimited Holo Rare LP-MP Pokemon TCG NM",
          "total_ask_price": 15,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168445476603?_skw=Pokemon+%22Poliwrath%22+13&hash=item273821fefb:g:dC8AAeSw-PlqKKjW&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbgyaoZ0EEkbaezYFA2sjeQrlgcwx9HDXpSfanUECh%2BSaH99ac7G67WRK5eR%2FrF0jhWgtIuUgqYORKJiAtA0K16ErvRlj0XB6j3b34K1NRa3enixS3XWaHBkpO6tLYqq7VOKhWpDePbOHW20Y4Z3zkGiuzcTeipLrX9oQKPKhhh79Vqw417CUKLqjYQrMbUhS%2Bemif3CIVb%2FJGigXaXuqNzNaikFCYOeIOK%2B7MLDz2NNHfMc%2FRo1%2B%2FzV9%2FIW8lz%2FOcBt%2FmbAqGhXcTP17QSbSTaMd1icGAnvuDY9fQQj2jPdw%3D%3D"
        },
        {
          "title": "Pokemon TCG Base Set Poliwrath 13/102 Holo Rare WOTC Card LP 🔥 ",
          "total_ask_price": 17.86,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318288541120?_skw=Pokemon+%22Poliwrath%22+13&hash=item4a1b79b5c0:g:14cAAeSwVKVqAovl&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZzKnBuYBwQGSVfZDYXkwvvXnVBWJTimxBjUSKBI3ZFevXbWn58X5z73zdJ7J1Mqg0Ju0N68pvZlMRQny9bceVxN%2BeOvJEGn1qb6ebzSU%2FCq9LuKy%2Fd4nQuudAUxEzeVGbJma%2BFP1ttfDLauTdZXmacMgi5N%2BKupS6WDRol0t6AnifLNEbXGqH%2BeHgFuTNiz5ZVBaUTehwzoE2ThBqpr%2FIBf97sOOw2dLVotNcLsMbsTCcW56TR2Y9GEOFFsNCc1TDR3gnTYUHewpHU0t0Vbdk5tVoMWA1rZ%2BTlQfQOtRKMlg%3D%3D"
        },
        {
          "title": "Poliwrath 13/102 Base Holo Rare Pokemon Card DMG",
          "total_ask_price": 19.99,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/198423928425?_skw=Pokemon+%22Poliwrath%22+13&hash=item2e32fcde69:g:5IgAAeSwwHJqLZft"
        },
        {
          "title": "Poliwrath 13/102 Holo Rare Base Set Unlimited Pokemon Card",
          "total_ask_price": 19.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/327199701347?_skw=Pokemon+%22Poliwrath%22+13&hash=item4c2e9f3963:g:GpEAAeSw4BVqJIT2"
        },
        {
          "title": "Pokemon Card - Poliwrath Base Set Unlimited 13/102 Holo Holo Rare LP",
          "total_ask_price": 20,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/336634670135?_skw=Pokemon+%22Poliwrath%22+13&hash=item4e60fd6c37:g:D08AAeSwmGpqKzjf"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-14-1999-2000",
      "card_print_id": "2fb38836-b2e0-4e44-98a4-545c43a0d45f",
      "evidence_class": "raw_single",
      "listing_count": 123,
      "seller_count": 104,
      "median_active_ask": 37.98,
      "minimum_active_ask": 0.99,
      "maximum_active_ask": 829.98,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 21,
        "1999_2000_lane_missing_title_token": 25
      },
      "sample_failures": [
        {
          "title": "Pokemon TCG SM Trainer Kit: Lycanroc & Alolan Raichu Rockruff (#14) 14/30",
          "total_ask_price": 0.99,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236836932697?_skw=Pokemon+%22Raichu%22+14&hash=item372494cc59:g:RrQAAeSwZPJqFIQO"
        },
        {
          "title": "Raichu 14/62 Holo Rare Fossil Pokemon Unlimited Holo Heavily Played",
          "total_ask_price": 11.99,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236897488834?_skw=Pokemon+%22Raichu%22+14&hash=item372830cfc2:g:tZMAAeSwCPVqPNoG"
        },
        {
          "title": "Pokemon Raichu 14/62 Fossil Holo Rare Unlimited WOTC 1999 HP/Played",
          "total_ask_price": 17.43,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137337507171?_skw=Pokemon+%22Raichu%22+14&hash=item1ff9f40d63:g:c8MAAeSwPeFqEcpl"
        },
        {
          "title": "Pokemon TCG Fossil - Raichu (14/62) - MP",
          "total_ask_price": 17.5,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/377222722180?_skw=Pokemon+%22Raichu%22+14&hash=item57d439f284:g:KVwAAeSwx6BqG4ow"
        },
        {
          "title": "Raichu 14/62 Holo Rare Fossil Pokemon Card LP Lightly Played Vintage WOTC",
          "total_ask_price": 18,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168466191955?_skw=Pokemon+%22Raichu%22+14&hash=item27395e1653:g:6p8AAeSwtAZqMhCu"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-16-1999-2000",
      "card_print_id": "37fb3c2b-313b-4799-839a-e890eca79cb6",
      "evidence_class": "raw_single",
      "listing_count": 125,
      "seller_count": 109,
      "median_active_ask": 35,
      "minimum_active_ask": 7.99,
      "maximum_active_ask": 355.16,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "1999_2000_lane_missing_title_token": 25,
        "base_lane_has_base_set_2_noise": 1,
        "base_lane_missing_base_set": 3
      },
      "sample_failures": [
        {
          "title": "Zapdos 16/102 Holo Rare Base Set Pokemon Card",
          "total_ask_price": 7.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/158003834994?_skw=Pokemon+%22Zapdos%22+16&hash=item24c9c33072:g:wKoAAeSw1OhqMNks"
        },
        {
          "title": "Nintendo Pokemon TCG Zapdos 16/69 Base Set Holo Rare Lightning Pokemon Card",
          "total_ask_price": 12,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318469670303?_skw=Pokemon+%22Zapdos%22+16&hash=item4a2645859f:g:SyMAAeSw9tRqMvqx"
        },
        {
          "title": "ZAPDOS 1999 Base Set Holo Rare Pokemon Card 16/102 Vintage Damaged",
          "total_ask_price": 12,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178151806151?_skw=Pokemon+%22Zapdos%22+16&hash=item297aacd4c7:g:SAIAAeSw77xqDltn"
        },
        {
          "title": "1999 Pokemon Base Set 2 Zapdos Holo 16/130 WOTC Vintage DMG Crease",
          "total_ask_price": 14.24,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/366481268180?_skw=Pokemon+%22Zapdos%22+16&hash=item5553fc5dd4:g:lAgAAeSwSHJqMEou"
        },
        {
          "title": "Pokemon TCG Zapdos Base Set 16/102 Holo Rare 90 HP Basic Eng 1999 WOTC",
          "total_ask_price": 15,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/366498528153?_skw=Pokemon+%22Zapdos%22+16&hash=item555503bb99:g:HPEAAeSwa4pqOlAd"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-2-1999-2000",
      "card_print_id": "3b677f8e-0cd5-47c4-ab81-e3cbfa9e2e52",
      "evidence_class": "raw_single",
      "listing_count": 98,
      "seller_count": 92,
      "median_active_ask": 98.4,
      "minimum_active_ask": 2.49,
      "maximum_active_ask": 950,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 14,
        "1999_2000_lane_missing_title_token": 25,
        "base_lane_has_base_set_2_noise": 3
      },
      "sample_failures": [
        {
          "title": "Blastoise ex Holo 009/165 SV2a: Pokemon Card 151 Double Rare Pokemon Card NM",
          "total_ask_price": 2.49,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178187883426?_skw=Pokemon+%22Blastoise%22+2&hash=item297cd353a2:g:9mQAAeSwmoJqH4Ti"
        },
        {
          "title": "Pokemon Blastoise ex Double Rare SV2a: Pokemon Card 151 009/165 NM",
          "total_ask_price": 2.49,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/407013682595?_skw=Pokemon+%22Blastoise%22+2&hash=item5ec3e7eda3:g:pvEAAeSwMWtqNbIE"
        },
        {
          "title": "Pokemon SV2a: Pokemon Card 151 #009/165 Blastoise ex",
          "total_ask_price": 2.49,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/278123021634?_skw=Pokemon+%22Blastoise%22+2&hash=item40c16c8542:g:TCQAAeSwkEFqPI98"
        },
        {
          "title": "Pokemon Pocket TCG Card 2 Star Full Rainbow Mega Blastoise EX Crimson DIGITAL",
          "total_ask_price": 5.99,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/157616022214?_skw=Pokemon+%22Blastoise%22+2&hash=item24b2a5a2c6:g:oEsAAeSwLGBqFQiO"
        },
        {
          "title": "Pokemon Blastoise ex Holo Super Rare SV2a: Pokemon Card 151 186/165 NM",
          "total_ask_price": 9.98,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287401419648?_skw=Pokemon+%22Blastoise%22+2&hash=item42ea75a380:g:ipoAAeSw0-1qMsph"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-2-FIRST-EDITION",
      "card_print_id": "80bac106-d594-47c7-9518-9d21606f9e2a",
      "evidence_class": "raw_single",
      "listing_count": 31,
      "seller_count": 29,
      "median_active_ask": 90,
      "minimum_active_ask": 2.49,
      "maximum_active_ask": 950,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 6,
        "first_edition_lane_missing_title_token": 25,
        "base_lane_has_base_set_2_noise": 3
      },
      "sample_failures": [
        {
          "title": "Blastoise ex Holo 009/165 SV2a: Pokemon Card 151 Double Rare Pokemon Card NM",
          "total_ask_price": 2.49,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178187883426?_skw=Pokemon+%22Blastoise%22+2&hash=item297cd353a2:g:9mQAAeSwmoJqH4Ti"
        },
        {
          "title": "Pokemon Blastoise ex Double Rare SV2a: Pokemon Card 151 009/165 NM",
          "total_ask_price": 2.49,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/407013682595?_skw=Pokemon+%22Blastoise%22+2&hash=item5ec3e7eda3:g:pvEAAeSwMWtqNbIE"
        },
        {
          "title": "Blastoise ex Super Rare SV2a: Pokemon Card 151 186/165 NM",
          "total_ask_price": 11.99,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/206369105596?_skw=Pokemon+%22Blastoise%22+2&hash=item300c8ea6bc:g:BfQAAeSwlnZqO3iI"
        },
        {
          "title": "Pokemon Blastoise ex Super Rare SV2a: Pokemon Card 151 186/165 NM",
          "total_ask_price": 11.99,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/407013682624?_skw=Pokemon+%22Blastoise%22+2&hash=item5ec3e7edc0:g:XwgAAeSwnKhqNbH3"
        },
        {
          "title": "*DAMAGED/PEELING* - Blastoise 2/102 Base Set Holo Pokemon TCG 1999 English WOTC",
          "total_ask_price": 42.980000000000004,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/257581357764?_skw=Pokemon+%22Blastoise%22+2&hash=item3bf90b9ac4:g:vsQAAeSwvqtqOZ7c"
        }
      ],
      "sample_passes": []
    },
    {
      "gv_id": "GV-PK-BASE1-3-1999-2000",
      "card_print_id": "5da62e21-db0f-499f-81c8-b6d67a9b2943",
      "evidence_class": "raw_single",
      "listing_count": 157,
      "seller_count": 120,
      "median_active_ask": 20,
      "minimum_active_ask": 7.99,
      "maximum_active_ask": 119.99,
      "strict_sample_count": 25,
      "strict_pass_count": 0,
      "strict_pass_ratio": 0,
      "strict_review_bucket": "strict_title_blocked_title_mismatch",
      "strict_reason_counts": {
        "base_lane_has_base_set_2_noise": 17,
        "1999_2000_lane_missing_title_token": 25,
        "base_lane_missing_base_set": 5
      },
      "sample_failures": [
        {
          "title": "Pokemon Chansey 3/130 WotC Base Set 2 Holo Rare",
          "total_ask_price": 7.99,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287119312820?_skw=Pokemon+%22Chansey%22+3&hash=item42d9a507b4:g:mxMAAeSwiPtpggB0"
        },
        {
          "title": "Chansey 3/102 Holo Holo Rare Base Set Unlimited Pokemon Holo Damaged",
          "total_ask_price": 8,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/358718049830?_skw=Pokemon+%22Chansey%22+3&hash=item5385430e26:g:iasAAeSwUMpqPCzn"
        },
        {
          "title": "BASE SET 2 - CHANSEY   #3/130 - Rare HOLOFOIL HOLO POKEMON MP",
          "total_ask_price": 8.99,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168477711405?_skw=Pokemon+%22Chansey%22+3&hash=item273a0ddc2d:g:eo8AAeSwKqNqN0zd"
        },
        {
          "title": "2000 Pokemon BASE 2 CHANSEY HOLO 3/130 RARE! HP WEAR",
          "total_ask_price": 11.24,
          "reasons": [
            "base_lane_missing_base_set",
            "base_lane_has_base_set_2_noise",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137423916418?_skw=Pokemon+%22Chansey%22+3&hash=item1fff1a8d82:g:fzYAAeSwkXBqFjV4"
        },
        {
          "title": "2000 WOTC Pokemon BASE 2 CHANSEY HOLO 3/130 RARE! HP DMG POOR",
          "total_ask_price": 11.24,
          "reasons": [
            "base_lane_missing_base_set",
            "base_lane_has_base_set_2_noise",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137423916893?_skw=Pokemon+%22Chansey%22+3&hash=item1fff1a8f5d:g:zvAAAeSwSshqGvOB"
        }
      ],
      "sample_passes": []
    }
  ],
  "mixed_titles": [
    {
      "gv_id": "GV-PK-BASE1-1-FIRST-EDITION",
      "card_print_id": "a25593f0-3d52-40c8-9a0c-e13d65663413",
      "evidence_class": "raw_single",
      "listing_count": 11,
      "seller_count": 11,
      "median_active_ask": 50,
      "minimum_active_ask": 31.99,
      "maximum_active_ask": 2000,
      "strict_sample_count": 11,
      "strict_pass_count": 2,
      "strict_pass_ratio": 0.182,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_has_base_set_2_noise": 2,
        "first_edition_lane_missing_title_token": 9,
        "base_lane_missing_base_set": 2
      },
      "sample_failures": [
        {
          "title": "Pokemon TCG Alakazam 1/130 Base Set 2 Holo Rare Unlimited 2000 Very good Cond.",
          "total_ask_price": 31.99,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/298394152422?_skw=Pokemon+%22Alakazam%22+1&hash=item4579ad6de6:g:dZgAAeSwjERqJdi-&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYGr4OYK1RN%2BySKY4bUr8AMV7idr9QDI9uit%2BUv5hiWa5PKHTwFoFZR3LwKXyfuuIHamQzrcZYVE5k5fNntqbsHK8PsvGiQrWNT4D8pof2NTBsLVB%2FjxYBtqPPbZLa1PhIiNhh7m9OeOep34CO52PLlGRGmLe9AUJz6xqrxGjTx9s8XwlproRRM1DvanKLrwAw6VtU1%2BMbU3Ysge1v3KcdIZN3T94rXnTCVoeOQskOMDdOzUZ%2FODzJqeMy9YboJKl8860UEUsHopNmPEXrWp3Ie5vG%2Fqej6JkaU3RMKOJzT6Q%3D%3D"
        },
        {
          "title": "Pokemon TCG Alakazam 1/102 Base Set Holo Rare English 80 HP Stage 2 Ken Sugimori",
          "total_ask_price": 32,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/800045522361?_skw=Pokemon+%22Alakazam%22+1&hash=itemba466dddb9:g:xUEAAeSwa2BqDQSY&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbrjarPBHpTSARV%2Bv9kgfPLxtjk310Mki83zH5vbXYGQ1kt2mLzhIrsOB%2FKFeqjcXHGPTmNjew5tnNKbWO846AwV1k0II7ubVTFYBVzt3lcZWfuNKWFTGrkC0oB3udSstJybu5PnRDnNRGaAFQ540yEj7c1dxrcKwMDcbDvQqj1oGowQZxvJQ4%2FdUrmq7pQNSbA%2BrEiUIzqgmtxGssWt7zbROGdDwhE%2B98yct0HJ0t7i%2BkVNw%2F0i0kaId9cJbZPf8frLz5XhT4RLX27QBOgRt9pMURgC2%2BaUl5EENKq8fSbUg%3D%3D"
        },
        {
          "title": "Alakazam 1/102 Holo Rare Unlimited Edition Base Set Pokemon Card 1999 WOTC MP!!",
          "total_ask_price": 37.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/267396682468?_skw=Pokemon+%22Alakazam%22+1&hash=item3e421592e4:g:4d0AAeSwCoRpze52"
        },
        {
          "title": "Alakazam Holo Rare 1/102 Base Set Pokemon",
          "total_ask_price": 44.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/376355016629?_skw=Pokemon+%22Alakazam%22+1&hash=item57a081cfb5:g:r6sAAeSwnYVoVds8&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZufcylHBlJ0PEzI%2BY%2F5t3mJwaLHxL7z9LhbB1PMrWnvL26dVfHsCGiUylX%2BTNdmX7bYndYZhayv1J93u3LnIHQX6YehR3ecEp1jx%2BQmhWOpGwfi58uScAqQOBmQnRzOA1PYP%2BLM%2F7jQrNkRMKmXFPzciglDRQkhvO%2Be3jeurwRuviPHM1grprpIR5yp3b2EqM3qJGoZJ%2BfWglFeARlUjiwlEbmpYp8CD2%2Bje15g%2B8Y%2FxoRbh37w5L7%2BU759Kv%2FsuXONfIbn0T3%2B%2FtO9JG76XJqDZQty7X1QysdGWtcBctLgw%3D%3D"
        },
        {
          "title": "Pokemon 1999 Base Set Alakazam 1/102 Holo Rare Unlimited 80 HP EN",
          "total_ask_price": 45,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318446049663?_skw=Pokemon+%22Alakazam%22+1&hash=item4a24dd197f:g:V7YAAeSw9fxqLBh0&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGY%2FUED%2Fb82lBa38NaXzOH42WZ6EQgoujTzO0Ux5VPVGmyrqMI9yu1hMthrOzZEUSaoMr3LB2bIo2gGxvExxjqMlsPtv60NIoIAlMaYG6CM3iGKhDzgAWHnh2QFD6NuVQppJ6u2529gnQ3NdzrneUxu786Impznr3pnnGJS2jWOiwKvmR6brP8HTpK37HP6inGzhNWk0nuqOmU1U5U3YF3bCwH9Oe%2FUw%2BNI5a%2BsCiTpc82WLqsxMywwWRjdFp57x12cSU%2F%2BmUg11Ff2HUeQyv%2B5q7fQf%2BCSp9VsVGMmBi9ZG6Q%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon TCG Base Set 1st Edition Alakazam LP Thick Stamp",
          "total_ask_price": 1159.99,
          "url": "https://www.ebay.com/itm/178228735988?_skw=Pokemon+%22Alakazam%22+%22Base+Set+1st+Edition%22+%221%22&hash=item297f42aff4:g:HcwAAeSw4BZqMcvD"
        },
        {
          "title": "Pok├⌐mon Card Pokemon Base set 1st Edition HOLO ALAKAZAM 1/102 English",
          "total_ask_price": 2000,
          "url": "https://www.ebay.com/itm/188095834242?_skw=Pokemon+%22Alakazam%22+%22Base+Set+1st+Edition%22+%221%22&hash=item2bcb62a882:g:nxAAAeSwlwNpnng-"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-1-SHADOWLESS",
      "card_print_id": "3fc82fab-b103-4336-a795-670d01985242",
      "evidence_class": "raw_single",
      "listing_count": 31,
      "seller_count": 28,
      "median_active_ask": 80.99,
      "minimum_active_ask": 7.99,
      "maximum_active_ask": 369.99,
      "strict_sample_count": 25,
      "strict_pass_count": 10,
      "strict_pass_ratio": 0.4,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 4,
        "shadowless_lane_missing_title_token": 15,
        "base_lane_has_base_set_2_noise": 2
      },
      "sample_failures": [
        {
          "title": "Pokemon Alakazam Holo Art Rare m1S: Mega Symphonia 071/063 NM",
          "total_ask_price": 7.99,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/298379304945?_skw=Pokemon+%22Alakazam%22+1&hash=item4578cadff1:g:13UAAeSw-UlqH3fB"
        },
        {
          "title": "Pokemon TCG Alakazam 1/130 Base Set 2 Holo Rare Unlimited 2000 Very good Cond.",
          "total_ask_price": 31.99,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/298394152422?_skw=Pokemon+%22Alakazam%22+1&hash=item4579ad6de6:g:dZgAAeSwjERqJdi-&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYGr4OYK1RN%2BySKY4bUr8AMV7idr9QDI9uit%2BUv5hiWa5PKHTwFoFZR3LwKXyfuuIHamQzrcZYVE5k5fNntqbsHK8PsvGiQrWNT4D8pof2NTBsLVB%2FjxYBtqPPbZLa1PhKgxPqg4J1fCJaJOocvzeDKKNTBopDY5YJxm1L466aVmw9khygwo3uAjjMk48x7rLsN1IS0NacZ7%2BR18AhVBs%2Bt19qhMjLTpdbxQwbcySXBcIhnyHpUqCyAspxkmFRRfnLOIRkZB9%2Fgi6i7aSrcJidDwEkf3QmurLlEZ1L2uxcAfQ%3D%3D"
        },
        {
          "title": "Pokemon TCG Alakazam 1/102 Base Set Holo Rare English 80 HP Stage 2 Ken Sugimori",
          "total_ask_price": 32,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/800045522361?_skw=Pokemon+%22Alakazam%22+1&hash=itemba466dddb9:g:xUEAAeSwa2BqDQSY&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbrjarPBHpTSARV%2Bv9kgfPLxtjk310Mki83zH5vbXYGQ1kt2mLzhIrsOB%2FKFeqjcXHGPTmNjew5tnNKbWO846AwV1k0II7ubVTFYBVzt3lcZWfuNKWFTGrkC0oB3udSstJSHOwm3q280owwicwxsDhuLy59KyKVQKV44vgH%2BqT7YSYwJiljvMuK9nZjWnG7aAG9VVkwhZA8ENu%2BN2PghTolQlPAcxKUzBE0C6Gz2tD%2BlWUXdJGe6w3alcguVVn0a80hlfiPUgBI6Xe6fStTsEn1vj%2FlHLBVuhtUHRp9Ft5kqg%3D%3D"
        },
        {
          "title": "Alakazam #1/102 Base Set MP Pokemon Card",
          "total_ask_price": 40,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147235652720?_skw=Pokemon+%22Alakazam%22+1&hash=item2247edc470:g:VbAAAeSwK6JpzWSI"
        },
        {
          "title": "Alakazam - 1/130 Base Set 2 Holo Rare SWIRL Pokemon - LP",
          "total_ask_price": 44.980000000000004,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/116975114844?_skw=Pokemon+%22Alakazam%22+1&hash=item1b3c429a5c:g:7k8AAeSwocVpYDSa"
        }
      ],
      "sample_passes": [
        {
          "title": "Alakazam #1 / 102 Base Set SHADOWLESS Holo - LP - Pokemon 1999 TCG WOTC Vintage",
          "total_ask_price": 80,
          "url": "https://www.ebay.com/itm/406655063832?_skw=Pokemon+%22Alakazam%22+%22Base+Set+Shadowless%22+%221%22&hash=item5eae87d718:g:oxwAAeSwOpVpfZjt"
        },
        {
          "title": "Alakazam 1/102 Holo Holo Rare Base Set Shadowless Pokemon Holo HP",
          "total_ask_price": 80.99,
          "url": "https://www.ebay.com/itm/158011343664?_skw=Pokemon+%22Alakazam%22+%22Base+Set+Shadowless%22+%221%22&hash=item24ca35c330:g:8qcAAeSw8ShqNSuO"
        },
        {
          "title": "Alakazam 1/102 Base Set Shadowless Holo Rare Holo POKEMON",
          "total_ask_price": 99,
          "url": "https://www.ebay.com/itm/236885358613?_skw=Pokemon+%22Alakazam%22+%22Base+Set+Shadowless%22+%221%22&hash=item372777b815:g:ZeIAAeSwwHJqLW5A"
        },
        {
          "title": "1999 POKEMON BASE SET SHADOWLESS HOLO ALAKAZAM 1/102 HP",
          "total_ask_price": 99.05,
          "url": "https://www.ebay.com/itm/236880755711?_skw=Pokemon+%22Alakazam%22+%22Base+Set+Shadowless%22+%221%22&hash=item3727317bff:g:8zQAAeSwZjlqMXlx"
        },
        {
          "title": "ALAKAZAM - 1/102 - Base Set SHADOWLESS - Holo - Pokemon Card - MP",
          "total_ask_price": 119.95,
          "url": "https://www.ebay.com/itm/365569188026?_skw=Pokemon+%22Alakazam%22+%22Base+Set+Shadowless%22+%221%22&hash=item551d9f20ba:g:w5AAAOSw-TZoEA1u"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-10-1999-2000",
      "card_print_id": "4e4df92f-ffd6-4f83-85c4-3ee81a6b8e96",
      "evidence_class": "raw_single",
      "listing_count": 24,
      "seller_count": 21,
      "median_active_ask": 29.97,
      "minimum_active_ask": 3.79,
      "maximum_active_ask": 619.99,
      "strict_sample_count": 24,
      "strict_pass_count": 1,
      "strict_pass_ratio": 0.042,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 3,
        "1999_2000_lane_missing_title_token": 23,
        "base_lane_has_base_set_2_noise": 4
      },
      "sample_failures": [
        {
          "title": "Mewtwo V Holo S10B Pokemon GO 030/071 Pokemon Card NM",
          "total_ask_price": 3.79,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137439811334?_skw=Pokemon+%22Mewtwo%22+10&hash=item20000d1706:g:n-oAAeSwhhBqOECN"
        },
        {
          "title": "Mewtwo V - Holo Double Rare #030/071 S10b: Pokemon GO 2022 NM",
          "total_ask_price": 4.49,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178201416113?_skw=Pokemon+%22Mewtwo%22+10&hash=item297da1d1b1:g:Ew0AAeSwE1lqJaFB"
        },
        {
          "title": "Pokemon Mewtwo 10/130 Base Set 2 Holo DMG Vintage Pok├⌐mon Card",
          "total_ask_price": 14.99,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318464827491?_skw=Pokemon+%22Mewtwo%22+10&hash=item4a25fba063:g:p34AAeSwwsJqMaCM"
        },
        {
          "title": "Mewtwo 10/102 Holo Holo Rare Base Set Unlimited Pokemon Damaged",
          "total_ask_price": 19.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287384575942?_skw=Pokemon+%22Mewtwo%22+10&hash=item42e9749fc6:g:AXQAAeSwipNqKGAS"
        },
        {
          "title": "Pokemon TCG Mewtwo 10/102 Base Set Holo Rare Unlimited EN 1999 HP/MP",
          "total_ask_price": 19.99,
          "reasons": [
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/407018374024?_skw=Pokemon+%22Mewtwo%22+10&hash=item5ec42f8388:g:DaAAAeSwFcFqOKKP"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon Card - Mewtwo 10/102 Holo 4th Print 1999-2000 Base Set Rare LP",
          "total_ask_price": 149.99,
          "url": "https://www.ebay.com/itm/188165423484?_skw=Pokemon+%22Mewtwo%22+10&hash=item2bcf88817c:g:KmcAAeSwlD9ptt1p"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-11-FIRST-EDITION",
      "card_print_id": "71fc0402-a798-4b39-b148-d1fc2e516c5a",
      "evidence_class": "raw_single",
      "listing_count": 22,
      "seller_count": 20,
      "median_active_ask": 36.19,
      "minimum_active_ask": 17.99,
      "maximum_active_ask": 880.99,
      "strict_sample_count": 22,
      "strict_pass_count": 2,
      "strict_pass_ratio": 0.091,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "first_edition_lane_missing_title_token": 20,
        "base_lane_has_base_set_2_noise": 3,
        "base_lane_missing_base_set": 2
      },
      "sample_failures": [
        {
          "title": "Nidoking 11/102 Pokemon TCG Base Set Unlimited Holo Rare MP",
          "total_ask_price": 17.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/205685041234?_skw=Pokemon+%22Nidoking%22+11&hash=item2fe3c8a852:g:D6YAAeSwcZ5op~WY&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGY2lpYKX7S1hJ6HzqCxLpzpQxcryuLjC38He0%2Fcs9G%2FYqSL5BTHiNXeVRB4GL2eYkvA8dagKhbukiU4Kknx69ssLhK9FF030vld%2FDnqa2QBshCrPNYlB5dbYU60Fkk8pUYypa4HErnxDmB3WO2d6VGQLvdt2mnBy1%2FaTBENvw6BvkpNdxoahh8zC6qcXSKSESQJrmfdsIuxEh0Cj%2Ft0nAtnjaGFGbJSbEB%2F1yVemkphcw8wIVXrZW%2Bv8hM%2Bh%2B3MW2zA5%2BnM%2BUwczvmkt%2BuqK%2Fh2tiwo42sNliOtygipdz%2BhpA%3D%3D"
        },
        {
          "title": "Pokemon Nidoking 11/102 Holo Rare Base Set ",
          "total_ask_price": 19,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318021832089?_skw=Pokemon+%22Nidoking%22+11&hash=item4a0b940d99:g:iGEAAeSwX1ZpuixD"
        },
        {
          "title": "Nidoking  11/102 Base Set HOLO Rare Card Unlimited WOTC Pokemon TCG Vintgage",
          "total_ask_price": 20,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/198129106952?_skw=Pokemon+%22Nidoking%22+11&hash=item2e216a4008:g:z9gAAeSwKBBpm5VS&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ1rcUgbTZDkwbuR7JmALWCHoNjQO8l7pWpYYuhSLzBx5BvBFf4%2B%2BWc49DJUXqyDncJQh32INPnH28jeXiCxCYrdUYsxSEPQj15ffBxIaZxDKra%2FjmZzprmVcqsz1eMyMw5FSGAmTUQVH0yC0f00qyrN2X6yMswbVhH5tmVA4E97LzBvc1pUbpGEx98f%2Bg5kj1ZITX4QcPyX3PgnnXPLIkwUNyGNwL2qadhb3rMthq1bq2nDs02u2qSKOZD2ejgMhzy%2FWe13TK0SA379ZleD5vX75WR1Tbe7Isw%2ByH52PZlYA%3D%3D"
        },
        {
          "title": "Pokemon Card | Nidoking 11/102 Holo Rare Vintage WOTC Base Set 1999 Unlimited MP",
          "total_ask_price": 20.74,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/327228974122?_skw=Pokemon+%22Nidoking%22+11&hash=item4c305de42a:g:T88AAeSw8ohqBTnz"
        },
        {
          "title": "Nidoking 11/102 Pokemon Card - Holo Base Set 1999 Rare LP",
          "total_ask_price": 24.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/306537143462?_skw=Pokemon+%22Nidoking%22+11&hash=item475f099ca6:g:ZIYAAeSwF-xo5cal"
        }
      ],
      "sample_passes": [
        {
          "title": "Nidoking 11/102┬á Base set 1st edition Pokemon 1995 Rare Holo FREE UK DELIVERY",
          "total_ask_price": 46.08,
          "url": "https://www.ebay.com/itm/235723901852?_skw=Pokemon+%22Nidoking%22+%22Base+Set+1st+Edition%22+%2211%22&hash=item36e23d4b9c:g:UWIAAOSwrstm1FVO"
        },
        {
          "title": "Pokemon Nidoking Base Set 1st Edition Holo Rare #11 MP-HP 11/102",
          "total_ask_price": 249.99,
          "url": "https://www.ebay.com/itm/388603804129?_skw=Pokemon+%22Nidoking%22+%22Base+Set+1st+Edition%22+%2211%22&hash=item5a7a9779e1:g:IPoAAOSwZORoUxj4"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-12-SHADOWLESS",
      "card_print_id": "3fa6dd84-6c0d-4588-8a69-09e5928a40b2",
      "evidence_class": "raw_single",
      "listing_count": 52,
      "seller_count": 44,
      "median_active_ask": 41.5,
      "minimum_active_ask": 2.49,
      "maximum_active_ask": 351.24,
      "strict_sample_count": 25,
      "strict_pass_count": 8,
      "strict_pass_ratio": 0.32,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 2,
        "shadowless_lane_missing_title_token": 16
      },
      "sample_failures": [
        {
          "title": "Ninetales 018/195 Uncommon SWSH12: Silver Tempest LP Pokemon Card",
          "total_ask_price": 2.49,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/406993693851?_skw=Pokemon+%22Ninetales%22+12&hash=item5ec2b6ec9b:g:z4oAAeSwHJ5qKxEG"
        },
        {
          "title": "Wizards of the Coast Pokemon TCG Base Set Ninetales 12/102 Holo Rare Unlimited",
          "total_ask_price": 8,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137427663901?_skw=Pokemon+%22Ninetales%22+12&hash=item1fff53bc1d:g:WGcAAeSwvBFqM0WP"
        },
        {
          "title": "Ninetales 12/102 - Base Set - Pokemon Card C",
          "total_ask_price": 11,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/257582987889?_skw=Pokemon+%22Ninetales%22+12&hash=item3bf9247a71:g:oVUAAeSwS95qOgvf"
        },
        {
          "title": "Ninetales 12/102 Holo Holo Rare Base Set Unlimited Pokemon TCG",
          "total_ask_price": 11.95,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147381170701?_skw=Pokemon+%22Ninetales%22+12&hash=item22509a320d:g:JEUAAeSwY5FqMqbL"
        },
        {
          "title": "Ninetales #12 - Rare HOLO -  Pokemon Base Set WOTC - MP",
          "total_ask_price": 14.49,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287411616361?_skw=Pokemon+%22Ninetales%22+12&hash=item42eb113a69:g:3tMAAeSwK4JqJaOA"
        }
      ],
      "sample_passes": [
        {
          "title": "Ninetales 12/102 Unlimited Holo Base Set Shadowless Pokemon English",
          "total_ask_price": 13.4,
          "url": "https://www.ebay.com/itm/377185012108?_skw=Pokemon+%22Ninetales%22+%22Base+Set+Shadowless%22+%2212%22&hash=item57d1fa898c:g:2PgAAeSwSdhqBBKd"
        },
        {
          "title": "Ninetales 12/102 Holo Rare Base Set Shadowless Pokemon",
          "total_ask_price": 26.58,
          "url": "https://www.ebay.com/itm/278055229896?_skw=Pokemon+%22Ninetales%22+%22Base+Set+Shadowless%22+%2212%22&hash=item40bd6219c8:g:29oAAeSwK6xqIdsb"
        },
        {
          "title": "Pokemon Card - Ninetales Base Set (Shadowless) 12/102 Holo Rare",
          "total_ask_price": 29.99,
          "url": "https://www.ebay.com/itm/177113476962?_skw=Pokemon+%22Ninetales%22+%22Base+Set+Shadowless%22+%2212%22&hash=item293cc92f62:g:TV0AAeSwMX5oLmeY&amdata=enc%3AAQALAAABEACCtXRWQnOEpyOqnQQ8KGZ1r0JmHbDenLMaKM%2FLt67Vy%2FEP36sx8bv4ZLVgwAfDuAgLEFYBwHDWlkZkaEwrjzzaQHj1UqJQutMCS%2BWEFaMbzXvmV%2FJgU163uooRDmCSJSwKQNItXtl61wRFIb%2Fp7%2F2wUONODfiL5pkphL1%2FEenlUmPwu%2FE94E8t%2BgcHsSOByH9q7%2FTvWh3U7ba92xFbCO75Q6DIxJrQcJENcs9LTk0J33JeGhkbhFEXbIzSxdgxHSn5nVeL2lqlBeFcF%2BeAPV0NxbDoQsorVJZsaO%2FJ6nOodXkp6AV5Mh5o8xfCaMBRMKFdTArjhp5sozm971vAnwrL3ZEwtR8YRbhewtZnM87x"
        },
        {
          "title": "Pokemon TCG 99 Ninetales Base Set Shadowless Holo Rare #12/102 MP",
          "total_ask_price": 30,
          "url": "https://www.ebay.com/itm/286894012120?_skw=Pokemon+%22Ninetales%22+%22Base+Set+Shadowless%22+%2212%22&hash=item42cc3736d8:g:W6oAAeSwuTto-l1T"
        },
        {
          "title": "Ninetales 12/102 Holo Rare Base Set Shadowless Pokemon Card 1999 Black Flame",
          "total_ask_price": 35,
          "url": "https://www.ebay.com/itm/377187598845?_skw=Pokemon+%22Ninetales%22+%22Base+Set+Shadowless%22+%2212%22&hash=item57d22201fd:g:oTsAAeSwNylqB9HW"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-14-FIRST-EDITION",
      "card_print_id": "841fcdb3-e79c-4df8-a0f3-617ba41bc3f0",
      "evidence_class": "raw_single",
      "listing_count": 10,
      "seller_count": 10,
      "median_active_ask": 43,
      "minimum_active_ask": 35,
      "maximum_active_ask": 684,
      "strict_sample_count": 10,
      "strict_pass_count": 2,
      "strict_pass_ratio": 0.2,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 7,
        "first_edition_lane_missing_title_token": 7
      },
      "sample_failures": [
        {
          "title": "Pokemon Raichu 14/62 Holo Rare Fossil Pokemon Moderately Played A",
          "total_ask_price": 35,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/336607221697?_skw=Pokemon+%22Raichu%22+14&hash=item4e5f5a97c1:g:aTMAAeSw3tZqGG5W"
        },
        {
          "title": "Raichu 14/62 Unlimited Holo Pokemon Unlimited Holo LP Fossil",
          "total_ask_price": 35.79,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168480708713?_skw=Pokemon+%22Raichu%22+14&hash=item273a3b9869:g:dYcAAeSw10tqOLMr&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZg%2FFpwcE6sinV444aIwsDhC7EyW8Boz3Ihfudvvr9EBAaB4LXGgdoek02GjyF9bdlURztiSQRtMo6n8I8qAtvOZRrdccEa76lxt%2BASEnXgHtxAhzTtrrWcjKgqyOT1c7mizgyX2zRgbn3vf5uthziWVQs3HSa976opmhlQHll1HDCkl65C3MuTRW41z9FLOtpDFOjEOyBx639j9uNlEz31eRZH3IaxnuAi2ebawlp1Z8i8z0RPGqZmG47%2FrVw%2B40qUcswM%2FtfdqhjAem1Ykug74ZVtDDYUZAuVlfYUeiRdaQ%3D%3D"
        },
        {
          "title": "Raichu 14/62 Pokemon TCG Fossil Holo Foil Rare Card Lightly Played LP",
          "total_ask_price": 37.980000000000004,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/327189835364?_skw=Pokemon+%22Raichu%22+14&hash=item4c2e08ae64:g:SCAAAeSw-BlqHZ-j&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ0sc4NXYqaH70Z22N8lkay9RedUTJZ4uospHI%2BlavliG0T6%2Fy1mdy7W2x2BFjI2zaE6lVs1xhrczmA%2Bf7MpFQIL6mlr%2BumJCV9llcjs5Br3Ad3irFSY9CN6iwWMvcZFjAvuzYppax4%2Fx6t6rDbmykhYA3c2vHDsHCEIQGgD7Hvi%2BKT%2BqhPptPaUpxf%2FMlsNs6A9R39ANPbdoh9YoTU9DQbHCAMF3Qh6mcnsFdG4L68vErrEqeVaEhc9oiAIgF6JbySGW5vaQ7LkdnZPKLZJZfsCVqBzJdUfjG4sBs%2FiW4svA%3D%3D"
        },
        {
          "title": "1999 Pokemon Fossil #14 Raichu Holo LP-NM",
          "total_ask_price": 40,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178246486523?_skw=Pokemon+%22Raichu%22+14&hash=item29805189fb:g:NFcAAeSwHk1qOKH1&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGaGDRBRxBYnuM4fRsN9aVZ%2BF%2Bxwys1gSMWY3UNHN8ldkjnyXjhJ3IGIcy5zjp3%2BvPkrJlrMiawiUVaqsyGI6LYSGM2taxCRgdtIUvAmXl7Dz3XmqpwoF%2Bz%2FELr9K6AuDyu3qw9xjL0cOFfgefqdMPsWi7BdQ8XFPFMPlD1iJwddusN1CzQzmE%2FVw7K3pGps5dA20xJ6B5Nsi2YSk897BvXJl4zGaDYJdjWJg7cFO90y%2Fd%2F70N6YlwjGLvvyQJrO0bYvQ5AAItlV5lJFYhtV5x6ViiDsgmEpamcW00AYxojVvA%3D%3D"
        },
        {
          "title": "Raichu 14/62 Fossil Holo Rare Vintage Pokemon TCG WOTC",
          "total_ask_price": 40,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/358654122257?_skw=Pokemon+%22Raichu%22+14&hash=item5381739911:g:2zAAAeSw2PhqJtL0&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZTNBCovxUMUHl7LRly5nnViQLW3voBAuRmsqiJ8LyBXRk3UniexIHAx0DIFSh1VlLND6dRvCo3c%2FyJkVazZR0PES0NYMTjnj2oy7QilS%2BGOsZax6w93s9edSIGQRkxqpPxhCCfngGtdOr0bNbIUZwrVjomg7aui2Mxto4JflNbudw%2FiwcRyRP16CSjAps%2FeHqZq4c17X7QaoQJMnHV93VwtPNqFdAgFgJOVG1u4WZXVJLOQHaRRHZyD1sP3mLjOjm0jHABdzjYu6PZ8n4HUXtn8IyOzav8qCi5LsqKNRZkSg%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "POKEMON Raichu 14/102 Base Set 1st Edition Holo FR Good",
          "total_ask_price": 347.55,
          "url": "https://www.ebay.com/itm/318068505544?_skw=Pokemon+%22Raichu%22+%22Base+Set+1st+Edition%22+%2214%22&hash=item4a0e5c3bc8:g:PVsAAeSwdHppjlX7"
        },
        {
          "title": "Raichu 14/102 Base Set 1st Edition Shadowless Holo 1999 Pokemon Card",
          "total_ask_price": 684,
          "url": "https://www.ebay.com/itm/327187549421?_skw=Pokemon+%22Raichu%22+%22Base+Set+1st+Edition%22+%2214%22&hash=item4c2de5cced:g:680AAeSwqvNqHArf"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-14-SHADOWLESS",
      "card_print_id": "d655b844-7d36-4b8e-b5b0-7ab148f34021",
      "evidence_class": "raw_single",
      "listing_count": 23,
      "seller_count": 22,
      "median_active_ask": 99.05,
      "minimum_active_ask": 19.99,
      "maximum_active_ask": 1400,
      "strict_sample_count": 23,
      "strict_pass_count": 12,
      "strict_pass_ratio": 0.522,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 10,
        "shadowless_lane_missing_title_token": 11
      },
      "sample_failures": [
        {
          "title": "Raichu 14/62 Unlimited Holo Rare Fossil Pokemon English MP",
          "total_ask_price": 19.99,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/188555808777?_skw=Pokemon+%22Raichu%22+14&hash=item2be6cd5009:g:PZQAAeSwH5NqPCBj"
        },
        {
          "title": "Raichu 14/62 Fossil Holo Pokemon TCG",
          "total_ask_price": 32.99,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/398056277221?_skw=Pokemon+%22Raichu%22+14&hash=item5cae00c4e5:g:0CgAAeSwQMRqK-qO"
        },
        {
          "title": "Raichu 14/62 Unlimited Holo Pokemon Unlimited Holo LP Fossil",
          "total_ask_price": 35.79,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168480708713?_skw=Pokemon+%22Raichu%22+14&hash=item273a3b9869:g:dYcAAeSw10tqOLMr"
        },
        {
          "title": "Raichu 14/62 Pokemon TCG Fossil Holo Foil Rare Card Lightly Played LP",
          "total_ask_price": 37.980000000000004,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/327189835364?_skw=Pokemon+%22Raichu%22+14&hash=item4c2e08ae64:g:SCAAAeSw-BlqHZ-j&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ0sc4NXYqaH70Z22N8lkay9RedUTJZ4uospHI%2BlavliG0T6%2Fy1mdy7W2x2BFjI2zaE6lVs1xhrczmA%2Bf7MpFQIL6mlr%2BumJCV9llcjs5Br3Ad3irFSY9CN6iwWMvcZFjD7ypoN5DtlUcX5ersjM7jVJC%2BTkaF1iZFTTpviX7F%2Fdc7wBt4z9VUIIs0iqkLEBvgJ%2FdgUTR2MFp3raXXRjooAK%2Fq7toBEktdL8PqeKaRP7Gr6Og1tPB%2Byg1hS2G75uXLvusxC%2Bu05Kh08Gd8plYIxOJCyCQ8kdIoxodM%2FA92NOQ%3D%3D"
        },
        {
          "title": "Pokemon Card - Raichu Fossil 14/62 Holo Rare",
          "total_ask_price": 39.99,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/327224171520?_skw=Pokemon+%22Raichu%22+14&hash=item4c30149c00:g:tlgAAeSwiRFqNy0W"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon Cards Base Set Shadowless 14 Raichu Holo Rare Wizards Of The Coast HP",
          "total_ask_price": 42.86,
          "url": "https://www.ebay.com/itm/146558885290?_skw=Pokemon+%22Raichu%22+%22Base+Set+Shadowless%22+%2214%22&hash=item221f971daa:g:zjkAAOSwKgRoFiWv"
        },
        {
          "title": "1999 Pokemon, Base Set Shadowless, #14/102 Raichu, Holo Rare",
          "total_ask_price": 60.480000000000004,
          "url": "https://www.ebay.com/itm/315025015203?_skw=Pokemon+%22Raichu%22+%22Base+Set+Shadowless%22+%2214%22&hash=item4958f441a3:g:uC8AAOSw9ORlbi3X"
        },
        {
          "title": "1999 POKEMON BASE SET SHADOWLESS HOLO RAICHU 14/102 HP",
          "total_ask_price": 99.05,
          "url": "https://www.ebay.com/itm/336642362940?_skw=Pokemon+%22Raichu%22+%22Base+Set+Shadowless%22+%2214%22&hash=item4e6172ce3c:g:hggAAeSwXMpqMXmw"
        },
        {
          "title": "Raichu - 14/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC HP",
          "total_ask_price": 133.65,
          "url": "https://www.ebay.com/itm/198367794874?_skw=Pokemon+%22Raichu%22+%22Base+Set+Shadowless%22+%2214%22&hash=item2e2fa456ba:g:dp4AAeSwKOdqDVwr&amdata=enc%3AAQALAAABEACCtXRWQnOEpyOqnQQ8KGZYAXy0kLHYJPVpd%2FMJHCD9kR0hzg9jDGDpyqz11rnsYZ4sf3gLUzXyT9hCleuOcvGjN0b7sismmW8e5yPwjOs7PLGdVh%2FjUNGRR9Jplc0AeA6dBp%2BN9K%2BdSBBcVqVgh%2BCqRhqoY2U1InZ6A9O66yMNbSbGxf%2FMaIGe996qFIfR4s28EeCr2p96hYHNtVcRReZeK6bfUOsBj%2FQ%2BeaZu69jTMeY2kGUB2dQGUXFVKxzbs8W9%2FrGj9rqlOgCKFR9IKwQ7ujeky6fqLbI%2Bgep47Gk0UpoELcQ3Us6gMOg%2BnOivxxs6wEf9HSmsAq2dpBaWEhxn%2BkX5u8bTNIS8TX%2BvlHCI"
        },
        {
          "title": "Pokemon Base Set SHADOWLESS Holo Raichu 14/102 LP Ink Error? See Description!",
          "total_ask_price": 149.99,
          "url": "https://www.ebay.com/itm/227391773603?_skw=Pokemon+%22Raichu%22+%22Base+Set+Shadowless%22+%2214%22&hash=item34f19b1ba3:g:MrcAAeSw1fdqMbxF"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-15-1999-2000",
      "card_print_id": "176db31a-ccac-4636-8bf8-a4ce81a08662",
      "evidence_class": "raw_single",
      "listing_count": 64,
      "seller_count": 62,
      "median_active_ask": 90.29,
      "minimum_active_ask": 13.21,
      "maximum_active_ask": 1750,
      "strict_sample_count": 25,
      "strict_pass_count": 1,
      "strict_pass_ratio": 0.04,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 10,
        "1999_2000_lane_missing_title_token": 24
      },
      "sample_failures": [
        {
          "title": "Pokemon 2021 Celebrations Venusaur #15/102",
          "total_ask_price": 13.21,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147395929281?_skw=Pokemon+%22Venusaur%22+15&hash=item22517b64c1:g:clQAAeSwGFlqPDs5"
        },
        {
          "title": "Pokemon 2021 Celebrations Venusaur #15/102",
          "total_ask_price": 13.21,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147395929319?_skw=Pokemon+%22Venusaur%22+15&hash=item22517b64e7:g:2OoAAeSwHQVqPDu2"
        },
        {
          "title": "2021 Pokemon SWSH Celebrations Venusaur Classic #15/102",
          "total_ask_price": 13.99,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/157879867191?_skw=Pokemon+%22Venusaur%22+15&hash=item24c25f9737:g:NzEAAeSwph5p9qMZ"
        },
        {
          "title": "1x Venusaur - 15/102 - Holo Rare NM-Mint Pokemon SWSH7.5 - Celebrations",
          "total_ask_price": 14.49,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318504414036?_skw=Pokemon+%22Venusaur%22+15&hash=item4a2857ab54:g:JyUAAeSwK3ZqPZXs"
        },
        {
          "title": "Venusaur - #15 - Pokemon Celebrations - NM",
          "total_ask_price": 18.1,
          "reasons": [
            "base_lane_missing_base_set",
            "1999_2000_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/398089027292?_skw=Pokemon+%22Venusaur%22+15&hash=item5caff47edc:g:MiwAAeSw6MZqNz9L"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon Venusaur Base Set 15/102 Holo 1999-2000 Damaged",
          "total_ask_price": 79.67,
          "url": "https://www.ebay.com/itm/407019878528?_skw=Pokemon+%22Venusaur%22+15&hash=item5ec4467880:g:TU4AAeSwrkdqOWWL&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbdilIx0JF3mvbx0VLwDawvaW4ZRHq%2F9FwAz2fod5Jb3KjCeJiaa98HSyx%2Fv9rcdxt7VfVydI2SvaoB%2FuCjJNqQ8HYRBgkLNKK98c%2B2GM35cMrJQiNj988rHyu5c51KwzE9xm2MeScEhGcRBQFu5%2B9WD1yfRmGV7dpUeMXqXGW1OyPrnW4HB8OunKOLFfWTpqCRu%2FKyqF6uo2vR9wjOvDZsDXH3%2BdC0fmq%2BgbnmxCM5pIimv9jXxL3Y8f8%2BoNs92WBjb235NTN20xSp8%2BEvg1TVGjC51bg1tuScK3bByxR3kw%3D%3D"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-15-FIRST-EDITION",
      "card_print_id": "24aa883d-f857-4965-a823-33ba744aada7",
      "evidence_class": "raw_single",
      "listing_count": 13,
      "seller_count": 13,
      "median_active_ask": 109.99,
      "minimum_active_ask": 18.41,
      "maximum_active_ask": 1750,
      "strict_sample_count": 13,
      "strict_pass_count": 1,
      "strict_pass_ratio": 0.077,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 6,
        "first_edition_lane_missing_title_token": 12
      },
      "sample_failures": [
        {
          "title": "Excellent pokemon venusaur 15 Celebrations",
          "total_ask_price": 18.41,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/117210468497?_skw=Pokemon+%22Venusaur%22+15&hash=item1b4a49d091:g:g5oAAeSwaZBqESsJ"
        },
        {
          "title": "Venusaur 15/102 Celebrations 25th Holo-Foil Rare Pokemon TCG  Card- English",
          "total_ask_price": 19.03,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/307021554856?_skw=Pokemon+%22Venusaur%22+15&hash=item477be924a8:g:TmgAAeSwBP1qOvCU&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbIWVNkU49BtPY8H3tKnS8eyMNwBCw9EJoP7l9k7xCmgIMa4Nvllxy1K8BEfVaZwFwFRyomVm2yGRTXmezpAQtuaqe1rh5063z053E81tLVEwkqt8aspKg%2F3LX4%2FIfnCS5rqH6VxxLFt7ZfGlJFodcBLZYRdvDZPzLhu4P6ArTOvZRowJAZcrneBgbBwQf4yp2fV9VbXLTOneTwTdE8QQK66jGrh4tZ9NkYFxuEX%2BkRqSSBhj3K3VNgXP9QWloF%2F3aErNasBFVuI7DX4BPGFLpkTDDC%2F1liGpNNMCoH%2Bvby6w%3D%3D"
        },
        {
          "title": "Pokemon Venusaur Base Set 15/102 Holo 1999-2000 Damaged",
          "total_ask_price": 79.67,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/407019878528?_skw=Pokemon+%22Venusaur%22+15&hash=item5ec4467880:g:TU4AAeSwrkdqOWWL&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbdilIx0JF3mvbx0VLwDawvaW4ZRHq%2F9FwAz2fod5Jb3KjCeJiaa98HSyx%2Fv9rcdxt7VfVydI2SvaoB%2FuCjJNqQ8HYRBgkLNKK98c%2B2GM35cMrJQiNj988rHyu5c51KwzEHvYb%2F42IlIyv3w5eHN%2FGh0eoI00k6mVvmsOx4nW0wXdYhslufKiaq2lzEBIEfq1bzpfFC7zV%2FE2QTiL0SH8wdf8K5MowRADKeL9WG0RBoWY4nrxz0XmMImvRzIVMps%2FmLMGTUXgklqTWxhliHz--i2OLUk8I8ER0S1%2BE6UeHrIA%3D%3D"
        },
        {
          "title": "Pokemon Venusaur Holo Base Set 15/102 1999 Wizards LP condition. ",
          "total_ask_price": 83,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/205347795395?_skw=Pokemon+%22Venusaur%22+15&hash=item2fcfaeb1c3:g:fWcAAOSwuWxn0SrU"
        },
        {
          "title": "Venusaur 15/102 Base Set Unlimited HOLO LP/MP WOTC 1999 Pokemon",
          "total_ask_price": 85.86999999999999,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/227310092803?_skw=Pokemon+%22Venusaur%22+15&hash=item34ecbcc203:g:e4cAAeSw0ZJpyUSy"
        }
      ],
      "sample_passes": [
        {
          "title": "Venusaur Base Set 1st Edition 15/102 1995 Holo Pokemon",
          "total_ask_price": 124.45,
          "url": "https://www.ebay.com/itm/306232483375?_skw=Pokemon+%22Venusaur%22+%22Base+Set+1st+Edition%22+%2215%22&hash=item474ce0de2f:g:C0kAAOSwqpBn5sQK"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-16-FIRST-EDITION",
      "card_print_id": "f8eb15b3-5d8f-4f7c-8ca7-b7a8b39861dc",
      "evidence_class": "raw_single",
      "listing_count": 10,
      "seller_count": 10,
      "median_active_ask": 36.12,
      "minimum_active_ask": 20,
      "maximum_active_ask": 1580.16,
      "strict_sample_count": 10,
      "strict_pass_count": 2,
      "strict_pass_ratio": 0.2,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "first_edition_lane_missing_title_token": 8
      },
      "sample_failures": [
        {
          "title": "Zapdos  16/102 Pokemon Base Set Holo Rare English MP/HP",
          "total_ask_price": 20,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/267214626105?_skw=Pokemon+%22Zapdos%22+16&hash=item3e373b9d39:g:GI0AAeSwVSBn9bzG&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGahftjpLDf%2BrvQdO7zY4QVKWrs1yC02hKHWvpurl5smSyyFdRy61dlmPCVDh26JDEyLOMgDO84WPpyJctPyxruhRSfNLxMuR2q4alRsjs%2BuUsrc21HuHMG%2F4NzB%2FoH7T9IrDO9hFncOvoa698z9ls4pwtVt6hQjjWfVi5sY6yyOxEErgZ7R%2F2RtoN9WtD6mjkO7Gr8zChINxe7sKfUuDAUmDPcT%2BY%2BiJJI2NEWhQw1Vk6ig5ZE8pCaU6VgWjmIh--dfTiyYX%2F6N7Z7N9IlZFemHaPnEe67i%2F3MtL94qJ6C%2BXg%3D%3D"
        },
        {
          "title": "Zapdos 16/102 Base Set Pokemon Holo Foil Rare",
          "total_ask_price": 23,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/365712982208?_skw=Pokemon+%22Zapdos%22+16&hash=item55263140c0:g:0EgAAeSw58hoabBd"
        },
        {
          "title": "1999 Pokemon WOTC Zapdos #16 (Holo) - Base Set - MP",
          "total_ask_price": 29.99,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236898214060?_skw=Pokemon+%22Zapdos%22+16&hash=item37283be0ac:g:troAAeSw1fdqPUbI&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYqpb%2BPrubXFedfoDwrVTR97LAt6IkS1zS6JJd42DS5HXqWjhKn%2Fojj6eYi1vou%2BE%2FrL%2BfAr4ILgtmLryR6rlYEP4hr9FVAW4LNlpfs4e8rv8rHw6U9awonVf8USXpgn%2BSi41degWy0gJGUX%2BKx3P4ygUrLaCVJq7qqSDMe7QfLISmMwo9c5BaMm3zQuRkrow2R5nkz5C97GvhQWM51ARdaTAvjdvRlPvI4sIuqnTExPeUEq8YTaIVwi5iM77msjsq9BBjxHiVo8Zq6PhO9yAuZtn1goej28Ce1r5jmwQaWNg%3D%3D"
        },
        {
          "title": "Zapdos 16/102 Base Set Unlimited Holo Rare Pokemon TCG 1999 Pok├⌐mon LP",
          "total_ask_price": 31.61,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/398098158100?_skw=Pokemon+%22Zapdos%22+16&hash=item5cb07fd214:g:Kz4AAeSwh5lp5U5Y&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYEhwmt8hFt1uWwMmjafc0ty1JnTQioErPHHC0tweJrPJD%2BzZInsOg%2FepULuqDcHRCHY2cD2zHv3%2BBlaDhzAzj4XvTPHZ1FvdYpo%2BhlD35tywKzuqV8IGtJxzMu%2F9z%2FuFfgu%2FXMFc%2BeKvWMmrVqcD3tjkM%2FX1hqRWX06pdCufxLTMby6WIG7tCYNbU%2Fm0xSXlgXjMaHAZUfREb09QynA1Nj1IRDPjL9H4zguZWkKG9TgKrlT8ZgtyrXm0xs27L%2FSUkqGlvV7WFZ4a8yGtjbCDgttUxPl8WI0JemfzMeznBj%2Bg%3D%3D"
        },
        {
          "title": "Pokemon Zapdos 16/102 Base Set Holo Rare WOTC Vintage Lightly Played 1999",
          "total_ask_price": 32.24,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/257570612279?_skw=Pokemon+%22Zapdos%22+16&hash=item3bf867a437:g:k0gAAeSwbvhqF4Rr&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZmD2ceV5yPecXrrFEdCD0iPIYHmRQWXwL9e0uTiirsWTe%2FApMmgbompfC99dIkwxJqB%2BrZ7eM7c0GsjQT6ZnN9HLqfg8IuIDTUj7l9qNXZUW%2FulrLrhOm2D%2BjT2BWvSYbJ7BlIZTfGFE2S5NlauKHpwl0wKzps22z3NnzMAnFx8xF9i0Mf9lUWvdWB2Nb7gbWPmZbepe4MxYBDtpaWFdOsV4Wy2bUMiecCHDFFTmB%2BL5k3biaJKhjMxd3Aqth08ccDBszcVi9cvZjBviM25Pe%2F81v5bHmCtaabV768NhhjhQ%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon Base Set 1st Edition Holo Zapdos 16/102 EX Condition Shadowless OG LP",
          "total_ask_price": 421.51,
          "url": "https://www.ebay.com/itm/147279743881?_skw=Pokemon+%22Zapdos%22+%22Base+Set+1st+Edition%22+%2216%22&hash=item224a8e8b89:g:iCUAAeSwMc9p7m6c"
        },
        {
          "title": "1999 Pokemon Base Set 1st Edition Holo Zapdos 16/102",
          "total_ask_price": 1580.16,
          "url": "https://www.ebay.com/itm/134393956532?_skw=Pokemon+%22Zapdos%22+%22Base+Set+1st+Edition%22+%2216%22&hash=item1f4a8108b4:g:NhwAAOSwEORjsfQz"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-16-SHADOWLESS",
      "card_print_id": "4b502c50-4752-43b1-a5a2-9f775f796855",
      "evidence_class": "raw_single",
      "listing_count": 31,
      "seller_count": 30,
      "median_active_ask": 55.99,
      "minimum_active_ask": 20,
      "maximum_active_ask": 688.71,
      "strict_sample_count": 25,
      "strict_pass_count": 12,
      "strict_pass_ratio": 0.48,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 13
      },
      "sample_failures": [
        {
          "title": "Zapdos  16/102 Pokemon Base Set Holo Rare English MP/HP",
          "total_ask_price": 20,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/267214626105?_skw=Pokemon+%22Zapdos%22+16&hash=item3e373b9d39:g:GI0AAeSwVSBn9bzG&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGahftjpLDf%2BrvQdO7zY4QVKWrs1yC02hKHWvpurl5smSyyFdRy61dlmPCVDh26JDEyLOMgDO84WPpyJctPyxruhRSfNLxMuR2q4alRsjs%2BuUsrc21HuHMG%2F4NzB%2FoH7T9KuiO97GW3DqqKG972kTgB0Lij25tKUq6CrsiiagVXil1CRwXRwZsBRQJG2bhUMFvwdrMAGZnRX0JTkYhbtOF9NI7a2d%2FQmF%2BsilD2yiy60dPF8DG5tIg1DkSS2UMQ0tGXBVc3UkKyZHLX0bkdK52I1rVBJLyo739HLEwMjJwN1hQ%3D%3D"
        },
        {
          "title": "Zapdos 16/102 Pokemon DMG Base Set Unlimited",
          "total_ask_price": 20,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168442344652?_skw=Pokemon+%22Zapdos%22+16&hash=item2737f234cc:g:ebUAAeSwS4JqJ1MS"
        },
        {
          "title": "1999 Pokemon Base Set Zapdos 16/102 Holo Rare WOTC Vintage HP DMG Raw",
          "total_ask_price": 29.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/277929772782?_skw=Pokemon+%22Zapdos%22+16&hash=item40b5e7c6ee:g:DIsAAeSwDeVp7V4F"
        },
        {
          "title": "1999 Pokemon WOTC Zapdos #16 (Holo) - Base Set - MP",
          "total_ask_price": 29.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236898214060?_skw=Pokemon+%22Zapdos%22+16&hash=item37283be0ac:g:troAAeSw1fdqPUbI&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYqpb%2BPrubXFedfoDwrVTR97LAt6IkS1zS6JJd42DS5HXqWjhKn%2Fojj6eYi1vou%2BE%2FrL%2BfAr4ILgtmLryR6rlYEP4hr9FVAW4LNlpfs4e8rv8rHw6U9awonVf8USXpgn%2BT4oqZQWqLIhlhaLG9A6cwPFLcRTbgEa3c%2FDGqlWnvHccDc8wBDhdRgyUYgD6MFBow3VocerJieoe%2FZWPgjaapjM1AFC5RBCueJNTfAvEdRw0yIDAgDJtM4F8V3qgT2ioIV4qmMcPwqwhBZBVNDab2jxHMjykRmil98T3HuMsZuEg%3D%3D"
        },
        {
          "title": "Zapdos 16/102 Base Set Unlimited Holo Rare Pokemon TCG 1999 Pok├⌐mon LP",
          "total_ask_price": 31.61,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/398098158100?_skw=Pokemon+%22Zapdos%22+16&hash=item5cb07fd214:g:Kz4AAeSwh5lp5U5Y&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYEhwmt8hFt1uWwMmjafc0ty1JnTQioErPHHC0tweJrPJD%2BzZInsOg%2FepULuqDcHRCHY2cD2zHv3%2BBlaDhzAzj4XvTPHZ1FvdYpo%2BhlD35tywKzuqV8IGtJxzMu%2F9z%2FuFd9S%2BsuO%2Fg7bykg5uO9t3t9Lq8Bo4NtQuB1xGtBsJDgss6QpQnJ4C1V%2Fin9fzAee5Fnb6JSkfwHOxh0Lmw0pwtk1ItlF%2BmjhBZu1PVgJkGf2dpA5WeRjg0z168MYAECd411wSbNtL6n8yyxd9nLmBkzV4Oxmq7e%2F9mwg%2BkDqf4D1A%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Zapdos base set shadowless 16/102 pokemon card",
          "total_ask_price": 35.13,
          "url": "https://www.ebay.com/itm/188499128594?_skw=Pokemon+%22Zapdos%22+%22Base+Set+Shadowless%22+%2216%22&hash=item2be36c7112:g:W0IAAeSwIxJqKxZK"
        },
        {
          "title": "Zapdos 16/102 Holo - Base Set - Shadowless - WOTC - Pokemon - DMG",
          "total_ask_price": 43.38,
          "url": "https://www.ebay.com/itm/287328240280?_skw=Pokemon+%22Zapdos%22+%22Base+Set+Shadowless%22+%2216%22&hash=item42e6190298:g:1DEAAeSwPKtqA5Q7"
        },
        {
          "title": "Pokemon TCG Zapdos 90 HP Base Set Shadowless Holo Rare 16/102 EN 1999",
          "total_ask_price": 55,
          "url": "https://www.ebay.com/itm/168395025702?_skw=Pokemon+%22Zapdos%22+%22Base+Set+Shadowless%22+%2216%22&hash=item2735202d26:g:cBcAAeSwGgVqEMMv"
        },
        {
          "title": "Pokemon TCG Zapdos 16/102 Base Set Shadowless Holo Rare DMG",
          "total_ask_price": 55.99,
          "url": "https://www.ebay.com/itm/377229063913?_skw=Pokemon+%22Zapdos%22+%22Base+Set+Shadowless%22+%2216%22&hash=item57d49ab6e9:g:8~QAAeSwWi9qHyUj"
        },
        {
          "title": "1999 Pok├⌐mon ZAPDOS 16/102 BASE SET SHADOWLESS HOLO Rare VTG Pokemon Card WOTC",
          "total_ask_price": 67.99,
          "url": "https://www.ebay.com/itm/336647679042?_skw=Pokemon+%22Zapdos%22+%22Base+Set+Shadowless%22+%2216%22&hash=item4e61c3ec42:g:OEgAAeSw8ShqNalu"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-6-SHADOWLESS",
      "card_print_id": "accc058a-21f2-40a0-9344-f7c94cbc65fe",
      "evidence_class": "raw_single",
      "listing_count": 47,
      "seller_count": 43,
      "median_active_ask": 65,
      "minimum_active_ask": 12.9,
      "maximum_active_ask": 775,
      "strict_sample_count": 25,
      "strict_pass_count": 8,
      "strict_pass_ratio": 0.32,
      "strict_review_bucket": "strict_title_review_required_mixed_titles",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 2,
        "shadowless_lane_missing_title_token": 17
      },
      "sample_failures": [
        {
          "title": "Pokemon Shadow Holo Gyarados #6",
          "total_ask_price": 12.9,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/276597584464?_skw=Pokemon+%22Gyarados%22+6&hash=item4066803250:g:otAAAOSw0Mhmv1vA&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ7UPkJqXcwoTjQNXIxeGHh07FIvcGjgDjW7IoH%2B58zoPHyeJJC8CCpR6sEYhe5dC5qNpurED1A6ZwoAdCfCNa6ZP4owC6DcxQjyBoYBM8FQVIfrVPcxRWzeFidY1JwjHrg59JrPoScMAbb%2FywQNkTQy2XQR3GjEw2uF0tckY2yjEntKWgZXQA%2FcEcCuwMHYOta59bIeP8M16G1Y0TuNb9zKi9HnXzTeVRXF3bma8uH14zRWJC0kDGqDfYEQ8hTFoFOaKf00JVx69dq2Z5xoCZpnxjqEBpRUUi7mBeRJJJvGQ%3D%3D"
        },
        {
          "title": "Gyarados #6/102 Base Set LP Pokemon Card - (MP-)",
          "total_ask_price": 13.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/298442417080?_skw=Pokemon+%22Gyarados%22+6&hash=item457c8de3b8:g:eisAAeSwU3ZqOWlS&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYmjViEimrmmGuW8P9KsLZSiSIkOI6he5EE9l0Nyk3Wd1lL1qlv5%2BL0hfjv2v%2B92za13k%2BkG288BviJsZ8iorvORCUv5%2BDOAWcmmUrzUn0mq5TEmiODPKVKeUiC%2BvAkgn2vKCBaK8D95F4ETl8T%2BroCi0ARH1yKZ0RQ1EgZJJVdnwtksFa%2BaTYh7NGp6jhoeAUl1mV04P4TGD0UcvCN0NUqancA9bOStSaQBaPCsjgKa1SFUWUYUV%2BqCnooXnGNHi%2FrtseygeduGHWxCD7sWlTxb4zTd4G7%2BRJtZlTUz9zThA%3D%3D"
        },
        {
          "title": "Pokemon - Gyarados 6/102 Base Set Holo 1999-2000 Wizards Base Set",
          "total_ask_price": 14.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/127003575290?_skw=Pokemon+%22Gyarados%22+6&hash=item1d9200c3fa:g:RsoAAOSwAY9n2dEB"
        },
        {
          "title": "Gyarados Holographic Pokemon Card 6/102 Original 1999 - Ungraded, Excellent",
          "total_ask_price": 16,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/336644104782?_skw=Pokemon+%22Gyarados%22+6&hash=item4e618d624e:g:yoAAAeSwY5FqMs8F"
        },
        {
          "title": "Pokemon Gyarados 6/102 Base Set Holo Rare WOTC Card B",
          "total_ask_price": 18,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/257575519918?_skw=Pokemon+%22Gyarados%22+6&hash=item3bf8b286ae:g:zBQAAeSwqV1qM4bE"
        }
      ],
      "sample_passes": [
        {
          "title": "Gyarados 6/102 Base Set Shadowless Pokemon Card Holo Rare HP",
          "total_ask_price": 38.64,
          "url": "https://www.ebay.com/itm/198343357678?_skw=Pokemon+%22Gyarados%22+%22Base+Set+Shadowless%22+%226%22&hash=item2e2e2f74ee:g:QgoAAeSw-8pp~5xX"
        },
        {
          "title": "Gyarados 6/102 HP Base Set Shadowless Holo Holo Rare Pokemon Unlimited Holo",
          "total_ask_price": 47.77,
          "url": "https://www.ebay.com/itm/318452248742?_skw=Pokemon+%22Gyarados%22+%22Base+Set+Shadowless%22+%226%22&hash=item4a253bb0a6:g:SNkAAeSwE2hqLf1v"
        },
        {
          "title": "Super Rare! Gyarados 6/102 Pokemon Base Set (Shadowless!) Holographic",
          "total_ask_price": 50,
          "url": "https://www.ebay.com/itm/406969902182?_skw=Pokemon+%22Gyarados%22+%22Base+Set+Shadowless%22+%226%22&hash=item5ec14be466:g:Bk4AAeSw2ItqH4Lb"
        },
        {
          "title": "1999 POKEMON TCG GYARADOS HOLO BASE SET SHADOWLESS UNLIMITED RARE 6/102 MP",
          "total_ask_price": 59.99,
          "url": "https://www.ebay.com/itm/157579644544?_skw=Pokemon+%22Gyarados%22+%22Base+Set+Shadowless%22+%226%22&hash=item24b07a8e80:g:W5gAAeSw~xtpVDC2"
        },
        {
          "title": "Gyarados 6/102 Holo Base Set Shadowless Pokemon Unlimited Holo HP Arita",
          "total_ask_price": 63.23,
          "url": "https://www.ebay.com/itm/188468286972?_skw=Pokemon+%22Gyarados%22+%22Base+Set+Shadowless%22+%226%22&hash=item2be195d5fc:g:aWMAAeSwlgVqIipw"
        }
      ]
    }
  ],
  "strict_ready": [
    {
      "gv_id": "GV-PK-BASE1-10-SHADOWLESS",
      "card_print_id": "02c1147c-3914-4b4a-a1d6-8d620e633e9b",
      "evidence_class": "raw_single",
      "listing_count": 25,
      "seller_count": 20,
      "median_active_ask": 165.99,
      "minimum_active_ask": 28,
      "maximum_active_ask": 490,
      "strict_sample_count": 25,
      "strict_pass_count": 24,
      "strict_pass_ratio": 0.96,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 1
      },
      "sample_failures": [
        {
          "title": "Pokemon TCG Base Set Mewtwo 10/102 Holo Rare Unlimited Autographed",
          "total_ask_price": 28,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137452778716?_skw=Pokemon+%22Mewtwo%22+10&hash=item2000d2f4dc:g:DpYAAeSwvnVqPWW6&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbyuQ9D1vNisy95D8R0BPvAGJFLlHXK5Kb%2BlU7sDqsbxs39tyOP2FZckvrJ3Sv6rvrdEdZqb9BOJVagfScNpdNCLEIv%2FnmeyOUgDOh3ngWb%2FzO8NnK8uoK5iTvqTzTjh4hGeP4IftHZdSWkklIjpTkF6R8%2FGhrmAY1zl%2BM6%2BBIR6VLuRjUUiPvoQm61HtAvrf34XS4LVEErsuikLTBVn28r%2FJntPRfU3OHpbG3HkzJcoQ6yRQWhWqaTbmcnE8Ta9gdgTphSajSCbQ5K6u%2Fh8ceg9%2BTDlcAFUjQd3S7826WFwQ%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Mewtwo 10 Base Set Shadowless English Pokemon Card B1 HP",
          "total_ask_price": 53.99,
          "url": "https://www.ebay.com/itm/156546117591?_skw=Pokemon+%22Mewtwo%22+%22Base+Set+Shadowless%22+%2210%22&hash=item2472e02fd7:g:4K4AAOSwF-ZnRtsT&amdata=enc%3AAQALAAABAACCtXRWQnOEpyOqnQQ8KGbrgV05WUmksiaVCjBZRw7tNjXzZlk1U6JB%2FJb%2FFVgWPAKcQYAtscpdriVVjitL2ayKOt1n9f4MT7eFrWCM48EreBJbGcaBT8Dw9cpT9oNayxtvuk5GAjoKydG2TLeTeGMmEqcYx4YwwQK3qD2yo8Sj1jjnAyKQxyzN83kdyj1YzW8b9ZCcxN%2FNqufl%2BZyaufdTD67rP%2FR%2BxcFAK5kiL8%2BYOK3wb9u0ODVUioo9uakngLXnsijOs2gY6vDhH74BUSkl3lWSHhA5IOUM1x1IgV0OifnD%2FRXNJQnNubVort9PVE%2FLXvJpIMU0TV20S7Tn%2F3o%3D"
        },
        {
          "title": "Pokemon TCG Base Set Shadowless Mewtwo Holo Rare #10/102 60 HP English 1999",
          "total_ask_price": 75,
          "url": "https://www.ebay.com/itm/198414386938?_skw=Pokemon+%22Mewtwo%22+%22Base+Set+Shadowless%22+%2210%22&hash=item2e326b46fa:g:KNAAAeSwrfpqKKdO"
        },
        {
          "title": "Pokemon TCG Mewtwo 10/102 Base Set Shadowless Holo Rare HP",
          "total_ask_price": 75.99,
          "url": "https://www.ebay.com/itm/377229063650?_skw=Pokemon+%22Mewtwo%22+%22Base+Set+Shadowless%22+%2210%22&hash=item57d49ab5e2:g:NE8AAeSwgnNqHySU"
        },
        {
          "title": "Base Set Shadowless Mewtwo 10/102 Holo Rare Pokemon TCG - MP",
          "total_ask_price": 89.99,
          "url": "https://www.ebay.com/itm/157817168503?_skw=Pokemon+%22Mewtwo%22+%22Base+Set+Shadowless%22+%2210%22&hash=item24bea2e277:g:5w0AAeSw3EVp1UZi"
        },
        {
          "title": "Pokemon Mewtwo Base Set Shadowless Holo Rare 10/102 60 HP English",
          "total_ask_price": 90,
          "url": "https://www.ebay.com/itm/397894609880?_skw=Pokemon+%22Mewtwo%22+%22Base+Set+Shadowless%22+%2210%22&hash=item5ca45debd8:g:L6oAAeSwwplp8s2s"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-11-SHADOWLESS",
      "card_print_id": "8072e2d6-ebc9-4c51-b412-c776410c7b30",
      "evidence_class": "raw_single",
      "listing_count": 31,
      "seller_count": 29,
      "median_active_ask": 76,
      "minimum_active_ask": 17.99,
      "maximum_active_ask": 880.99,
      "strict_sample_count": 25,
      "strict_pass_count": 19,
      "strict_pass_ratio": 0.76,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 6,
        "base_lane_has_base_set_2_noise": 1
      },
      "sample_failures": [
        {
          "title": "Nidoking 11/102 Pokemon TCG Base Set Unlimited Holo Rare MP",
          "total_ask_price": 17.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/205685041234?_skw=Pokemon+%22Nidoking%22+11&hash=item2fe3c8a852:g:D6YAAeSwcZ5op~WY&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGY2lpYKX7S1hJ6HzqCxLpzpQxcryuLjC38He0%2Fcs9G%2FYqSL5BTHiNXeVRB4GL2eYkvA8dagKhbukiU4Kknx69ssLhK9FF030vld%2FDnqa2QBshCrPNYlB5dbYU60Fkk8pUbSojEwHG17G88D4r8mHtAfkFn6GLJnZBLcv8A7TPtlDL%2BDAm2%2FcxnDnB4WamPiEOJw2YusmpdztqaiO71hryYa2hk39if4gcb7A8hec9OWOCgBKov%2F5soabeOya0Q%2FJ273wks98JlVtR1qqOQx6LDNeePODNo7iJmJu6fXGofKBg%3D%3D"
        },
        {
          "title": "Nidoking  11/102 Base Set HOLO Rare Card Unlimited WOTC Pokemon TCG Vintgage",
          "total_ask_price": 20,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/198129106952?_skw=Pokemon+%22Nidoking%22+11&hash=item2e216a4008:g:z9gAAeSwKBBpm5VS&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ1rcUgbTZDkwbuR7JmALWCHoNjQO8l7pWpYYuhSLzBx5BvBFf4%2B%2BWc49DJUXqyDncJQh32INPnH28jeXiCxCYrdUYsxSEPQj15ffBxIaZxDKra%2FjmZzprmVcqsz1eMyMxd%2FeRHARW7Li25dW4ipLrdI%2BWRzZ2U6QHpZ%2FkJUddS%2BKpCVAP6GYQYTfrsttyq9Qxg7%2Bet512F10vU9F5FR1O0vRfppWtEvX%2FlisGHQjw32rLBzXoH2mSb54Fc%2BUaWAhDjWMLE%2FPDbmD2TBnmV51YOKK29IgLDTFtvsOrIzXaS9w%3D%3D"
        },
        {
          "title": "Nidoking 11/130 Holo Rare Base Set 2 WoTC Vintage TCG Pokemon ",
          "total_ask_price": 25,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/206373111521?_skw=Pokemon+%22Nidoking%22+11&hash=item300ccbc6e1:g:vTsAAeSwQjhqPZxT&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYsMTofuPGs51ArHlc%2Bha%2BTQxQvdBf76wKNvPVCkHcmcsHeBH9J7rcWjh%2BJjPzbCmtA2mWT10k6qkZh0%2FCGbJ21vOV1h3jvXvw2E6BTCedT7zdxKBw04AIZmEa5Nda5xs9qBlF1ATaNS%2FyLSpyc6rO9JXoIVC9pFRLthhlgsUngmNmE2S%2BZA76WF8VSH3wUKUzSfxM%2FA2BtPIVvWpikWjLWQSWZLflj3Zdf2alESxWEEsU4a6Ssr07cWORiX%2FEzI6hC5F6Z%2BIutS9TvFuEwu0QQBBtGqdGy3PQAjPCQiuH97w%3D%3D"
        },
        {
          "title": "Nidoking 11/102 Base Set Holo Rare Unlimited WoTC Pokemon 2000 LP",
          "total_ask_price": 28.8,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137413154992?_skw=Pokemon+%22Nidoking%22+11&hash=item1ffe7658b0:g:16cAAeSwUGhqLjF8&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGb5Aua4D94kKw5A%2BL6u5AGh%2Bvidl6CUEYwlzcaM6cmWq5k6gl1A5GS8oiCnaafj8bdTB%2BEr%2F5FLtCFwiMLik7kpx57Rp4gNZSvm%2Fr%2FTrTdc64RKxTofZPmKn1GlbqVgYqx8A0F%2B6t7agxlMu5jFI%2FX4kziDIgdKbJqBDnrCRGe%2FG5x0SphFwYbta1bEUa25ey8sn%2ByHvFSE9hAS5kqAzzjX26AfxcUCTUP52RwJFoKhDGCYsXQuIYU4ps5CPB6Y3y7Bku45CST2llGneD72RF3yGfFLJAML2Ex85261p7WkVQ%3D%3D"
        },
        {
          "title": "Nidoking 11/102 Pokemon TCG Base Set Holo Foil Rare Card Lightly Played LP",
          "total_ask_price": 29.979999999999997,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/327216677206?_skw=Pokemon+%22Nidoking%22+11&hash=item4c2fa24156:g:42kAAeSwfyZqMYPV&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZuDfewekY1HL3uUmsp%2BgntLIZKCUNFuNuhhJtP4zB%2BUv--0xpInxkaAZ4oOvRmSDmV25%2BwuP2t4yLAhLlRJJNhxdH%2FHPli%2BnPxpNu%2BZUbYfWP62Fr1yjqd0bN8DO5dVHRMgbGsaHb1AwQkjSI0zUBCIwDeyhX9NYOsWmXqQ6DgwDeNcNlNh%2FLKvccCsu7XKvcBJjLaFWzX%2Fvq7MelMUsl3syOTWHccO7hM6q6qKjX1aipZTIBUm5RfR1r6nZl6axK98MwFGEP7%2FfepXYWFH93Kz49MGED%2FyKVJjGdAIwmFKA%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Nidoking 11/102 Holo Rare Base Set Shadowless Pokemon Unlimited Holo HP",
          "total_ask_price": 32.99,
          "url": "https://www.ebay.com/itm/298437454557?_skw=Pokemon+%22Nidoking%22+%22Base+Set+Shadowless%22+%2211%22&hash=item457c422add:g:578AAeSwUGhqN6oE"
        },
        {
          "title": "Nidoking 11/102 Holo Holo Rare Base Set Shadowless Pokemon Damaged",
          "total_ask_price": 35.980000000000004,
          "url": "https://www.ebay.com/itm/407012509994?_skw=Pokemon+%22Nidoking%22+%22Base+Set+Shadowless%22+%2211%22&hash=item5ec3d6092a:g:qRcAAeSwvkJqNQ6~"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Nidoking 11/102 Holo Rare HP",
          "total_ask_price": 41.160000000000004,
          "url": "https://www.ebay.com/itm/267704132298?_skw=Pokemon+%22Nidoking%22+%22Base+Set+Shadowless%22+%2211%22&hash=item3e5468e2ca:g:S5EAAeSwwQVqNaU-"
        },
        {
          "title": "Nidoking Γ¡É∩╕Å 11/102 Holo Rare Base Set Shadowless WOTC 1999 Pokemon MP",
          "total_ask_price": 45.760000000000005,
          "url": "https://www.ebay.com/itm/227310576257?_skw=Pokemon+%22Nidoking%22+%22Base+Set+Shadowless%22+%2211%22&hash=item34ecc42281:g:DNAAAeSwRZlp52TC"
        },
        {
          "title": "Nidoking 11/102 MP/LP Base Set Shadowless Holo Rare Vintage Pokemon TCG 1999",
          "total_ask_price": 49.99,
          "url": "https://www.ebay.com/itm/157934046625?_skw=Pokemon+%22Nidoking%22+%22Base+Set+Shadowless%22+%2211%22&hash=item24c59a4da1:g:UFYAAeSw-PRqESG4"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-13-SHADOWLESS",
      "card_print_id": "c7e27209-87ca-464e-903b-eb8e8421ea12",
      "evidence_class": "raw_single",
      "listing_count": 26,
      "seller_count": 24,
      "median_active_ask": 50,
      "minimum_active_ask": 15,
      "maximum_active_ask": 177.77,
      "strict_sample_count": 25,
      "strict_pass_count": 17,
      "strict_pass_ratio": 0.68,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 8,
        "base_lane_missing_base_set": 1
      },
      "sample_failures": [
        {
          "title": "Poliwrath 13/102 Base Set Unlimited Holo Rare LP-MP Pokemon TCG NM",
          "total_ask_price": 15,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168445476603?_skw=Pokemon+%22Poliwrath%22+13&hash=item273821fefb:g:dC8AAeSw-PlqKKjW&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbgyaoZ0EEkbaezYFA2sjeQrlgcwx9HDXpSfanUECh%2BSaH99ac7G67WRK5eR%2FrF0jhWgtIuUgqYORKJiAtA0K16ErvRlj0XB6j3b34K1NRa3enixS3XWaHBkpO6tLYqq7Xsmb9HuDQ29oUjeaBOP%2FFFk0JsMc34eaTjtiK2iyEvM82gJ6jZEcHcLUzqK4yKfVNtLkOk6Ir4eq%2B9%2FpvbgyIOW1VMWbTz7z7g%2Fv249iOlryRI7zKcvl4EuqqivCBgYr495%2FjNJn1fTRQMKG3PmS77XHdk%2BVvJXPef8APAYl4sJA%3D%3D"
        },
        {
          "title": "Pokemon TCG Base Set Poliwrath 13/102 Holo Rare WOTC Card LP 🔥 ",
          "total_ask_price": 17.86,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318288541120?_skw=Pokemon+%22Poliwrath%22+13&hash=item4a1b79b5c0:g:14cAAeSwVKVqAovl&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZzKnBuYBwQGSVfZDYXkwvvXnVBWJTimxBjUSKBI3ZFevXbWn58X5z73zdJ7J1Mqg0Ju0N68pvZlMRQny9bceVxN%2BeOvJEGn1qb6ebzSU%2FCq9LuKy%2Fd4nQuudAUxEzeVGbt1j0jMhU08huwl3jm%2FOOOhmOxSbnq2epZurAahVUa3qPR59LvbskeWzAnWV8serKe9JRbENQyZAUEUSrQXjSlabiTUCs0s6MfqSjfYFqTtFM6ckQUnv%2FBs6W55DPD%2FHSJPFJdVsTp0Uy%2F38ygrQCLLtD8rV5N8R%2FWu%2FwlN8b7rg%3D%3D"
        },
        {
          "title": "Pokemon Card - Poliwrath - (13/102) Base Set Holo Rare TCG 1999 Played",
          "total_ask_price": 22.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/135107125180?_skw=Pokemon+%22Poliwrath%22+13&hash=item1f75031fbc:g:4AgAAeSw77xqCnIN&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbFuVUQbNlTKe3y70ic4FCoDY%2Fj9yqZ5c5eBiyySjRvyjT6%2BdctTeSwt2WLIj9QMt%2Fh40ywkE9HA0TXHavoj1red7XIz8HkSuvcEPxwyNarwO5y6MY6P9%2B8Hn2cXi7qSRR3on8MN3hHET5AhKJYRLN41pSlbWWc86SV%2ByV14QRHA0O85eC5sGgcrRxL%2B4JrxtHqGgZXYTPWx9whjbA2VN9CcFNSqhl6jT4vRXrtkDTfZyjCCvvh%2B%2F5N3mqdqSBWI8pgZbfEXWQGDJSuTj1UmIr%2FH51Ols8orL1l9yYhPD5bAA%3D%3D"
        },
        {
          "title": "POLIWRATH - BASE SET HOLO RARE WOTC Pokemon Card 13/102 NM/LP",
          "total_ask_price": 24.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287390176829?_skw=Pokemon+%22Poliwrath%22+13&hash=item42e9ca163d:g:IfkAAeSwLQ5qK9rS&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZb86%2B7f1JXm6hc8HOaz5RHHVkOt7IPPnFJJTBVGUWa0cSGN9S0e2dgWXZ5WZjz1Ve91R8CreimtDVeJGvU7RQDfzgYpUyHQV0vMGbD0d%2BKUxKfyKX791hH8o7CPKSoHwKhvi144Lqz1gqMOac3ojTUaItyG0tfT7KcF9YbshbvmlQqwmPF6hNVSUUF%2BED%2BxUrilAa4bFujw%2F65tQvW8eTsRuRJMWIPbrz%2Bt7oIhvPtlo73lEjsdGCcZPAAtzWxAGj0rtPyUsWbeY8RDGd50xFiuccz83T4jFInfh1FpnoNXg%3D%3D"
        },
        {
          "title": "Poliwrath 13/102 Base Set Holo Rare Pokemon Card",
          "total_ask_price": 29.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/227384274870?_skw=Pokemon+%22Poliwrath%22+13&hash=item34f128afb6:g:xa0AAeSwZKtqKy9O"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon Poliwrath Base Set (Shadowless) Holo 13/102 WOTC Rare",
          "total_ask_price": 29.99,
          "url": "https://www.ebay.com/itm/204848789211?_skw=Pokemon+%22Poliwrath%22+%22Base+Set+Shadowless%22+%2213%22&hash=item2fb1f076db:g:oW0AAOSw68Fmd4jB"
        },
        {
          "title": "Pokemon Poliwrath 13/102 Shadowless Holo Rare Base Set Vintage WOTC MP",
          "total_ask_price": 30,
          "url": "https://www.ebay.com/itm/168454512900?_skw=Pokemon+%22Poliwrath%22+13&hash=item2738abe104:g:5X8AAeSwmkpqLMrE&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGa%2Bm1yj%2BDnCZtPZKBml41u%2F%2BwY%2BlHpA1ejoAK8Cwp9J4EzDbSxKCOEKTDdZSmkYECmeWoHK2WudzWUqR2gXsxbxkxrADmLsSV63q2jHWVNBL2edtPQBvTRrxcQ83uzZ1CqVLD45i106oIMVQYtdmQvu54%2F19wgSaU4fBbpdNMIFWwWI4skoM1aFjh3WVHsK2x%2FPz2PYNQWqVHXItcdWT4rXXd11E%2FiHsqY507qNSJX%2BraI18KCd81EqaOj59lZvTlCRp2q3bzdA2%2BZhbVGXRdOqBiDRf5Der6LfKMlnSD6GPg%3D%3D"
        },
        {
          "title": "Poliwrath 13/102 Holo Rare Base Set Shadowless Holo Pokemon Damaged",
          "total_ask_price": 33,
          "url": "https://www.ebay.com/itm/127927701652?_skw=Pokemon+%22Poliwrath%22+%22Base+Set+Shadowless%22+%2213%22&hash=item1dc915d094:g:hqUAAeSweeRqMuFh"
        },
        {
          "title": "Poliwrath 13/102 Holo Holo Rare Base Set Shadowless Pokemon Unlimited Holo HP",
          "total_ask_price": 35.99,
          "url": "https://www.ebay.com/itm/398095936395?_skw=Pokemon+%22Poliwrath%22+%22Base+Set+Shadowless%22+%2213%22&hash=item5cb05deb8b:g:kP8AAeSwhhBqOdUH"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Poliwrath #13 Holo Rare- (RAW) MP",
          "total_ask_price": 42,
          "url": "https://www.ebay.com/itm/286760752572?_skw=Pokemon+%22Poliwrath%22+%22Base+Set+Shadowless%22+%2213%22&hash=item42c445d5bc:g:RkEAAeSwp9xomkuC"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-15-SHADOWLESS",
      "card_print_id": "bca34539-1efc-4da3-9f92-990b43ac5278",
      "evidence_class": "raw_single",
      "listing_count": 30,
      "seller_count": 26,
      "median_active_ask": 330.17,
      "minimum_active_ask": 19.03,
      "maximum_active_ask": 1750,
      "strict_sample_count": 25,
      "strict_pass_count": 15,
      "strict_pass_ratio": 0.6,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 4,
        "shadowless_lane_missing_title_token": 9
      },
      "sample_failures": [
        {
          "title": "Venusaur 15/102 Celebrations 25th Holo-Foil Rare Pokemon TCG  Card- English",
          "total_ask_price": 19.03,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/307021554856?_skw=Pokemon+%22Venusaur%22+15&hash=item477be924a8:g:TmgAAeSwBP1qOvCU&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbIWVNkU49BtPY8H3tKnS8eyMNwBCw9EJoP7l9k7xCmgIMa4Nvllxy1K8BEfVaZwFwFRyomVm2yGRTXmezpAQtuaqe1rh5063z053E81tLVEwkqt8aspKg%2F3LX4%2FIfnCS5xq8pDR3081DHhJ1aZH7uxyID%2BoeFTnDsjp1eonmzuPCuYBWfblR5KoPkp3AM6vid5zqkpTSZNowicYsKDfU5Brit3W%2FWdU2z7UaI9sVGS12cFZuo5g46zouZ5xelLK5DPexqwATQNDdEpiIYdFZCfTqHbhYMgOwTu7MfAwgfI%2Bw%3D%3D"
        },
        {
          "title": "Pokemon Venusaur Base Set 15/102 Holo 1999-2000 Damaged",
          "total_ask_price": 79.67,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/407019878528?_skw=Pokemon+%22Venusaur%22+15&hash=item5ec4467880:g:TU4AAeSwrkdqOWWL&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbdilIx0JF3mvbx0VLwDawvaW4ZRHq%2F9FwAz2fod5Jb3KjCeJiaa98HSyx%2Fv9rcdxt7VfVydI2SvaoB%2FuCjJNqQ8HYRBgkLNKK98c%2B2GM35cMrJQiNj988rHyu5c51KwzEGrx4bMfEkmc9xnluS%2BvNn7kQa1GqHHBZf2xD7A1FdYWbSV8oIdTZ222ZzkDRygVmeDPH1U0h5174cfNtkR1U06%2BgwerTxQrrJCZr7of4Sbo84JXP3P1NQCMoehegBbcNkEk0xn1EjmL4BhMwGOR0zux47byjhEBfGWm7oaROi2A%3D%3D"
        },
        {
          "title": "Venusaur 15/102 Holo Rare Unlimited Base English 1999 Pokemon - Lightly Played",
          "total_ask_price": 93,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236849212528?_skw=Pokemon+%22Venusaur%22+15&hash=item3725502c70:g:j7UAAeSwdDpqHMel&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGa9VylBkin4HgT6wYS7nxCBy9f2Lu2spOEYynrwo4RWp2%2BV%2BeUGcUmkQ0zJGvjMCXf0GRFwfJsnWCRWGDlLNuWISjaOJRJiaA0A0rSwif9E2GtJP8CgoyzjIhHr%2BtYazaUPHeHEH08HjhOYzwTzVLrjBhxc9QednN99Af6aOufXrTXT1kxDg5txFlWkkgm1q%2BaznAlnd%2FOuyw5qOWhKNyoFDgCKC7hoQIvRJZtyQJxn4LI0mumJSEXILOTmmqPAteyFEDpqWknAB3tEUDtfx9oup%2Bkmy%2B0KaXQMnUW2qKBrZA%3D%3D"
        },
        {
          "title": "Venusaur 15/102 Base Holo Rare Pokemon Card DMG",
          "total_ask_price": 99.99,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/198446426397?_skw=Pokemon+%22Venusaur%22+15&hash=item2e3454291d:g:BbIAAeSwcRJqOWw6"
        },
        {
          "title": "Venusaur 15/102 Holo Pokemon Holo LP Base Set Unlimited",
          "total_ask_price": 124,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168477709947?_skw=Pokemon+%22Venusaur%22+15&hash=item273a0dd67b:g:La4AAeSwOgVqN03f"
        }
      ],
      "sample_passes": [
        {
          "title": "Venusaur 15/102 Base Set Shadowless Holo Rare Vintage 1999 WotC Pokemon Card NM",
          "total_ask_price": 40,
          "url": "https://www.ebay.com/itm/127905769739?_skw=Pokemon+%22Venusaur%22+%22Base+Set+Shadowless%22+%2215%22&hash=item1dc7c7290b:g:OPIAAeSwZQpp7ikr"
        },
        {
          "title": "Pokemon - Venusaur 15 - Base Set Shadowless Unlimited Holofoil DMG",
          "total_ask_price": 197.41,
          "url": "https://www.ebay.com/itm/257237293232?_skw=Pokemon+%22Venusaur%22+%22Base+Set+Shadowless%22+%2215%22&hash=item3be48998b0:g:t1cAAeSwPmtpLMr6"
        },
        {
          "title": "Venusaur - 15/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC MP-HP",
          "total_ask_price": 199.39,
          "url": "https://www.ebay.com/itm/306903574741?_skw=Pokemon+%22Venusaur%22+%22Base+Set+Shadowless%22+%2215%22&hash=item4774e0e8d5:g:KfgAAeSwBeNp7j-p"
        },
        {
          "title": "Venusaur #15/102 Base Set Shadowless LP- Crease Pokemon Card",
          "total_ask_price": 250,
          "url": "https://www.ebay.com/itm/147274854093?_skw=Pokemon+%22Venusaur%22+%22Base+Set+Shadowless%22+%2215%22&hash=item224a43eecd:g:qyAAAeSwRZlp6n3O"
        },
        {
          "title": "Venusaur - 15/102 - Pokemon Base Set Shadowless Holo Rare Card WOTC HP",
          "total_ask_price": 310.34000000000003,
          "url": "https://www.ebay.com/itm/197800137487?_skw=Pokemon+%22Venusaur%22+%22Base+Set+Shadowless%22+%2215%22&hash=item2e0dce930f:g:DGMAAeSwWHlpAoq5"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-2-SHADOWLESS",
      "card_print_id": "468da9b6-1ce0-41e9-9124-563603e14b8b",
      "evidence_class": "raw_single",
      "listing_count": 23,
      "seller_count": 19,
      "median_active_ask": 305.99,
      "minimum_active_ask": 69.5,
      "maximum_active_ask": 950,
      "strict_sample_count": 23,
      "strict_pass_count": 16,
      "strict_pass_ratio": 0.696,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 7,
        "base_lane_missing_base_set": 1
      },
      "sample_failures": [
        {
          "title": "Blastoise 2/102 Holo Base Set Pokemon 1999 ",
          "total_ask_price": 75,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/197931468042?_skw=Pokemon+%22Blastoise%22+2&hash=item2e15a2850a:g:b9QAAeSw30VpNc87&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZh4XEUL9%2FZSukzxlhGvXxdasO04bSL0I69G1zIDpD9wZJ1ldbkgU3SuvQtbdJyxd5VwRHKuFbS5qrNzA53R0Lh6B2t9lXw7qP44HU4tZQiui4pT5PyDhX5LlN2OLcl%2BxDYGPdKDuFkOAYLbBRz7TxNg--ViVkuRUB%2FjgRs5C1aXr6%2BIIBgDSj%2FwYN3MHn75ZlQG5P6auPgtnJfdEYrgYWVJ%2BJqlNVdDbU6sw%2FbkDGOQiqLIhFmwMri33%2FFcx%2Fa1UETO1BtbfO7Y77EOldbcM30ToFEzo6DbnH%2FErogpOqM3A%3D%3D"
        },
        {
          "title": "Pokemon TCG Blastoise 2/102 Base Set Holo Rare Stage 2 100 HP",
          "total_ask_price": 75,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/178120573131?_skw=Pokemon+%22Blastoise%22+2&hash=item2978d040cb:g:8h4AAeSwMtJqAA5L&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYkEybWqwhuA%2Biy28k6IanmXGKm4nKXJhYxg4XunmHfZNk5cwKgy%2BRubnex69W6fXKIx5sow00afGAc8xyrKrrtOVr%2BGCOKM%2BZ8%2BOSTySW2UOrLRO1nNOC3bL85ob1TtSxZunZlPaXJK0In1vuyGwCysbA7lU%2B%2BkhLXvcH4HkKJ5QrcshFq9k0RTa99OaYhXYEW%2FgdSDWFIzhX2%2Ft5%2B81WuIQMcfQUr1JbylqwjYb2NHd8sAx%2FvZqn9dJWc6sftTrAfgOh5mEvE%2FrWk54CXKpLemMuBvO0hEsK3njQxTa7cYA%3D%3D"
        },
        {
          "title": "Blastoise 2/102 Holo Base Set Pokemon 1999",
          "total_ask_price": 90,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/197931469271?_skw=Pokemon+%22Blastoise%22+2&hash=item2e15a289d7:g:1HIAAeSwd-xpNc-M&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGb4X4uBpYvrBw0lbaFZn6Q5uD%2BK4lPin%2BHSW%2F2i6XIFjKlOqk%2FWtnHUW6PqRowU1ixeGd809LJaO9LRbeT%2FQZHLD5XE6m1ovtMyjxFBjxqTWZT7xHVM7gzNQOQ0hy9hFhmbGMpRqN5a27fAfukWd78R9k9CzdVq7Zrp6lEH9Khev%2F9C0RM5MZCQ2ismvo9YAvdQe7sVACr0IvWe1j2T%2FJAibTkTt4OGx2BS%2BSVhycq8RWxK7OyRgp8UbLu%2BvwOVqxAEQ1Dzl0UHWmTYsoJLoVwKML%2F4uFLpZUbXVJEwBMlA7A%3D%3D"
        },
        {
          "title": "Blastoise 2/102 Base Set Holo Rare Vintage Pokemon TCG WOTC LP",
          "total_ask_price": 129,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/358612800589?_skw=Pokemon+%22Blastoise%22+2&hash=item537efd144d:g:J28AAeSw0WlqGTL8&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ%2FR5BRmIHhj6KLaUrUEVwBvT3KOG211XbYxWtzyNqDnJ4oh8JWE%2FzfttYyOOMnjVS6eb8Yu%2FaJRltzX6j%2B5njCVZMbTj5Lrqv1tkVbWT0yJJfe4YiTlcfe%2BgW9RxTfpvWdo3VgGkPZTBgpmlzochPj%2BNg07PIGQoHj0s62rBRv9sTJAqDfZQgHd4uP3hy2585qQmDByg4AmVMmW0CRIjXFgceptP8nMuZrcGDeUlH7Fs4DCtFD%2F0QzKJGceo46Suh%2FcEKLg5JrEXc1pOwyRd7vfW0%2BzeHDBHOM2sbgL8W7KA%3D%3D"
        },
        {
          "title": "Blastoise 2/102 Base Set Holo Rare Vintage Pokemon TCG",
          "total_ask_price": 143,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/406977312811?_skw=Pokemon+%22Blastoise%22+2&hash=item5ec1bcf82b:g:FYMAAeSwpl1qIzNS&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ8ZbT24sWSZCbPz5YEqki%2Fsr5zlVK86oD9MVpuAszpoJDVAIen7WoeapQyztZA1PEyKgva20dOvf5c04TeFU4XXoqeQ0tE7vozjab0RgcGGnmfQMOJj2xn9StnTpROi1giH0Tls1g2hVi1YFJCuStMb5k580pQXJKoxOQgd5e2%2BSB6jCuj3d2UKlDgHOn1eMPdmEj3dpG43gjKdtcDIQjao2FwmviZafVF%2BhigP4gyflZamN%2FqmRApIXMTV3lpgyCmVV8xWXMeLTORYHhUjwWKpnDWaLQ%2Bbib9CQu9YaBYWw%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "1999 Pokemon Base Set Shadowless Blastoise 2/102 Holo Rare WOTC Vintage Card",
          "total_ask_price": 69.5,
          "url": "https://www.ebay.com/itm/127939844340?_skw=Pokemon+%22Blastoise%22+%22Base+Set+Shadowless%22+%222%22&hash=item1dc9cf18f4:g:weAAAeSwonJqNDhU"
        },
        {
          "title": "POKEMON CARD BASE SET SHADOWLESS BLASTOISE Holo #2/102 Damaged",
          "total_ask_price": 154.56,
          "url": "https://www.ebay.com/itm/227339017293?_skw=Pokemon+%22Blastoise%22+%22Base+Set+Shadowless%22+%222%22&hash=item34ee761c4d:g:KfYAAeSwkXBqATGe"
        },
        {
          "title": "Pokemon Blastoise 2/102 Holo Rare Base Set Shadowless 1999 WOTC Pok├⌐mon + Evos",
          "total_ask_price": 187.33,
          "url": "https://www.ebay.com/itm/155571584431?_skw=Pokemon+%22Blastoise%22+%22Base+Set+Shadowless%22+%222%22&hash=item2438c9fdaf:g:gfsAAOSwGxZj8iaQ"
        },
        {
          "title": "Pokemon TCG English Card Base Set Shadowless Blastoise 2/102 Holo Rare",
          "total_ask_price": 298,
          "url": "https://www.ebay.com/itm/137332209419?_skw=Pokemon+%22Blastoise%22+%22Base+Set+Shadowless%22+%222%22&hash=item1ff9a3370b:g:PTAAAeSwLSlqD3wl"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless Blastoise Holo 2/102 LP/MP",
          "total_ask_price": 304.5,
          "url": "https://www.ebay.com/itm/206126256718?_skw=Pokemon+%22Blastoise%22+%22Base+Set+Shadowless%22+%222%22&hash=item2ffe15124e:g:WzAAAeSwZcFpsGPv"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-3-SHADOWLESS",
      "card_print_id": "2ea7dd66-429b-41db-bf6f-20258f1538e7",
      "evidence_class": "raw_single",
      "listing_count": 24,
      "seller_count": 21,
      "median_active_ask": 57.47,
      "minimum_active_ask": 12.99,
      "maximum_active_ask": 1800,
      "strict_sample_count": 24,
      "strict_pass_count": 17,
      "strict_pass_ratio": 0.708,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 7,
        "base_lane_has_base_set_2_noise": 4
      },
      "sample_failures": [
        {
          "title": "Chansey (3/102)┬áBase Set -┬áModerately Played Holofoil Pokemon TCG",
          "total_ask_price": 17.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/377177385957?_skw=Pokemon+%22Chansey%22+3&hash=item57d1862be5:g:QMUAAeSwZPJqAgjp&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGaZ1kAeD4zgu0c%2FpI%2FNXL1I6XaLtyeTtCsvOfKAZbQuswaBFheO1U6utBwvjCSZpYg02wVeHRQbQWiE72pkMjo1DdqZUlKsLhs4IlANJCbj4QBPq%2B%2B0pfIvpKgm5W865gfKjHr3supSF82BZbo3%2FM%2BywhUQwNUU6l0Nx3Y%2BlEMddlVtd82WCWYhbluy7LluZyF0Ow6fq9d%2B0xTRTjnsJq2uz6d0HtWlOb%2BI7Xk4mvqcPPQnTwWDsbmai89G5HkTGvBulBh%2F59B2r52PbZdbGwXJP2r4bi6dMVXiiSB9fjSprA%3D%3D"
        },
        {
          "title": "Chansey 3/130 Base Set 2 - Holo Rare Unlimited - WoTC Pokemon 2000 LP",
          "total_ask_price": 19.76,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137351707561?_skw=Pokemon+%22Chansey%22+3&hash=item1ffaccbba9:g:NbkAAeSw5spqF0~e&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYOC%2ByvWhk2ZI2lQLkNnEVSgZ5AwnjeumGOiyyP9ubG5hzbnPZQOX%2FBRJ3aJ2wGFiAInG7eLXmGh%2BDFxMS4h%2FAsW2aJ2z82AoVqAcDgGloL%2FqajmzF64AMD0vU%2BPR8jgUE%2BZK9Z%2FFm%2FxA6%2F3XR00C5qrNH4%2FgLD79GY8azkxNeukK%2Bt%2BscaosuTqF0T%2B8tHgyPTcQenYi1sqXzOxfN9QYQluE5PjPPZDodzCZD5ZOunOd7vIDj4ERXgZa0z15eXbDDoD7sb3FLHwBFUEc4f78CQFAoJsVWmUWRaaPsOwFLetw%3D%3D"
        },
        {
          "title": "Chansey 3/130 Holo Rare Base Set 2 Pokemon Near Mint",
          "total_ask_price": 19.99,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236878978829?_skw=Pokemon+%22Chansey%22+3&hash=item3727165f0d:g:R3gAAeSwpfdqMDCj&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYERobrsUgWSkaVAoewu0S%2BXF%2F1ebYLx2mr9%2F3ZfPjvJIfzUsEoXUPzOn%2Fvr2x0zATcHIefEJu6FyzWrCJmVgqBzX%2FoZHbFoEKMS3zxKcSU0wjt6O8UZsrQaqr3vn5ERjPtuxszu5SHa5hmIzWFgwPY7hOB6HV0%2BJ9XXpIZQa%2B6dHf6J50cvpmRurUS0%2BzqwU2AKEHIzzp8POrAUyc2NddJcdp09%2FWAGrOko0LNd6zK1jtOCsNx%2BIfXQHAga1jAEoU3XZYEH3ZIcsp29P%2B0kCKjclL8ZQJ017DRmogUa9%2BJPA%3D%3D"
        },
        {
          "title": "Pokemon Chansey 3/130 Holo Rare Base Set 2 2000 Swirl HP",
          "total_ask_price": 19.990000000000002,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/117249553307?_skw=Pokemon+%22Chansey%22+3&hash=item1b4c9e339b:g:M70AAeSwZVNqL3-o&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbZbFQdIggxwcEiS6Qb0qF9pI8hRU07M%2F%2BW1aBWXi27tEu3E228jjCkzpkan4ERQL80vAd984h6%2BaOxSDJlMSbaeFeu1D9g7MsHEieU49%2FUss2GPKPu5RgetBRcosvY6P28CJ2JKiTIYpTrA7Q1rl%2F9wo4yJuBnDwvqhcq9Nawlm3H6lpSkrrjqpluGNfifmwg42zS6txrg7G%2Bc4CUQAZ3fV93FIM4q%2FGbDYx7UWRlnVich6oEtw46hDm9smR8UZo%2BnW%2B5z7xNzSkenYKyrgfD5osDQx7W9WidQzsGrZAW78Q%3D%3D"
        },
        {
          "title": "WoTC Chansey 3/102 Base Set Holo Rare Pokemon TCG English 120 HP Basic Γ£¿",
          "total_ask_price": 26.95,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/236853636986?_skw=Pokemon+%22Chansey%22+3&hash=item372593af7a:g:pikAAeSwX7JqH4p-&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGb1tLDdEU0mRr5EeOJFeLrRprKDWBxdYyKlC%2B%2BtgfYlwD9S3OUIJgki5pF41Nj3l%2FgYsq5m%2FgKBnzm0r7bV8YOijBUllL%2BUtAZStjGjVMuT1IgQmpzxpm4HGvLfoMcFdm4O8M%2FoEFx8DmOrK3Btp86Me6EA80BPUZUfsSwBDFrhIi2oqLTEiOyMJ7hQEo2bnnPafWuASAtPyknkElnoKkXD95cTQmyP4%2BYKSyTVLQNg4tvz8tMf%2FvSqZObTwccyga0JVblPkJ%2B%2BVyW98G63rFnAKqeaFK8jJO2tUy8oXgQXGg%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Chansey 3/102 HOLO Base Set Shadowless Pokemon Unlimited Holo DMG Ken Sugimori",
          "total_ask_price": 12.99,
          "url": "https://www.ebay.com/itm/298339317451?_skw=Pokemon+%22Chansey%22+%22Base+Set+Shadowless%22+%223%22&hash=item457668b6cb:g:Ts8AAeSwe69qDvye"
        },
        {
          "title": "Chansey 3/102 Base Set (Shadowless) Holo Rare Pokemon Card",
          "total_ask_price": 29.99,
          "url": "https://www.ebay.com/itm/227384274855?_skw=Pokemon+%22Chansey%22+%22Base+Set+Shadowless%22+%223%22&hash=item34f128afa7:g:x-gAAeSwY5FqKy9K"
        },
        {
          "title": "Chansey 3/102 Shadowless Base Set Holo Rare WOTC 1999 Pokemon HP",
          "total_ask_price": 40,
          "url": "https://www.ebay.com/itm/366133403645?_skw=Pokemon+%22Chansey%22+3&hash=item553f405ffd:g:IkkAAeSwyo1pbGPS&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZJaQnFmRcmlKj4BPBD05L3T%2BBKFapFHkIN%2BkyaY1BIBeRmukDtOHLeP6a3sCd1c20D%2BfptPxT28Y9ZCZFFzNlnfBOJ8sdOl7ryOws7FXmO703r2ZgXFYt9kk4p%2B1smfdkUhxUbdLr8QHY%2FKkQcQSh93EkJvB73ceYGBbT3GuVaiwW4XFNmyu%2FPBVoEltadc5qe2miNp0ywjsv7hWzoNcOOapy%2BGWXc8T%2FihvKmFyKeW7cp4S4JvLeg2WCuh9kdpC7leyuj%2FHW6dcNxNxwJ%2BtHKqQlXBXt8HiyZ3MaKv3mSNA%3D%3D"
        },
        {
          "title": "Chansey 3/102 Holo Holo Rare Base Set Shadowless Pokemon 1st Edition Holo HP",
          "total_ask_price": 40.99,
          "url": "https://www.ebay.com/itm/358715151760?_skw=Pokemon+%22Chansey%22+%22Base+Set+Shadowless%22+%223%22&hash=item538516d590:g:1CUAAeSwGqVqOxzu"
        },
        {
          "title": "Chansey 3/102 Holo Rare Base Set Shadowless Pokemon Card",
          "total_ask_price": 49.99,
          "url": "https://www.ebay.com/itm/407022128246?_skw=Pokemon+%22Chansey%22+%22Base+Set+Shadowless%22+%223%22&hash=item5ec468cc76:g:KtwAAeSwj-dqOq0N"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-4-SHADOWLESS",
      "card_print_id": "49cbaa7c-af8c-4111-8a8e-f479a10cf90e",
      "evidence_class": "raw_single",
      "listing_count": 16,
      "seller_count": 16,
      "median_active_ask": 1124.97,
      "minimum_active_ask": 160,
      "maximum_active_ask": 29225.06,
      "strict_sample_count": 16,
      "strict_pass_count": 13,
      "strict_pass_ratio": 0.813,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 3,
        "base_lane_missing_base_set": 1
      },
      "sample_failures": [
        {
          "title": "Charizard 4/102 Base Set Holo Rare Holo ENG 1999 120 HP Pokemon TCG",
          "total_ask_price": 160,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147377404035?_skw=Pokemon+%22Charizard%22+4&hash=item225060b883:g:RokAAeSwonJqMNbW&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGb77mdbZelu9mDCO1erm%2F78%2FhumMv%2FkNNh%2FaA%2BB5UOPPpjgnY%2Bmts382ISmcnw99m1EpuCVy%2B%2FAqE6TiZEvXHswXeC%2Bn1JQ0zANQ43l2zHaATSf7vx5tN5bZLN%2FRLHeyOVRxfx4Y%2FfDg4o8eo1u9PF8765s5EPXAEFagtLnQCb4aviHVLrxeKV6eaIzVzOO%2FveAgf%2FjT84PxzCxibhpkkKwIeVr2nP1Hv3XaeD4Sm3SJ8X92Rl04VqyrYKGva2qdoBXTB0%2F8znhyl%2Bcg6CVr5sPBBQ7iuOa4aZpwoJZnJbY3Q%3D%3D"
        },
        {
          "title": "Pokemon TCG Dark Charizard 4/82 Team Rocket Holo Rare Unlimited English 80HP",
          "total_ask_price": 260,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/366503954602?_skw=Pokemon+%22Charizard%22+4&hash=item55555688aa:g:3MYAAeSwsJZqPat0&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGanqiinMm36%2BwbnylG3Vv%2BLrjC%2Fg5Z3gUDuqjZyWmyiR8PMHfuh%2FxchFBFAgaKrDCyUFjIr21iB3W2Ue925IZrdlINrUyBSI6MKvKCZ5DDcEGzyc6Iq7cRWxQvKzrQBUNpv4eXMPa7gVacY45BD6jnQ%2B5oRSMliY1ttd7F36DspdjhCZMDhqkKgJcyfKhLCJjlT1HRCuyr4HZt6KXWLv52EiFHOhCu6cFgN%2FOqS2BtLsBL52QiPWUYZDJWfi5G9ekxa0Td%2FLl5jSHTHphTXLJ3TvV5lRkFfMM0WVuglt99QAA%3D%3D"
        },
        {
          "title": "Pokemon Charizard 4/102 Holo Holo Rare Base Set Unlimited Pokemon Lightly Played",
          "total_ask_price": 575,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/336607593798?_skw=Pokemon+%22Charizard%22+4&hash=item4e5f604546:g:q~4AAeSwf3xqGL-U&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZUNBas68NjBZIPqKt%2Ft3JscMAFd%2FJ%2F4q7C0npCz6rHNjnmEUl3DPhBW%2BrE8EaA%2F1fnd89oWovu%2B5gwac3MQZ2kEjtY9QLZmEKAkaMMaHrLjEO4jJ7P8gqvcg%2Fp8c91WQdCyRwkMconWaYoiOy%2B%2B6u8Hnd4w3oBQa%2BQIbbGuAAo03pslThLJTcpMkPqkhC6baV6PM1%2BHEhOffohpQOJhhEbFoim7GXRby4Z0WlL%2FI59UdKZocgCPvBQtuq5FfxXZSsTsPtzQHACYOmlJ%2Fo2YaPfY3CPPcv6dHNR9qa3%2Bl252g%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Wizards 1999 Pokemon Base Set Shadowless Holo Charizard 4/102 120 HP",
          "total_ask_price": 266.25,
          "url": "https://www.ebay.com/itm/406931588101?_skw=Pokemon+%22Charizard%22+%22Base+Set+Shadowless%22+%224%22&hash=item5ebf034405:g:jmsAAeSwcWdqCQOw&amdata=enc%3AAQALAAABEACCtXRWQnOEpyOqnQQ8KGaBlxwr8atAyt5d2Lt13m2S9WxtBIiLLWQ9s2uBucFmetyrn0EXAL05FgchqVI1DwQsnJ3cXl5ofNt%2BrXT6kYFESgmpl2z5CtC035xiVa%2FtXibgYnOAMkEdfMay7udogN2ccpSy5NftPTP2eNqoxB5SwUAfhBPh258r5%2FrzCeVMbu2IAgFT8Y8k6lWDO1j5Saj5W%2BhmKPyeeN9x5sOepl3Y5PYXeG1%2FMP8CIHT4v%2FCSMn2sWzI6SCRdgIkMTT7IpwOzvwsoTAZEXWxvRtmVr9mhlkjICIgRpPfirv9rsuejMC3vzUDnQz8LwYsDK1R4dxZ4Fioswqx6jKTFewPxaZAT"
        },
        {
          "title": "CHARIZARD POKEMON BASE SET SHADOWLESS #4/102 HOLO RARE 1999",
          "total_ask_price": 722.2199999999999,
          "url": "https://www.ebay.com/itm/800238171008?_skw=Pokemon+%22Charizard%22+%22Base+Set+Shadowless%22+%224%22&hash=itemba51e97380:g:MxIAAeSw7V9qPBhF"
        },
        {
          "title": "Charizard - 4/102 Base Set Shadowless Holo Rare Pokemon - HP/DMG",
          "total_ask_price": 750,
          "url": "https://www.ebay.com/itm/336624346208?_skw=Pokemon+%22Charizard%22+%22Base+Set+Shadowless%22+%224%22&hash=item4e605fe460:g:-XUAAeSwI7FqJGRr"
        },
        {
          "title": "1999 Pokemon Charizard Holo Rare Base Set Shadowless 4/102 HP/DMG",
          "total_ask_price": 1088.94,
          "url": "https://www.ebay.com/itm/158017981591?_skw=Pokemon+%22Charizard%22+%22Base+Set+Shadowless%22+%224%22&hash=item24ca9b0c97:g:NVEAAeSwvqtqOYmy"
        },
        {
          "title": "Charizard 4/102 Base Set Shadowless Pokemon Unlimited Holo HP Mitsuhiro Arita",
          "total_ask_price": 1099.95,
          "url": "https://www.ebay.com/itm/306999106128?_skw=Pokemon+%22Charizard%22+%22Base+Set+Shadowless%22+%224%22&hash=item477a929a50:g:MT4AAeSw9JNqLLsj&amdata=enc%3AAQALAAABEACCtXRWQnOEpyOqnQQ8KGZp2zTtcdl1Du9hVQ6WWCHF4gQo7FD3nW1ZYhUuHQ%2Fh1a%2BhPKp%2BK5Mu8aUptEW3eU%2FuIGkaarUGOgLx44Tv3VQwnnN4BEiFzvlos3N7BLoNz5EMoJR9ac%2FXzHE6myEeBPIef3Orj004Z%2Fosdblyj%2Bg41viErcNo1s1OIHnDgPrjPzfuiIViWwLImv%2BrKa8VIPNc3iZonQ0F6rICYB9UhSvFemSOEITj4EXqD3XXuAPi1i7dU7CafjCwZ7%2BlHMIrSUnPEQRW4%2BLo%2FATcOsdLY2dlq42ATpfBCiOOU587Rg26J%2FpGkKxvSWp9KVfyxRTBsr1A5mhfRUb3bBl2gPJ9vu27"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-5-SHADOWLESS",
      "card_print_id": "b8e59317-4a43-4390-8628-d159515ca94c",
      "evidence_class": "raw_single",
      "listing_count": 35,
      "seller_count": 34,
      "median_active_ask": 70,
      "minimum_active_ask": 19.99,
      "maximum_active_ask": 467.18,
      "strict_sample_count": 25,
      "strict_pass_count": 17,
      "strict_pass_ratio": 0.68,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 8,
        "base_lane_missing_base_set": 1
      },
      "sample_failures": [
        {
          "title": "Clefairy - 5/102 - Pokemon Base Set Unlimited Holo Rare Card WOTC LP",
          "total_ask_price": 19.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/286501527615?_skw=Pokemon+%22Clefairy%22+5&hash=item42b4d2603f:g:o68AAeSwNOxoAWu8"
        },
        {
          "title": "MP Clefairy 5/102 Holo Rare Base Set Unlimited Pokemon Ken Sugimori",
          "total_ask_price": 19.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/277995421123?_skw=Pokemon+%22Clefairy%22+5&hash=item40b9d17dc3:g:acgAAeSw7cFqCW9J&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZvoytwKGUUCHYhW8et2ca%2BDJ%2B1pA7pg5wKvahWIoQQuvCxvMFWZV8dOB7fbHE4S7BMbPtvjQ1eiV0Y535%2F7oEp3ABI091HJB5gqisR4c4dc15YTTHse3JWYMfQvUzdUNT7Q9dAAIVceiF67cCmDHWQvPrWgM52MIR6clDr4p9W6wgS39Ppt7VdJvq6aHpMVwzI%2FfTKjvqRtfIpU9a84X7NMUeXTMupAEruvI2t6iMQ3Kuq0MLQw5veWbeTFm1RGpWeJn9wXuI%2FcVPlscyPnbYeubg%2F6X9Qh6MbU7aiuJoGHg%3D%3D"
        },
        {
          "title": "1999 Pokemon CLEFAIRY 5/102 Base Set Rare Holo",
          "total_ask_price": 20,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/296877262862?_skw=Pokemon+%22Clefairy%22+5&hash=item451f43880e:g:F6AAAOSwRQ5nW2Ko&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGas5HyT0QJLI5ngQN4Gi63tZAyyCQq2VUs9G6fO7rbOuscCvRd7Yfae5nXtz7%2BN3JrcGeShj5rpJ%2B%2FeM2jBfFi0gRpn2xbn5XD4v5lQBGFpRwBlRE4OLsZExZOpYppi7ULCb--HtB0iPXAv4oeuMJxkIsvLgrPrDfFP0TELfGdbbChclr05tmB6Napfnt%2Fo4yDCf7Mhr8igK%2Bvy5lNMrgtXkBpuIReuazf0Zeq3mBDszi%2FbgT34bzzGyJKy4W77sWBExYL8rwSD4JtgYSr9DL0lFT%2FBJg8xQqNG89M0B0oRqA%3D%3D"
        },
        {
          "title": "Wizards of the Coast Pokemon TCG Clefairy Base Set 1999 EN Holo Rare #5 40HP",
          "total_ask_price": 25,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/137446872865?_skw=Pokemon+%22Clefairy%22+5&hash=item200078d721:g:orsAAeSwKNZqOvwh&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGaUGpcby0ipdV7fNYh6pBNg3Y7UojWKoYAPfSvKBKkuyPMZzQclzWKo2p1ZH5cAGBKhXntk5nppVNUqfxbreXdUNzoU5Mu2nDqNLuh79CGVIvMrsGA2%2FrVDwyek%2FIcHjidS8ThubXxyiXGE208hFy81%2FsgAQAkifesV71Oc7C0xNi9Zg0ra7YMe5NoMmrwtqSzIsbpiDwZ%2FnorBFU7AsMDk5l%2BSt%2FptjWrKLyoh9sKfG5dTeJo48yicFM62E%2FrZYzTczmQfSse3DGs6tlEXNe5G0ECCbseyelzwKL9SybCE6g%3D%3D"
        },
        {
          "title": "Pokemon Clefairy 5/102 Holo Holo Rare Base Set Unlimited Pokemon Lightly Played",
          "total_ask_price": 32,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/336607221623?_skw=Pokemon+%22Clefairy%22+5&hash=item4e5f5a9777:g:gycAAeSw2HBqGG6B"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon Card - Clefairy - Base Set (Shadowless) 5/102 Holo MP",
          "total_ask_price": 34.99,
          "url": "https://www.ebay.com/itm/366268797489?_skw=Pokemon+%22Clefairy%22+%22Base+Set+Shadowless%22+%225%22&hash=item5547525231:g:erwAAOSwCSFneEAr"
        },
        {
          "title": "Clefairy 5/102 Holo Rare Base Set Shadowless Pokemon Unlimited HP",
          "total_ask_price": 38.99,
          "url": "https://www.ebay.com/itm/188520170109?_skw=Pokemon+%22Clefairy%22+%22Base+Set+Shadowless%22+%225%22&hash=item2be4ad827d:g:7TIAAeSwiXBqMWjX"
        },
        {
          "title": "1999 Pokemon Base Set: Shadowless Holo Rare Clefairy 5/102 - HP - Vintage WOTC",
          "total_ask_price": 39.95,
          "url": "https://www.ebay.com/itm/227388660775?_skw=Pokemon+%22Clefairy%22+%22Base+Set+Shadowless%22+%225%22&hash=item34f16b9c27:g:SyQAAeSwag5qL1hp"
        },
        {
          "title": "Clefairy 5/102 Base Set (Shadowless) Holo Vintage Pokemon WOTC",
          "total_ask_price": 40,
          "url": "https://www.ebay.com/itm/366424091482?_skw=Pokemon+%22Clefairy%22+%22Base+Set+Shadowless%22+%225%22&hash=item555093eb5a:g:DJsAAeSwzJ1qDvY1"
        },
        {
          "title": "1999 Pokemon TCG Clefairy Base Set Shadowless Holo Rare 5/102 Vintage",
          "total_ask_price": 44.99,
          "url": "https://www.ebay.com/itm/257579490603?_skw=Pokemon+%22Clefairy%22+%22Base+Set+Shadowless%22+%225%22&hash=item3bf8ef1d2b:g:GxcAAeSwsaxpzB44"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-7-SHADOWLESS",
      "card_print_id": "d06b9b45-1703-4d21-8737-9de5715f32f6",
      "evidence_class": "raw_single",
      "listing_count": 55,
      "seller_count": 45,
      "median_active_ask": 38.62,
      "minimum_active_ask": 8.99,
      "maximum_active_ask": 899.99,
      "strict_sample_count": 25,
      "strict_pass_count": 20,
      "strict_pass_ratio": 0.8,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 5,
        "base_lane_missing_base_set": 1
      },
      "sample_failures": [
        {
          "title": "Hitmonchan 7/102 Holo Holo Rare Base Set Unlimited HP Condition Pokemon TCG Card",
          "total_ask_price": 8.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/168427891925?_skw=Pokemon+%22Hitmonchan%22+7&hash=item273715acd5:g:6tAAAeSwvBxqIG5U&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYe6Iq5ThIpHHkqxurBgwlfFxfWcgS8Zahk%2F%2BsBqaepxZNrtWgI8C0nuR0PYHbsgIgl0R3ynZmZ%2Bc%2B0Y6rdMD1PDbfsxBOC%2BYlyZV0UA2YFvZaRsNgoQCWWMd9x02IzvDfOxnJbXJF%2BkwtwY6hciFJCRp4TV8m5ETnIZ64cTUIdNeaBh1GxLYbs0E%2FjbghDZlllTtin7PbYprCY86Wf7QVcpT3mst7%2Fpv8GiahwTkVvCFMBAM54t6o6ygbNpQUHbb7KMmfBKFdbyEgWB2HYznIESNFva%2BWsl7dAQX8Snt0qGQ%3D%3D"
        },
        {
          "title": "Pokemon Hitmonchan 7",
          "total_ask_price": 10,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/377248631873?_skw=Pokemon+%22Hitmonchan%22+7&hash=item57d5c54c41:g:yf0AAeSwr75p2A7k&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGbGaZS2arG2GgEh0gs8Zolx8wly1VtkYBtM1f6EUQSqmmwtkxuUiHVa42vLguthhHTbeQgPZrkIHvifntcq3PMueg%2Fm%2BXW0QGRzJUyrk1EfwPG4fJAorz6YEg9zUy4%2F5p4GhsrFqCaHbUNHUA5Mj7%2BRcG1QPtLqAjQHq7NQOJVoXX3z9XNPgVzA3l8Rlf75usbthLXJhAE9VDG1jiQZLUI6LRxf6S1HZdQ5LxMXoQB2kwugKCo0OOD3eWzfG9UHBWMV3fx1QCl5FKTw7hzheeZkSNUl3R5Sa%2FDsB7%2F0lE8Yfg%3D%3D"
        },
        {
          "title": "Hitmonchan 7/102 Base Set  Rare Holo Pokemon Card WOTC DMG",
          "total_ask_price": 11.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/358707607814?_skw=Pokemon+%22Hitmonchan%22+7&hash=item5384a3b906:g:UJMAAeSwvnVqOIPk&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZX5fmL1hICCDPRqjy9Zuokv7XCskhr0HHj%2B8LP19T9Wvr75EHN76ptRoJWhPMKlaikZnswDugq2T%2FMZHccOu6nzZb5ZyqFQxy14objqAQYKECjg2Yyo0ia5146S%2BsL5VoBI%2BvGKXfYWjaoVIAO2Ij6rWQwXVYVLEtbDldqcScQsrd3%2Bpii43WcaFzYcP578pPsq%2BckR1GpS%2BYBkWLSMMIN%2FNnMMsPOVUGqnRUrCECBcIcJzKUp7zh05rdm%2BC3Zg%2B5smaOUwxJv9UYs8bf08lZQILl%2BBOKbb3aJygRsS%2Bn8VA%3D%3D"
        },
        {
          "title": "Hitmonchan 7/102 Base Set Rare Holo Pokemon Card Vintage WOTC Wizards",
          "total_ask_price": 15.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/157900220877?_skw=Pokemon+%22Hitmonchan%22+7&hash=item24c39629cd:g:-KAAAeSwehlpSINJ"
        },
        {
          "title": "Hitmonchan - 7/102 Holo Rare Base Set Unlimited Pokemon - 🔥  LP+ 🔥",
          "total_ask_price": 17.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/318275759552?_skw=Pokemon+%22Hitmonchan%22+7&hash=item4a1ab6adc0:g:naYAAeSw-8pp~137&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZ7KCKpTxTfRNkiZnB0Tg1uqjKGS1eXCT4wrW13GGs902j4h%2BdEgaAS4Sb8YKMy%2FddFNSdnVAukrLaOGX1oMVoZqQFQfWPhbteDyX7Li11EdD12VYBPPbYgxeqr8S%2BVzWKg97w%2BSXoq2M1mcT8zoHG22N9dYjPF90J8XEUMY7cDPsK0HCnzdWgJGWTbU9wLtSwfX9CLKhvEND2TRkHiYCTG6cUz4eQveBP6h6DrTYUissKUwvKZ6eHsBtq%2F4nUsR%2F7s2K%2FLOdiCd3ex19A%2BMZYK1oKc%2BKwic4ViKRyPCeHOZQ%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Hitmonchan 7/102 Base Set Shadowless Rare Holo Pokemon Card WOTC DMG",
          "total_ask_price": 12.64,
          "url": "https://www.ebay.com/itm/297607459174?_skw=Pokemon+%22Hitmonchan%22+%22Base+Set+Shadowless%22+%227%22&hash=item454ac97166:g:SyUAAOSwcjFm0ks3"
        },
        {
          "title": "Hitmonchan 7/102 Holo Holo Rare Base Set Shadowless Pokemon 1st Edition Holo HP",
          "total_ask_price": 17.99,
          "url": "https://www.ebay.com/itm/358715151836?_skw=Pokemon+%22Hitmonchan%22+%22Base+Set+Shadowless%22+%227%22&hash=item538516d5dc:g:tVwAAeSwH5NqOxz2"
        },
        {
          "title": "Pokemon Base Set Shadowless Hitmonchan 7/102 - Moderate Play MP ",
          "total_ask_price": 17.99,
          "url": "https://www.ebay.com/itm/124914219941?_skw=Pokemon+%22Hitmonchan%22+%22Base+Set+Shadowless%22+%227%22&hash=item1d1577bba5:g:0a0AAOSwaoJhSzrr"
        },
        {
          "title": "Hitmonchan 7/102 Base Set Shadowless Holo Rare Vintage Pokemon TCG Card",
          "total_ask_price": 19.99,
          "url": "https://www.ebay.com/itm/135096056966?_skw=Pokemon+%22Hitmonchan%22+%22Base+Set+Shadowless%22+%227%22&hash=item1f745a3c86:g:HakAAOSwzZtmZPEv"
        },
        {
          "title": "Hitmonchan 7/102 Holo Rare Base Set Shadowless Pokemon Unlimited HP",
          "total_ask_price": 19.99,
          "url": "https://www.ebay.com/itm/298437454547?_skw=Pokemon+%22Hitmonchan%22+%22Base+Set+Shadowless%22+%227%22&hash=item457c422ad3:g:rCEAAeSwXQNqN6pA"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-8-FIRST-EDITION",
      "card_print_id": "4189d20b-e178-4515-975e-5677472171f5",
      "evidence_class": "raw_single",
      "listing_count": 85,
      "seller_count": 79,
      "median_active_ask": 22.47,
      "minimum_active_ask": 7.99,
      "maximum_active_ask": 625,
      "strict_sample_count": 25,
      "strict_pass_count": 20,
      "strict_pass_ratio": 0.8,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "base_lane_missing_base_set": 4,
        "first_edition_lane_missing_title_token": 3
      },
      "sample_failures": [
        {
          "title": "Pokemon Card - Machamp Deck Exclusives 8/102 Holo Rare Holo Heavily Played",
          "total_ask_price": 11.99,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287386448051?_skw=Pokemon+%22Machamp%22+8&hash=item42e99130b3:g:EewAAeSwkpNqKY1F"
        },
        {
          "title": "Machamp 8/102 Holo Holo Rare Deck Exclusives Pokemon 1st Edition Holo MP",
          "total_ask_price": 14,
          "reasons": [
            "base_lane_missing_base_set"
          ],
          "url": "https://www.ebay.com/itm/168464900786?_skw=Pokemon+%22Machamp%22+8&hash=item27394a62b2:g:mucAAeSwt81qMZUY"
        },
        {
          "title": "Pokemon Card - Machamp Deck Exclusives 8/102 Holo Rare Holo Moderately Played",
          "total_ask_price": 14.99,
          "reasons": [
            "base_lane_missing_base_set",
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287386419278?_skw=Pokemon+%22Machamp%22+8&hash=item42e990c04e:g:nxoAAeSwuTRqKYqt"
        },
        {
          "title": "Machamp [1999-2000] #8 Pokemon Base Set",
          "total_ask_price": 15,
          "reasons": [
            "first_edition_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/358183516226?_skw=Pokemon+%22Machamp%22+8&hash=item536566b842:g:E4kAAeSwRUxpgW8u&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYgYMRqt%2Fb20cKQVJU1uDkKK4IYudwJflVYvS0gdK3n2feUMUPdsl5f4o8p7aZKhpOlgD2CDk63TcOK8T3DfwpdrX8NgaHrauwqpFo9E1ZvFu6nfwSjJeqij0dfLplf8547m6jDp%2B3PlTdy5G6VouqRzwYzEJN91S5XBvpYd34qKSWdD2eKVyd%2B7wUgQxMbf3tCnIJdRb58UH%2BOBcw2KVHt%2B4DKWu7dZnVtRxjOQoFNuzwOBiy1%2F3qcylp0OJaPnBEs2t5vFacHBV9dQgDiuhzdlSSPRbb2yIKgQZlDjS9SQg%3D%3D"
        },
        {
          "title": "Machamp Pokemon8/102 #68 1st edition Rare 🔥 🔥",
          "total_ask_price": 15,
          "reasons": [
            "base_lane_missing_base_set"
          ],
          "url": "https://www.ebay.com/itm/147396473611?_skw=Pokemon+%22Machamp%22+8&hash=item225183b30b:g:xAQAAeSw7vNqL263&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYjyqn4n9px%2BuOTPCVmFj0sVNdw6EOzW6JJXh5tdxp0gptWxk7qJhevZT66vCPzxXZSAoE3pF%2FDqPO7JNyOglF2IOJoxnJIeWXxts0dwkLyMwYQaXHWPFPxqDByD0VMnlmxe4IlQjEYLT8faWdWVRVAvJD6RrBG7srmNT%2FLfBNf1YOw%2FwdcOEVWB8ZW5o2I29OhbQ6oc0IJDohTK8FbAXX7wGHbko2dr2KuvqA2dgwbtXW5VMO7l%2BXZWlLwVLAk7nKrbuzBzfR1CT2W4RfzSQQYv1n0V2lxOgZFNhJb7ESEvA%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Machamp 8/102 Base Set 1st Edition Holo Rare Pokemon Card",
          "total_ask_price": 7.99,
          "url": "https://www.ebay.com/itm/227070634639?_skw=Pokemon+%22Machamp%22+%22Base+Set+1st+Edition%22+%228%22&hash=item34de76ea8f:g:wi8AAeSwkMZpE4j-"
        },
        {
          "title": "Pokemon Card - Machamp Base Set 1st Edition 8/102 Holo Rare Scratched See Photos",
          "total_ask_price": 9,
          "url": "https://www.ebay.com/itm/126944064969?_skw=Pokemon+%22Machamp%22+%22Base+Set+1st+Edition%22+%228%22&hash=item1d8e74b5c9:g:vXEAAeSwU-RnsSz~"
        },
        {
          "title": "Pokemon Base Set 1st Edition Machamp Holo 8/102 HP",
          "total_ask_price": 9.99,
          "url": "https://www.ebay.com/itm/167624461980?_skw=Pokemon+%22Machamp%22+%22Base+Set+1st+Edition%22+%228%22&hash=item2707324e9c:g:Ag8AAeSwXOZoZe9Y"
        },
        {
          "title": "Pokemon MACHAMP 8/102 - 1st Edition Base Set - RARE HOLO - DAMAGED - WARPAGE",
          "total_ask_price": 10.3,
          "url": "https://www.ebay.com/itm/206344839740?_skw=Pokemon+%22Machamp%22+8&hash=item300b1c623c:g:cBIAAeSweM5qLc22"
        },
        {
          "title": "Vintage Pokemon TCG - Base Set - 1st Edition Machamp 8/102 Holo: MP",
          "total_ask_price": 10.53,
          "url": "https://www.ebay.com/itm/206339910597?_skw=Pokemon+%22Machamp%22+%22Base+Set+1st+Edition%22+%228%22&hash=item300ad12bc5:g:p94AAeSwlQtqKyFb"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-8-SHADOWLESS",
      "card_print_id": "e35ec334-bebf-4580-a9fe-05cf440b1aab",
      "evidence_class": "raw_single",
      "listing_count": 36,
      "seller_count": 27,
      "median_active_ask": 66.74,
      "minimum_active_ask": 15,
      "maximum_active_ask": 625,
      "strict_sample_count": 25,
      "strict_pass_count": 19,
      "strict_pass_ratio": 0.76,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "shadowless_lane_missing_title_token": 6,
        "base_lane_missing_base_set": 3
      },
      "sample_failures": [
        {
          "title": "Machamp [1999-2000] #8 Pokemon Base Set",
          "total_ask_price": 15,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/358183516226?_skw=Pokemon+%22Machamp%22+8&hash=item536566b842:g:E4kAAeSwRUxpgW8u&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYgYMRqt%2Fb20cKQVJU1uDkKK4IYudwJflVYvS0gdK3n2feUMUPdsl5f4o8p7aZKhpOlgD2CDk63TcOK8T3DfwpdrX8NgaHrauwqpFo9E1ZvFu6nfwSjJeqij0dfLplf855Y9fIg08TaGs1d6oCKNA94FNLMPr7fXu6ZxzCKWM4ymAAgUy0V7e9SO53cAgb9W%2F2JrOOCHW00PJTjN0L0LIfc%2BphSDRWgfIln94C38S7KwcRhQ6eAd08jpXWaKv1%2FoqRUw7fB9Kl5JCUdT7Vk4VQzeV4wWDOYJdA0LVk6sKu%2FZw%3D%3D"
        },
        {
          "title": "Machamp Pokemon8/102 #68 1st edition Rare 🔥 🔥",
          "total_ask_price": 15,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147396473611?_skw=Pokemon+%22Machamp%22+8&hash=item225183b30b:g:xAQAAeSw7vNqL263&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYjyqn4n9px%2BuOTPCVmFj0sVNdw6EOzW6JJXh5tdxp0gptWxk7qJhevZT66vCPzxXZSAoE3pF%2FDqPO7JNyOglF2IOJoxnJIeWXxts0dwkLyMwYQaXHWPFPxqDByD0VMnll5q4YQVub8gQqyFuqd3X2gRSaZu%2FZ2j70W8Jc2dpFLshQy2n6HbNLWkhxVhYrs%2FMa113cKUY18%2Fb%2FcU0Zk9hkJGPgpyjrSFJ%2FdVGmKqX1Mt3nJSJllLYG45CdBcVLVjupJjJnXvgt%2BMBMJ0xf3RYd2iwqn99aYzKRs5JrOYQ2xpQ%3D%3D"
        },
        {
          "title": "Pokemon TCG Machamp 8/102 Deck Exclusives 1st Edition LP",
          "total_ask_price": 20,
          "reasons": [
            "base_lane_missing_base_set",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/287303299178?_skw=Pokemon+%22Machamp%22+8&hash=item42e49c706a:g:bEIAAeSwyMZp82Md&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZzylFY2zykqy3xGqULBnbB9u9SN10tTMzSaLZnbhZG36lr7FPwLwJQ48pxOriye7VCWy5MTTNll0WZ4nB4xnfgPP732Hzy8z1JghkHCt0C1kTiPk%2BK96AkG195QUnVIMeutEZpFsMzAUWSykVZK22%2FuFVnXPk5tQ5h6%2B2WNrUHWt8uNUL0Pj8LGjc0wuANJLzDFfbcRYRwAKbeolPN75HE%2FyJGQBt%2BvJmWzT08Fi4hnE1j%2BCsTan6%2B4fPHg3QZdfMRmqJwwDeBbx%2FGvnamloVT%2Fpdc2hX0pveXw4fLAcyl1A%3D%3D"
        },
        {
          "title": "Pokemon Base Set Unlimited Machamp #8 1st Edition Thin \"1\" Stamp Holo Grade 6",
          "total_ask_price": 21,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/206320137984?_skw=Pokemon+%22Machamp%22+8&hash=item3009a37700:g:8aYAAeSwmD5qIKB8&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGaJIGesSaO%2FFCGvyYK3gE%2BycieYWrTqFv0EkzGWE3uEP5hYWW0YEPwY7GeHchCF24chIEwEeLglN6C7nTGwB9LigGNPZaAXnhajaTCpdUFR9U5WM95QL4dw7X87T3MV32c3Xwpcats4H3gN9sV%2BFX1o%2FmmMzqOFVNPHYeV%2FCWfk%2FTDHcHF4VLV85819VQfwe9rME%2FhsMqc4PgLNgCGJH%2F0Nzy75YVN8rfuug61Aubjt1jpo4knZzw7Az%2BZQ2S054HSaH5kOA%2BnU3DkIsd41e5SmQV26i1iFMhOnUeTte7a8Pw%3D%3D"
        },
        {
          "title": "Pokemon 1999 Machamp 8/102 Base Set 1st Edition Holo",
          "total_ask_price": 54.980000000000004,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/336545517897?_skw=Pokemon+%22Machamp%22+8&hash=item4e5bad1149:g:kz4AAeSw5spqAjRI&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYpDPZ92uLgkf1eURMnl50b2OtC%2F2Cbx5%2Fq5NLu2TyYc2XeKVlFDxf%2F0YuJZDLzdgiiYAg6hOaiAI5UZxf7SfkEeXoPDMsrMz19l78EVKYnrl0NCRF5BuXHwqagZ%2FCpCYn1xSaNnltd5jmNlLWZo5yje4RY%2BXz%2BymqS%2FvqnmiF2Q9w6Nxyx%2Fbl9Co%2BRXN7rTFv87DKSrM6DfZcLoQgmQITLnyEGtifypNvyJfe4Wl76UENE6lxDcbw33G1NeVQM4d6kpLYIUErjHwdb%2ByNezK%2BSYLLZpGSbbhKCo%2B1Ew4dXhw%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Machamp - 8/102 (Base Set Shadowless) - DEEX 008 Pokemon - Damaged / Poor",
          "total_ask_price": 19.78,
          "url": "https://www.ebay.com/itm/267707649312?_skw=Pokemon+%22Machamp%22+%22Base+Set+Shadowless%22+%228%22&hash=item3e549e8d20:g:uoEAAeSwQkNqPQ0u"
        },
        {
          "title": "Machamp (Base Set Shadowless) 8/102 Deck Exclusives Pokemon 1st Edition Holo DMG",
          "total_ask_price": 28.229999999999997,
          "url": "https://www.ebay.com/itm/358614822534?_skw=Pokemon+%22Machamp%22+%22Base+Set+Shadowless%22+%228%22&hash=item537f1bee86:g:6fYAAeSwZXlqGdxT"
        },
        {
          "title": "Pokemon Machamp 8/102 Base Set Shadowless 1st Edition",
          "total_ask_price": 39.99,
          "url": "https://www.ebay.com/itm/286014406683?_skw=Pokemon+%22Machamp%22+%22Base+Set+Shadowless%22+%228%22&hash=item4297c9801b:g:66MAAeSwFFRn~QVS"
        },
        {
          "title": "POKEMON MACHAMP 8/102 HOLO RARE SHADOWLESS 1ST EDITION BASE SET HP-DMG",
          "total_ask_price": 39.99,
          "url": "https://www.ebay.com/itm/336608792630?_skw=Pokemon+%22Machamp%22+8&hash=item4e5f729036:g:blAAAeSwlMZqGZd3&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGYeN8V4Xuga6fElsN9d7AMJCufS6wFRNrES9zJrtXAaKdaoi8lVInc8kBgoTIy0Im%2BZLCY%2B5fvCgGNkJsWCmXTKNxOMtfoIM0u9MOLFLE2OJph39f5d1KGYP6AImoiGbB0k6QvPU%2BQQ0rpLSNkzQI9TjOvRfyEyCukuJLeEyo%2FaL9bJ8uOvBTq%2FRZ%2BHLx4scih6tqsyMKCi23Or%2FbhLjJ8VPyo1bCPS8C00zCXCtZ24u97YuXPiEM7syMPQ5TVEC0hW5Ij57lZkWWxelgyKpVqLk2wA0qJbOeidOQ44nX7cBA%3D%3D"
        },
        {
          "title": "Machamp - 1st Ed - Base Set Shadowless 8/102 - Holo Rare TCG - Pokemon Card - HP",
          "total_ask_price": 40,
          "url": "https://www.ebay.com/itm/134424998010?_skw=Pokemon+%22Machamp%22+%22Base+Set+Shadowless%22+%228%22&hash=item1f4c5ab07a:g:vXkAAOSwGqZj0bTQ"
        }
      ]
    },
    {
      "gv_id": "GV-PK-BASE1-9-SHADOWLESS",
      "card_print_id": "848e772a-bed3-4aa6-8da1-101f4c9e649b",
      "evidence_class": "raw_single",
      "listing_count": 26,
      "seller_count": 24,
      "median_active_ask": 54.98,
      "minimum_active_ask": 11.11,
      "maximum_active_ask": 144.82,
      "strict_sample_count": 25,
      "strict_pass_count": 15,
      "strict_pass_ratio": 0.6,
      "strict_review_bucket": "strict_title_review_ready",
      "strict_reason_counts": {
        "base_lane_has_base_set_2_noise": 3,
        "shadowless_lane_missing_title_token": 10
      },
      "sample_failures": [
        {
          "title": "Magneton 9/130 Holo Rare Base Set 2 Pokemon Holo Heavily Played",
          "total_ask_price": 11.11,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/206325906704?_skw=Pokemon+%22Magneton%22+9&hash=item3009fb7d10:g:MskAAeSwE~dqI8Nf"
        },
        {
          "title": "Magneton 9/102 Base Set Holo Rare Pokemon Card 1999 Wizards WOTC Stage 1",
          "total_ask_price": 11.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/188498993462?_skw=Pokemon+%22Magneton%22+9&hash=item2be36a6136:g:FRoAAeSwG11qN0dL&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGaXc%2B%2FAlOII5AnCcE9Ww%2FG6l8onREUFy99M%2BkvZC9cro4MmHE%2FH6QjgJGGkg3N3xbIQ9HmqQxJ8QK%2FIqB%2BrNFVsK2K9wFW7XekIcAun32tPiVCY%2F4%2BOe2vF4UUqJYLF93%2Be0Lc3badiJJ0A6RwmnY3KAKxxOR1UWSmpMPDZ8MzNQxdllBcROjYSnYkz4kDe9DKRp0Y4u3FdCwM0sMtrUKBpGJLlPKpuKnfrRf7jdv0cTjZxZKpsunpWliFSrYoRKw2Pafq98xGialS1p59%2FhE3wC3OLJgLU%2FW2Xq9lWMuAO8w%3D%3D"
        },
        {
          "title": "Magneton 9/130 Base Set 2 MP Pokemon Card",
          "total_ask_price": 12.49,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/117233302081?_skw=Pokemon+%22Magneton%22+9&hash=item1b4ba63a41:g:T6kAAeSwnmZqIxQ8"
        },
        {
          "title": "Magneton 9/130 Base Set 2 MP Pokemon Card",
          "total_ask_price": 12.49,
          "reasons": [
            "base_lane_has_base_set_2_noise",
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/117233302080?_skw=Pokemon+%22Magneton%22+9&hash=item1b4ba63a40:g:GncAAeSwFSNqIxQ~"
        },
        {
          "title": "1999 Pokemon TCG Holographic Base Set Unlimited Magneton  #9/102",
          "total_ask_price": 14.99,
          "reasons": [
            "shadowless_lane_missing_title_token"
          ],
          "url": "https://www.ebay.com/itm/147379243406?_skw=Pokemon+%22Magneton%22+9&hash=item22507cc98e:g:5NIAAeSwx8pqMcmD&amdata=enc%3AAQALAAAA8ACCtXRWQnOEpyOqnQQ8KGZGmrioPnab6eJdt%2F6EutGlv0i16A3bqoFp0s9FIR%2B6z9KRZagZxN0pW5Xi439TQSGcuHWSSesSpoFTkJqkDOmQal2%2BaCiDRta9uOS%2BGZmtA408lj3ORz3MRrdaS5Po6Sub9Ydbtof2ThZK1GHoHy26zRdjKOagJkJRgf1NMFwBmwWUb91qcJudIsvMXDoITf8yHrIcUhKzZ%2FX5suZJ0%2B7OnFeBtLY01MeJYdLhXE8wniLI2eghmhlbPwul6vXFUwpKFFs33GOHWsXQYLW604NtQkRHtHvbLJW6F0x9gp0oeA%3D%3D"
        }
      ],
      "sample_passes": [
        {
          "title": "Pokemon Card 1999 Base Set Shadowless Holo Rare Magneton 9/102 HP",
          "total_ask_price": 38.63,
          "url": "https://www.ebay.com/itm/318124882943?_skw=Pokemon+%22Magneton%22+%22Base+Set+Shadowless%22+%229%22&hash=item4a11b87bff:g:EHoAAeSwQzRp1zaL"
        },
        {
          "title": "1999 Pokemon Magneton Base Set Shadowless Holo 9/102 clean",
          "total_ask_price": 54.17,
          "url": "https://www.ebay.com/itm/196969614963?_skw=Pokemon+%22Magneton%22+%22Base+Set+Shadowless%22+%229%22&hash=item2ddc4dce73:g:z1IAAOSwyRtnW36A"
        },
        {
          "title": "Magneton 9/102 Base Set Shadowless Pokemon Unlimited Holo MP Keiji Kinebuchi",
          "total_ask_price": 54.95,
          "url": "https://www.ebay.com/itm/306985088074?_skw=Pokemon+%22Magneton%22+%22Base+Set+Shadowless%22+%229%22&hash=item4779bcb44a:g:4lIAAeSwG21qIzHw"
        },
        {
          "title": "Pokemon Magneton Base Set Shadowless Vintage Rare Holo 9/102 HP",
          "total_ask_price": 55,
          "url": "https://www.ebay.com/itm/126736086274?_skw=Pokemon+%22Magneton%22+%22Base+Set+Shadowless%22+%229%22&hash=item1d820f3502:g:AEcAAOSwBcFnFxzu"
        },
        {
          "title": "1999 Pokemon Base Set Shadowless #9 Magneton Holo MP",
          "total_ask_price": 55.980000000000004,
          "url": "https://www.ebay.com/itm/198371860619?_skw=Pokemon+%22Magneton%22+%22Base+Set+Shadowless%22+%229%22&hash=item2e2fe2608b:g:Z8IAAeSwSQRqD75F"
        }
      ]
    }
  ]
}
```

## Findings

- strict_title_gate_reduces_review_ready_pool
- first_edition_lane_title_mismatches_present
- shadowless_lane_title_mismatches_present
- 1999_2000_lane_title_mismatches_present
- base_lane_exact_number_mismatches_present

## Recommended Next Step

Patch the review gate to include strict title evidence rules before nightly automation: exact number/set checks for high-risk lanes, required Base print-run tokens for 1st Edition/Shadowless/1999-2000, and exclusion of lot/foreign/bulk titles from rollup medians rather than merely flagging the parent rollup.
