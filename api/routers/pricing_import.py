from fastapi import APIRouter, UploadFile, File, HTTPException
from starlette.responses import JSONResponse

from api.services.pricing_importer import import_rows

router = APIRouter(prefix="/pricing", tags=["pricing"])

@router.post("/import")
async def pricing_import(file: UploadFile = File(...)):
    try:
        report = await import_rows(file)
        return JSONResponse(report.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
