import json
import re
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader


REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKPOINT_DIR = REPO_ROOT / "docs" / "checkpoints" / "warehouse"
TEMP_DIR = REPO_ROOT / "temp"

SERIES_1_SOURCE_URL = (
    "https://www.pokemon.com/static-assets/content-assets/cms2/pdf/"
    "trading-card-game/checklist/prize_pack_series_1_web_cardlist_en.pdf"
)
SERIES_2_SOURCE_URL = (
    "https://www.pokemon.com/static-assets/content-assets/cms2/pdf/"
    "trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf"
)

SERIES_CONFIG = [
    {
        "series": 1,
        "source_name": "Pokemon.com Prize Pack Series One official checklist",
        "source_url": SERIES_1_SOURCE_URL,
        "raw_path": TEMP_DIR / "prize_pack_series_1_official_raw.pdf",
        "output_path": CHECKPOINT_DIR / "prize_pack_series_1_official.json",
    },
    {
        "series": 2,
        "source_name": "Pokemon.com Prize Pack Series Two official checklist",
        "source_url": SERIES_2_SOURCE_URL,
        "raw_path": TEMP_DIR / "prize_pack_series_2_official_raw.pdf",
        "output_path": CHECKPOINT_DIR / "prize_pack_series_2_official.json",
    },
]

SET_NUMBER_RE = re.compile(r"^(?P<name>.+?)\s+(?P<set>[A-Z][A-Z0-9.]{1,8})\s*(?P<number>\d{3})\s+■")
PROMO_NUMBER_RE = re.compile(r"^(?P<name>.+?)\s+(?P<number>SWSH\d+)\s+■")


def is_pdf(path: Path) -> bool:
    if not path.exists():
        return False
    with path.open("rb") as handle:
        return handle.read(5) == b"%PDF-"


def extract_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def parse_entries(text: str) -> tuple[list[dict[str, str]], list[str]]:
    entries = []
    skipped = []
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    index = 0

    while index < len(lines):
        line = lines[index]
        if line == "Professor’s Research" and index + 1 < len(lines):
            next_line = lines[index + 1]
            line = f"{line} {next_line}"
            index += 1

        promo_match = PROMO_NUMBER_RE.match(line)
        set_match = SET_NUMBER_RE.match(line)

        if promo_match:
            entries.append(
                {
                    "name": promo_match.group("name").strip(),
                    "printed_number": promo_match.group("number").strip(),
                }
            )
        elif set_match:
            entries.append(
                {
                    "name": set_match.group("name").strip(),
                    "printed_number": set_match.group("number").strip(),
                    "set_code": set_match.group("set").strip(),
                }
            )
        elif line.startswith("Basic ") and "Energy" in line and "■" in line:
            skipped.append(line)

        index += 1

    seen = set()
    deduped = []
    for entry in entries:
        key = (entry["name"], entry["printed_number"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)

    return deduped, skipped


def import_series(config: dict) -> dict:
    raw_path = config["raw_path"]
    if not is_pdf(raw_path):
        return {
            "series": config["series"],
            "status": "raw_source_missing_or_not_pdf",
            "raw_path": str(raw_path.relative_to(REPO_ROOT)),
            "output_path": str(config["output_path"].relative_to(REPO_ROOT)),
            "entry_count": 0,
            "skipped_no_printed_number_count": 0,
        }

    text = extract_text(raw_path)
    entries, skipped = parse_entries(text)
    payload = {
        "source_name": config["source_name"],
        "source_url": config["source_url"],
        "evidence_tier": "TIER_1",
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "status": "official_pdf_local_import",
        "entries": entries,
    }
    config["output_path"].write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "series": config["series"],
        "status": "imported",
        "raw_path": str(raw_path.relative_to(REPO_ROOT)),
        "output_path": str(config["output_path"].relative_to(REPO_ROOT)),
        "entry_count": len(entries),
        "skipped_no_printed_number_count": len(skipped),
        "skipped_no_printed_number_examples": skipped[:8],
    }


def main() -> None:
    results = [import_series(config) for config in SERIES_CONFIG]
    print(json.dumps({"results": results}, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
