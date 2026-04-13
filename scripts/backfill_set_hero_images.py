#!/usr/bin/env python3
"""
SET_ART_SYSTEM_V1

Backfills public.sets.hero_image_url / hero_image_source using approved upstream
logo assets only. Priority order:

1. Existing stored logo_url when it validates cleanly as PNG
2. TCGdex set logo by source.tcgdex.id
3. Pokemon TCG API set logo by source.pokemonapi.id

The script never overwrites existing hero_image_url values.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any
from urllib import error, parse, request

import psycopg
from psycopg.rows import dict_row

APPROVED_SOURCES = {"tcgdex", "pokemontcgapi", "manual"}
DEFAULT_LIMIT = 50
REQUEST_TIMEOUT_SECONDS = 12
PNG_CONTENT_TYPES = {"image/png", "image/x-png"}


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip()


def normalize_png_url(url: Any) -> str | None:
    if not isinstance(url, str):
        return None
    trimmed = url.strip()
    if not trimmed:
        return None
    lowered = trimmed.lower()
    if lowered.endswith(".png") or ".png?" in lowered:
        return trimmed
    if any(ext in lowered for ext in (".webp", ".jpg", ".jpeg")):
        return None
    return f"{trimmed}.png"


def fetch_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any] | list[Any]:
    req = request.Request(
        url,
        headers={
            "Accept": "application/json",
            **(headers or {}),
        },
    )
    with request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def validate_png_asset(url: str) -> tuple[bool, str | None]:
    req = request.Request(
        url,
        headers={"Accept": "image/png,image/*;q=0.8,*/*;q=0.5"},
    )
    try:
        with request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            content_type = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if content_type not in PNG_CONTENT_TYPES:
                return False, f"content_type={content_type or 'unknown'}"
            response.read(1)
            return True, None
    except error.HTTPError as exc:
        return False, f"http_{exc.code}"
    except error.URLError as exc:
        return False, f"url_error:{exc.reason}"


def resolve_existing_logo_candidate(row: dict[str, Any]) -> tuple[str | None, str | None]:
    logo_url = normalize_png_url(row.get("logo_url"))
    if not logo_url:
        return None, None

    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    if isinstance(source.get("tcgdex"), dict):
        return logo_url, "tcgdex"
    if isinstance(source.get("pokemonapi"), dict):
        return logo_url, "pokemontcgapi"
    return None, None


def fetch_tcgdex_logo(tcgdex_set_id: str) -> tuple[str | None, str | None]:
    base_url = os.environ.get("TCGDEX_BASE_URL", "").strip()
    lang = os.environ.get("TCGDEX_LANG", "en").strip() or "en"
    api_key = os.environ.get("TCGDEX_API_KEY", "").strip()
    if not base_url or not tcgdex_set_id:
        return None, "missing_tcgdex_config_or_id"

    normalized_base = base_url.rstrip("/") + "/"
    detail_url = f"{normalized_base}{lang}/sets/{parse.quote(tcgdex_set_id, safe='')}"
    headers = {"X-Api-Key": api_key} if api_key else None
    try:
        payload = fetch_json(detail_url, headers=headers)
    except Exception as exc:  # noqa: BLE001 - want reason text for audit summary
        return None, f"tcgdex_fetch_failed:{exc}"

    candidates = []
    if isinstance(payload, dict):
        candidates.extend(
            [
                payload.get("logo"),
                (payload.get("images") or {}).get("logo") if isinstance(payload.get("images"), dict) else None,
            ]
        )

    for candidate in candidates:
        normalized = normalize_png_url(candidate)
        if normalized:
            return normalized, None

    return None, "tcgdex_missing_png_logo"


def fetch_pokemontcgapi_logo(set_id: str) -> tuple[str | None, str | None]:
    if not set_id:
        return None, "missing_pokemontcgapi_id"

    api_key = os.environ.get("POKEMONAPI_API_KEY", "").strip()
    if not api_key:
        return None, "pokemontcgapi_unconfigured"

    detail_url = f"https://api.pokemontcg.io/v2/sets/{parse.quote(set_id, safe='')}"
    try:
        payload = fetch_json(detail_url, headers={"X-Api-Key": api_key})
    except Exception as exc:  # noqa: BLE001 - want reason text for audit summary
        return None, f"pokemontcgapi_fetch_failed:{exc}"

    if isinstance(payload, dict):
        normalized = normalize_png_url(((payload.get("data") or {}).get("images") or {}).get("logo"))
        if normalized:
            return normalized, None

    return None, "pokemontcgapi_missing_png_logo"


def resolve_source_ids(source: Any) -> tuple[str | None, str | None]:
    if not isinstance(source, dict):
        return None, None
    tcgdex_id = source.get("tcgdex", {}).get("id") if isinstance(source.get("tcgdex"), dict) else None
    pokemonapi_id = source.get("pokemonapi", {}).get("id") if isinstance(source.get("pokemonapi"), dict) else None
    return tcgdex_id, pokemonapi_id


def find_candidate(row: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
    stored_url, stored_source = resolve_existing_logo_candidate(row)
    if stored_url and stored_source:
        valid, reason = validate_png_asset(stored_url)
        if valid:
            return stored_url, stored_source, None

    tcgdex_id, pokemonapi_id = resolve_source_ids(row.get("source"))
    if tcgdex_id:
        url, reason = fetch_tcgdex_logo(tcgdex_id)
        if url:
            valid, validation_reason = validate_png_asset(url)
            if valid:
                return url, "tcgdex", None
            reason = validation_reason
        if not pokemonapi_id:
            return None, None, reason

    if pokemonapi_id:
        url, reason = fetch_pokemontcgapi_logo(pokemonapi_id)
        if url:
            valid, validation_reason = validate_png_asset(url)
            if valid:
                return url, "pokemontcgapi", None
            reason = validation_reason
        return None, None, reason

    return None, None, "no_approved_upstream_id"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill sets.hero_image_url safely.")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="Max sets to update (default: 50).")
    parser.add_argument(
        "--set-code",
        action="append",
        default=[],
        help="Explicit set code(s) to target. Can be passed multiple times.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Resolve/validate without writing updates.")
    parser.add_argument("--verbose", action="store_true", help="Print per-set decisions.")
    return parser.parse_args()


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    load_env_file(repo_root / ".env")
    load_env_file(repo_root / ".env.local")

    db_url = os.environ.get("SUPABASE_DB_URL", "").strip()
    if not db_url:
        raise RuntimeError("Missing SUPABASE_DB_URL in .env.local or .env.")

    args = parse_args()
    explicit_codes = [code.strip().lower() for code in args.set_code if code and code.strip()]

    summary: dict[str, Any] = {
        "target_limit": args.limit,
        "target_codes": explicit_codes,
        "dry_run": args.dry_run,
        "selected": 0,
        "updated": 0,
        "resolved_from_stored_logo": 0,
        "resolved_from_tcgdex": 0,
        "resolved_from_pokemontcgapi": 0,
        "failed": [],
        "updated_codes": [],
    }

    with psycopg.connect(db_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            if explicit_codes:
                cur.execute(
                    """
                    select id, code, name, release_date, logo_url, source, hero_image_url, hero_image_source
                    from public.sets
                    where lower(code) = any(%s)
                    order by release_date desc nulls last, code asc
                    """,
                    (explicit_codes,),
                )
            else:
                cur.execute(
                    """
                    select id, code, name, release_date, logo_url, source, hero_image_url, hero_image_source
                    from public.sets
                    where hero_image_url is null
                    order by
                      case
                        when logo_url is not null and btrim(logo_url) <> '' then 0
                        when source->'tcgdex'->>'id' is not null then 1
                        when source->'pokemonapi'->>'id' is not null then 2
                        else 3
                      end asc,
                      release_date desc nulls last,
                      code asc
                    limit %s
                    """,
                    (args.limit,),
                )

            rows = cur.fetchall()
            summary["selected"] = len(rows)

            for row in rows:
                if row.get("hero_image_url"):
                    continue

                candidate_url, candidate_source, failure_reason = find_candidate(row)
                code = row.get("code")

                if not candidate_url or not candidate_source:
                    summary["failed"].append(
                        {
                            "code": code,
                            "name": row.get("name"),
                            "reason": failure_reason or "no_candidate",
                        }
                    )
                    if args.verbose:
                        print(f"[skip] {code}: {failure_reason or 'no_candidate'}")
                    continue

                if candidate_source not in APPROVED_SOURCES:
                    summary["failed"].append(
                        {
                            "code": code,
                            "name": row.get("name"),
                            "reason": f"unapproved_source:{candidate_source}",
                        }
                    )
                    continue

                if args.verbose:
                    print(f"[resolve] {code}: {candidate_source} -> {candidate_url}")

                if not args.dry_run:
                    cur.execute(
                        """
                        update public.sets
                           set hero_image_url = %s,
                               hero_image_source = %s,
                               updated_at = now()
                         where id = %s
                           and hero_image_url is null
                        """,
                        (candidate_url, candidate_source, row["id"]),
                    )

                summary["updated"] += 1
                summary["updated_codes"].append(
                    {
                        "code": code,
                        "name": row.get("name"),
                        "hero_image_source": candidate_source,
                        "hero_image_url": candidate_url,
                    }
                )
                if candidate_source == "tcgdex":
                    if resolve_existing_logo_candidate(row)[0]:
                        summary["resolved_from_stored_logo"] += 1
                    else:
                        summary["resolved_from_tcgdex"] += 1
                elif candidate_source == "pokemontcgapi":
                    summary["resolved_from_pokemontcgapi"] += 1

        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
