# Frontend

## Structure

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

## `index.html`

Minimal HTML shell: title, page menu (`#nav`), the area where the current page is displayed (`#view`) and the script `js/app.js`.
The two pages are separate, and it is easy to add more (see `app.js`).

#### `css/`

Styles of the whole app, split per page and per component (same names as the `js/` files).
`index.html` links only `style.css`, which imports all the others. The order of the imports matters (a later file wins when two rules are equally specific): base, then layout, then components, then pages.

**To add a stylesheet** for a new component or page: create it in `components/` or `pages/` and add one `@import` line in `style.css`.
Colours and spacing come from the variables in `base.css`, so reuse them (`var(--accent)`, `var(--border)`...) to keep the dark theme working.

#### `js/`

All the JavaScript: it builds the pages, handles the interactions and connects the HTML to the Python backend.


##### `pages/`

Each page exports `id`, `title` and `mount(container)`, and assembles the components.

##### `components/`

Reusable building blocks of the two pages.

---
