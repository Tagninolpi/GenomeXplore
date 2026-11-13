from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.routers import field_mappings, ncbi

# create FastAPi app object (called to start the web program)
app = FastAPI(title="GenomeXplore", version="1.0.0")

# add existing routers (see files in routers)
# routers are used to not have all the routes in one file, and seperate them per page function 
app.include_router(ncbi.router)
app.include_router(field_mappings.router)

# find the front end repo
# start in this file, front end = ../../frontend
# works even if app not launched in the dir 
FRONTEND = Path(__file__).resolve().parent.parent / "frontend"

# mount all the static files in the frontend dir
app.mount("/", StaticFiles(directory=FRONTEND, html=True))
