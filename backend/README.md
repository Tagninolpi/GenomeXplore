# Backend

The backend is a [FastAPI](https://fastapi.tiangolo.com/) app (Python). It receives the requests of the frontend, downloads and transforms the NCBI data, stores the saved field mappings, and also serves the frontend files.

## Structure

```text
backend/
├── main.py                  # app entry point
├── routers/                 # HTTP routes, one file per page
│   ├── field_mappings.py
│   └── ncbi.py
├── helpers/                 # data logic used by the routers
│   ├── flatten.py
│   ├── mappings.py
│   ├── ncbi.py
│   ├── raw_cache.py
│   └── structure.py
└── storage/
    └── field_mappings.json  # saved field mappings
```

| Folder      | Role                                                                | Details                                  |
| ----------- | ------------------------------------------------------------------- | ---------------------------------------- |
| `routers/`  | Receive the frontend requests, check the input, return the answer   | [routers/README.md](routers/README.md)   |
| `helpers/`  | Download, count, transform and store the data                       | [helpers/README.md](helpers/README.md)   |
| `storage/`  | Local file with the saved field mappings                            | [storage/README.md](storage/README.md)   |

## How the scripts work together

Routers receive the requests and call the helpers, which do the work. There are three workflows.

### 1. Get the structure of a search (Setup page)

```text
GET /api/ncbi/structure
 └─ routers/ncbi.py
     ├─ helpers/raw_cache.py ── (only if this search is not already stored) ──► helpers/ncbi.py ──► NCBI API
     └─ helpers/structure.py      count how many reports have each field
 ◄─ { taxid, refseq, total, structure }
```

### 2. Save, list or delete a field mapping (Setup page)

```text
POST / GET / DELETE /api/field-mappings
 └─ routers/field_mappings.py      checks the mapping (POST)
     └─ helpers/mappings.py ──► storage/field_mappings.json
```

### 3. Get the result table (Base query page)

```text
GET /api/ncbi/query
 └─ routers/ncbi.py
     ├─ helpers/mappings.py ──► storage/field_mappings.json     load the chosen mapping
     ├─ helpers/raw_cache.py ── (reuses the last search, else) ──► helpers/ncbi.py ──► NCBI API
     └─ helpers/flatten.py      keep only the mapped fields, one row per report
 ◄─ { total, columns, rows }
```

The cache is what links workflows 1 and 3: a structure search followed by a query with the same taxid and RefSeq setting downloads the data from NCBI only once.

## `main.py`

Entry point of the web app (`uvicorn backend.main:app`).
It creates the FastAPI app, registers the routers and mounts the `frontend/` folder as static files, so the same server delivers the pages and the API.

## Extending the backend

- **New route**: add it to the router of the matching page, or create a new file in `routers/` and register it in `main.py` with `app.include_router(...)`.
- **New logic**: write it as a function in `helpers/` and keep the router limited to checking input and returning the result, so the logic can be reused and tested without the web server.
- **New data source**: add a `helpers/<source>.py` that returns the reports as a list of dicts, as `fetch_all_NCBI_reports` does. The cache currently only handles NCBI (see [helpers/README.md](helpers/README.md#raw_cachepy)).
