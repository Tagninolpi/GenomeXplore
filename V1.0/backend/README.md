# Backend

## Structure

```text
backend/
├── main.py                  # app entry point
├── routers/                 # HTTP routes, one file per page
│   ├── export.py            # "Export raw data" button
│   ├── field_mappings.py
│   └── ncbi.py
├── helpers/                 # logic used by the routers
│   ├── flatten.py
│   ├── mappings.py
│   ├── ncbi.py
│   ├── raw_cache.py
│   └── structure.py
├── artifact_links/          # links to the files of each genome (NCBI, GWH, Ensembl)
│   ├── common.py
│   ├── ncbi_links.py
│   ├── gwh_links.py
│   ├── ensembl_links.py
│   ├── export.py
│   ├── decisions_artifact_links.txt
│   └── tests/               # test notebooks + example JSON
├── raw_data/                # raw sequencing runs of each species (ENA) and choice of representative runs
│   ├── ena_runs.py
│   ├── select_runs.py
│   ├── raw_data_export.py
│   ├── decisions_raw_data.txt
│   └── tests/
├── final_export/            # one JSON per selection: genomes + links + raw data, joined by taxid
│   ├── final_export.py
│   ├── decisions_final_export.txt
│   └── tests/
└── storage/
    └── field_mappings.json  # saved field mappings
```

Each of the three export parts has its scripts, a `decisions_*.txt` file (what was chosen and why) and a `tests/` folder with notebooks showing what the scripts return. The notebooks are run from their own folder and add `V1.0/` to the Python path (`sys.path.append("../../..")`), so they import the scripts like the app does (`from backend.raw_data.ena_runs import ena_runs`).

## `main.py`

Entry point of the web app (`uvicorn backend.main:app`).
It creates the FastAPI app, registers the routers and mounts the `frontend/` folder as static files, so the same server delivers the pages and the API.

## `routers/`

Routers receive the requests sent by the frontend (GET, POST, DELETE), check the input and call the helpers. There is one router per page, so the routes are not all in one file.

#### `helpers/`

Helper functions used by the routers.

#### `storage/field_mappings.json`

Local file holding the saved field mappings. Each top-level key is the **mapping name**:
