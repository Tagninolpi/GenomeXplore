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

---

### Backend

#### Structure

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

#### `main.py`

Entry point of the web app (`uvicorn backend.main:app`).
It creates the FastAPI app, registers the routers and mounts the `frontend/` folder as static files, so the same server delivers the pages and the API.

#### `routers/`

Routers receive the requests sent by the frontend (GET, POST, DELETE), check the input and call the helpers. There is one router per page, so the routes are not all in one file.

| File                | Route prefix          | Endpoints                                                                                                                                                  |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field_mappings.py` | `/api/field-mappings` | `GET` list all mappings · `POST` save a custom mapping (validated, stored in the local JSON) · `DELETE` remove a mapping by name                           |
| `ncbi.py`           | `/api/ncbi`           | `GET /structure` field structure with counts, used by the **Setup** page to build the schema tree · `GET /query` result table of a taxid with a saved mapping, used by the **Base query** page |

#### `helpers/`

Helper functions used by the routers.

| File           | What it does                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ncbi.py`      | `fetch_all_NCBI_reports(taxid, true_refseq)` downloads all the raw assembly reports of a taxon from the NCBI Datasets API (page by page). `true_refseq=True` keeps only RefSeq assemblies, `False` keeps all reference assemblies (RefSeq and GenBank). |
| `raw_cache.py` | Keeps the raw reports of the **last** search `(taxid, refseq)` in memory. Both pages need the same raw data for the same request, so it is fetched once and reused. A different search replaces it, and a restart empties it. |
| `structure.py` | `build_structure(reports)` merges all the reports into one dict of their fields, where each leaf holds the number of reports that have it.                                |
| `flatten.py`   | `build_table(reports, structure)` keeps only the fields of a mapping and turns each report into one flat row (columns named by their full path, e.g. `organism.organism_name`). Rows are keyed by accession, and a field a report lacks stays empty. |
| `mappings.py`  | Reads and writes the saved mappings in the local JSON file: `list_all`, `get`, `add`, `delete`. Writes are protected against double clicks and cannot corrupt the file.    |

#### `storage/field_mappings.json`

Local file holding the saved field mappings. Each top-level key is the **mapping name**:

```json
{
 "my_mapping_name": {
  "total": 901,
  "taxid": "7711",
  "refseq": true,
  "structure": {
   "accession": 901,
   "assembly_stats": { "contig_n50": 901, "genome_coverage": 893 }
  }
 }
}
```

| Field       | Meaning                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `total`     | Number of NCBI reports found when the mapping was created                                                |
| `taxid`     | Taxid of that search                                                                                     |
| `refseq`    | `true` = RefSeq only, `false` = all reference assemblies                                                 |
| `structure` | The selected fields. Branches are nested dicts, and each leaf is the number of reports that have the field |

---

### Frontend

#### Structure

```text
frontend/
├── index.html
├── css/
│   ├── style.css            # entry point: imports all the files below
│   ├── base.css
│   ├── layout.css
│   ├── components/          # one file per component
│   │   ├── query_bar.css
│   │   ├── mapping_list.css
│   │   ├── schema_tree.css
│   │   └── result_table.css
│   └── pages/               # one file per page
│       ├── setup_field_mapping.css
│       └── base_query.css
└── js/
    ├── app.js               # page loader and menu
    ├── api.js               # all calls to the backend
    ├── store.js             # saved mappings shared by the pages
    ├── ui.js                # small shared UI helper
    ├── import_data.js       # merge an imported JSON file into the table
    ├── pages/
    │   ├── setup_field_mapping.js
    │   └── base_query.js
    └── components/
        ├── mapping_list.js
        ├── query_bar.js
        ├── result_table.js
        └── schema_tree.js
```

#### `index.html`

Minimal HTML shell: title, page menu (`#nav`), the area where the current page is displayed (`#view`) and the script `js/app.js`.
The two pages are separate, and it is easy to add more (see `app.js`).

#### `css/`

Styles of the whole app, split per page and per component (same names as the `js/` files).
`index.html` links only `style.css`, which imports all the others. The order of the imports matters (a later file wins when two rules are equally specific): base, then layout, then components, then pages.

| File                        | What it styles                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `style.css`                 | Entry point, only `@import` lines                                                                                      |
| `base.css`                  | Colour variables (light and dark theme), reset, default look of inputs and buttons                                      |
| `layout.css`                | Top bar and menu, page container, two-column layout, panels, status line, hint text (shared by both pages)             |
| `components/query_bar.css`  | `query_bar.js`: taxid input, RefSeq toggle, Search button                                                              |
| `components/mapping_list.css` | `mapping_list.js`: list of saved mappings                                                                            |
| `components/schema_tree.css` | `schema_tree.js`: tree, colour legend, hover tooltip                                                                  |
| `components/result_table.css` | `result_table.js`: table and Previous / Next pager                                                                   |
| `pages/setup_field_mapping.css` | Setup page only: Remove button, name + Export bar                                                                  |
| `pages/base_query.css`      | Base query page only: action buttons, import report popup                                                              |

**To add a stylesheet** for a new component or page: create it in `components/` or `pages/` and add one `@import` line in `style.css`. Colours and spacing come from the variables in `base.css`, so reuse them (`var(--accent)`, `var(--border)`...) to keep the dark theme working.

#### `js/`

All the JavaScript: it builds the pages, handles the interactions and connects the HTML to the Python backend.

##### Core scripts

| File             | What it does                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.js`         | Builds the menu from the list of pages and shows the page matching the URL (`#/page-id`). When the page changes, it cleans up the old page and mounts the new one. **To add a page**: create `js/pages/<name>.js` exporting `id`, `title` and `mount(container)`, then add it to `PAGES`. |
| `api.js`         | The only place that talks to the backend: `getJSON`, `postJSON`, `deleteJSON`, all with the same format. It turns server errors into readable messages.                                                                                        |
| `store.js`       | Keeps the saved field mappings in memory, shared by both pages. They are fetched once, and the local copy is updated only after the backend confirms an add or a delete, so both always agree.                                                |
| `ui.js`          | Small helper to write (or clear) the status line of a page, optionally as an error.                                                                                                                                                           |
| `import_data.js` | Merges an imported JSON file (`{accession: {column: value}}`) into the table on screen as new columns. Nothing is sent to the backend. Returns the accessions that could not be matched, shown in a popup report.                              |

##### `pages/`

Each page exports `id`, `title` and `mount(container)`, and assembles the components below.

| File                     | What it does                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `setup_field_mapping.js` | **Setup field mapping** page. Taxid search → schema tree → select the fields → name and save the mapping. Saved mappings are listed on the left, where they can be viewed or removed.                                                |
| `base_query.js`          | **Base query** page. Taxid search + a selected mapping → result table. Also has the *Import data* button. *Remove outliers*, *Filter data* and *Export raw data* are placeholders ("Coming soon").                                    |

##### `components/`

Reusable building blocks of the two pages.

| File               | What it does                                                                                                                                                                                                                                              | Used in      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `query_bar.js`     | Taxid input + **RefSeq only** toggle + Search button. RefSeq on = RefSeq assemblies only, off = any reference assembly (including GenBank). Checks that the taxid is numeric, then hands the search to the page.                                          | Both pages   |
| `mapping_list.js`  | Left panel listing the saved mappings. Click to select or deselect one (hover for taxid, RefSeq setting and record count). It refreshes automatically when a mapping is added or removed.                                                                | Both pages   |
| `schema_tree.js`   | Interactive tree of the NCBI report fields: one button per key, branches coloured by how often the field exists (green = in all reports, red = the rarest). Click a key with children to collapse it (this deselects its leaves) and click again to restore. Hover for counts and ratios. Gives back the selected fields as the mapping structure. | Setup page   |
| `result_table.js`  | Paged result table: first column is the accession, then one column per field, one row per record. Rows per page adapt to the screen height, columns fit their content, and Previous / Next buttons change page.                                          | Base query   |

---

## 4. Potential improvements

assemblies : GWH, ensembl, nbci non reference
request params : common name,  scientific name
raw data : GWH , ensembl
filtering :  add filtering
outlier :  add outlier detection and exclusion
table : ordering, hide show columns, select deselect rows
