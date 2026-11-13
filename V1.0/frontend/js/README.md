# js

The JavaScript of the app, as ES modules loaded by `app.js`. This folder holds the core scripts; the pages and the reusable components have their own READMEs: [`pages/`](pages/README.md) and [`components/`](components/README.md).

---

# app.js

Builds the page menu and shows the right page.

- `PAGES` is the list of pages. Each one becomes a menu link `#/<page id>`.
- On start and on every URL change, it finds the page matching the URL (the first page if the URL is empty or unknown, and it then writes the real address in the URL), calls the cleanup function returned by the previous page, empties the page area, mounts the new page and highlights its menu link.

To add a page, see [`pages/README.md`](pages/README.md#adding-a-page).

# api.js

The only script that talks to the backend: `getJSON(url, params)`, `postJSON(url, body)` and `deleteJSON(url, params)`, all working the same way (parameters go in the URL, a body is sent as JSON).

- On success it returns the answer as an object (nothing if the server answered with no content).
- On failure it throws an error whose message is the one sent by the backend (see [`routers/README.md`](../../backend/routers/README.md)), or a generic "Request failed" message if there is none. The pages show that message in their status line.

# store.js

The saved field mappings, shared by both pages.

| Function                              | What it does                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ensureLoaded()`                      | Fetches the list from the backend **once** and keeps it in memory. If the fetch fails, the next call tries again.   |
| `getMappings()` / `getMapping(name)`  | Read the local copy, with no request.                                                                               |
| `addMapping(entry)`                   | Sends the new mapping to the backend, and adds it to the local copy only after the backend confirms.                |
| `removeMapping(name)`                 | Same for a removal.                                                                                                 |
| `subscribe(fn)`                       | Registers the function called when the list changes (the mapping list on screen). Returns a function to unregister. |

There is only one subscriber slot: only one page is shown at a time, and `app.js` cleans up the old page before mounting the new one. How the copy and the backend file stay identical is explained in [`routers/README.md`](../../backend/routers/README.md#how-the-page-copy-and-the-file-stay-identical).

# ui.js

`statusSetter(el)` returns a function `(text, isError)` that writes (or clears) the status line of a page, in red when `isError` is true.

# import_data.js

`mergeImport(columns, rows, imported)` adds the values of an imported JSON file to the table on screen as new columns. Nothing is sent to the backend, and the inputs are not modified. It is used by the Base query page.

- **File format**: one entry per accession, each holding `column name: value`:

  ```json
  { "GCF_000001405.40": { "my_column": 12, "other_column": "x" } }
  ```

- **Returns** `{ columns, rows, notInTable, notInImport }`: the new columns and rows, plus the accessions that are in the file but not in the table (their values are ignored) and those in the table but not in the file (they get no value).
- An imported column with the same name as an existing one replaces its values.

**Error message**: if the file does not have the expected format, it throws `the file must look like { "accession": { "column_name": value, ... }, ... }`. The page shows it as `Import failed: <message>`.
