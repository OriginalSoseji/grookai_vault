from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime

Condition = Literal['NM','LP','MP','HP','DMG']
Agency = Literal['PSA','BGS','CGC','ACE','AGS']
ListingType = Literal['sold','list','auction']

class PriceRow(BaseModel):
    # print identity (either card_id or (set_id, number, variant))
    card_id: Optional[str] = None
    set_id: Optional[str] = None
    number: Optional[str] = None
    variant: Optional[str] = None  # 'normal','holofoil','reverseHolofoil','1stEditionHolofoil','unlimitedHolofoil'

    source: str
    currency: str = "USD"
    price: float
    observed_at: datetime

    # raw condition OR graded, at least one required
    condition: Optional[str] = None
    grade_agency: Optional[str] = None
    grade_value: Optional[str] = None
    grade_qualifier: Optional[str] = None

    listing_type: Optional[ListingType] = None
    quantity: Optional[int] = 1
    notes: Optional[str] = None

class NormalizedRow(BaseModel):
    print_id: Optional[str] = None  # uuid as str when resolved
    card_id: Optional[str] = None
    set_id: Optional[str] = None
    number: Optional[str] = None
    variant: Optional[str] = None

    source: str
    price_usd: float
    observed_at: datetime

    condition: Optional[Condition] = None
    grade_agency: Optional[Agency] = None
    grade_value: Optional[str] = None
    grade_qualifier: Optional[str] = None
    listing_type: Optional[ListingType] = None
    quantity: Optional[int] = 1
    notes: Optional[str] = None

class ImportReport(BaseModel):
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    errors:  int = 0
    quarantined: int = 0
    duration_ms: int = 0
