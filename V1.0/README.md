# GenomeXplore

## 1. Project presentation

<!-- TODO: describe the project -->

---

## 2. How to use


### import method (instalation) : (replace current with docker or other method)

### Create a virtual environment

Create a virtual environment and install the following libraries:

- `fastapi`
- `uvicorn`
- `requests`

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install fastapi uvicorn requests
```

### Launch the web page

Go to the project directory (`genomexplore/V1.0`, the folder that contains `backend/` and `frontend/`) and run:

```bash
uvicorn backend.main:app
```

Then open <http://127.0.0.1:8000> in your browser.

---

### web page use : 

<!-- TODO: add meb page tutorial-->

## 3. Code infrastructure

GenomeXplore has two major components:

| Component    | Role                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| **Frontend** | Web page display and interactivity (plain HTML / CSS / JavaScript modules)     |
| **Backend**  | Database (NCBI API) queries and data transformation (Python, FastAPI)          |

The backend also serves the frontend files, so a single `uvicorn` command starts everything.

### How it all works together

The app has two pages. Both start from a taxid search, and both need the same raw NCBI data.

```text
Setup field mapping page                       Base query page
────────────────────────                       ───────────────
taxid + RefSeq toggle                          taxid + RefSeq toggle + chosen mapping
        │                                               │
GET /api/ncbi/structure                        GET /api/ncbi/query
        │                                               │
  raw_cache ──► helpers/ncbi.py (NCBI API)      raw_cache ──► helpers/ncbi.py (NCBI API)
        │                                               │
  structure.py: count each field                 mappings.py: load the saved mapping
        │                                        flatten.py: keep only the mapped fields
  schema tree: user selects fields                       │
        │                                        result table (+ import extra data)
POST /api/field-mappings
  (saved in storage/field_mappings.json) ──────────────► reused as the mapping above
```

1. **Setup page**: search a taxid. The backend downloads all NCBI assembly reports of that taxon and returns the *structure* of the reports (every field and how many reports have it). The user selects the fields they care about in the schema tree and saves the selection as a **field mapping**.
2. **Query page**: search a taxid with a saved mapping. The backend returns one table row per report, containing only the mapped fields.


## 4. Potential improvements

assemblies : GWH, ensembl, nbci non reference
request params : common name,  scientific name
raw data : GWH , ensembl
filtering :  add filtering
outlier :  add outlier detection and exclusion
table : ordering, hide show columns, select deselect rows
