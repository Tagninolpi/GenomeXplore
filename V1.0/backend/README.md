# Backend

## Structure

```text
backend/
├── main.py                  # app entry point
├── routers/                 # HTTP routes, one file per page
│   ├── field_mappings.py
│   └── ncbi.py
├── helpers/                 # logic used by the routers
│   ├── flatten.py
│   ├── mappings.py
│   ├── ncbi.py
│   ├── raw_cache.py
│   └── structure.py
└── storage/
    └── field_mappings.json  # saved field mappings
```

## `main.py`

Entry point of the web app (`uvicorn backend.main:app`).
It creates the FastAPI app, registers the routers and mounts the `frontend/` folder as static files, so the same server delivers the pages and the API.

## `routers/`

Routers receive the requests sent by the frontend (GET, POST, DELETE), check the input and call the helpers. There is one router per page, so the routes are not all in one file.

#### `helpers/`

Helper functions used by the routers.

#### `storage/field_mappings.json`

Local file holding the saved field mappings. Each top-level key is the **mapping name**:
