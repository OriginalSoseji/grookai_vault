from fastapi import FastAPI
from api.routers import pricing_import

app = FastAPI()
app.include_router(pricing_import.router)

@app.get("/healthz")
def healthz():
    return {"ok": True}
