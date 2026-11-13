# Frontend

The frontend is a single-page app in plain HTML, CSS and JavaScript modules (no build step, no framework). It is served by the backend (`backend/main.py`), so one `uvicorn` command starts everything. It talks to the backend only through `js/api.js`.

## Structure

```text
frontend/
├── index.html
├── css/                     # styles, split per page and per component
│   ├── style.css            # entry point: imports all the other files
│   ├── base.css
│   ├── layout.css
│   ├── components/
│   └── pages/
└── js/
    ├── app.js               # page loader and menu
    ├── api.js               # all calls to the backend
    ├── store.js             # saved mappings shared by the pages
    ├── ui.js                # small shared UI helper
    ├── import_data.js       # merge an imported JSON file into the table
    ├── pages/               # one file per page
    │   ├── setup_field_mapping.js
    │   └── base_query.js
    └── components/          # reusable blocks used by the pages
        ├── mapping_list.js
        ├── query_bar.js
        ├── result_table.js
        └── schema_tree.js
```

| Folder           | Role                                                                          | Details                                              |
| ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `css/`           | Styles of the whole app                                                       | [css/README.md](css/README.md)                       |
| `js/`            | Page loader, backend calls, shared data, import                               | [js/README.md](js/README.md)                         |
| `js/pages/`      | The two pages: they assemble the components and handle the search/save/import | [js/pages/README.md](js/pages/README.md)             |
| `js/components/` | Reusable blocks: search bar, mapping list, schema tree, result table          | [js/components/README.md](js/components/README.md)   |

## `index.html`

Minimal HTML shell: title, page menu (`#nav`), the area where the current page is displayed (`#view`), the stylesheet `css/style.css` and the script `js/app.js`. Everything else is built by JavaScript.

## How the scripts work together

### Start

```text
index.html ─► js/app.js
               ├─ builds the menu from the list of pages
               └─ shows the page matching the URL (#/setup-field-mapping or #/base-query)
                   └─ page.mount() builds the page from its components
                       └─ store.js loads the saved mappings from the backend (once)
```

### Setup page: search, select, save

```text
query_bar ── Search ──► setup_field_mapping.js ── api.js: GET /api/ncbi/structure ──► backend
                                  │
                                  └──► schema_tree      the user selects the fields
                                           │
                       getPruned()         ▼
setup_field_mapping.js ──► store.addMapping() ── api.js: POST /api/field-mappings ──► backend
                                  └─ once the backend confirms ──► mapping_list refreshes
```

### Base query page: query, import

```text
mapping_list (selected mapping) + query_bar (taxid) ──► base_query.js
base_query.js ── api.js: GET /api/ncbi/query ──► backend ──► result_table

Import data ──► import_data.js (merges the file into the rows) ──► result_table redrawn
                (nothing is sent to the backend)
```

`store.js` is what links the pages: `mapping_list` displays its mappings on both pages, and adding or removing a mapping refreshes the list wherever it is shown.

## Extending the frontend

- **New page**: see [js/pages/README.md](js/pages/README.md#adding-a-page).
- **New component**: see [js/components/README.md](js/components/README.md#adding-a-component).
- **New stylesheet**: see [css/README.md](css/README.md#adding-a-stylesheet).
- **New backend call**: add it to `js/api.js` usage in the page, and the route to the [backend](../backend/routers/README.md).
