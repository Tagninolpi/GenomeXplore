from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.routers import field_mappings, ncbi

app = FastAPI(title="GenomeXplore")

# One router per feature: add a line here when you add a page that needs the backend.
app.include_router(ncbi.router)
app.include_router(field_mappings.router)

# Frontend is served last so it never shadows /api routes.
FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
