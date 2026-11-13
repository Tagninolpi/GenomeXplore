# Pages

A page assembles the components, handles the requests to the backend (through `api.js` and `store.js`) and displays the results and messages. Each page file exports:

- `id`: its name in the URL (`#/<id>`),
- `title`: its text in the menu,
- `mount(container)`: builds the page in `container` and returns a cleanup function, which `app.js` calls when the page is left.

Both pages ignore an answer that arrives after a newer search was started, so a slow search cannot overwrite a newer result. Messages from the backend are displayed as they are received (see [`routers/README.md`](../../../backend/routers/README.md)).

## Adding a page

1. Create `js/pages/<name>.js` exporting `id`, `title` and `mount(container)`. Build the page from the components and return a cleanup function (call the `destroy()` of the components used).
2. Import it in `js/app.js` and add it to `PAGES`: the menu link and the route are created from this list.
3. If it needs styles, add `css/pages/<name>.css` (see [`css/README.md`](../../css/README.md#adding-a-stylesheet)).

---

# setup_field_mapping.js

**Setup field mapping** page (`#/setup-field-mapping`). Search a taxid, choose the fields, save a mapping.

**Components**: `query_bar`, `schema_tree`, `mapping_list`.

**Flow**
1. **Search**: `GET /api/ncbi/structure` with the taxid and RefSeq setting. The result is displayed in the schema tree.
2. **Select**: the user deselects the fields they do not want.
3. **Export**: the name box and **Export** button save the selected fields (`schema_tree.getPruned()`) with `store.addMapping()`. The mapping appears in the list on the left.
4. **Remove**: select a saved mapping, then click **Remove** (`store.removeMapping()`).

**What the tree shows**: the selected saved mapping if there is one, otherwise the result of the last search, otherwise a message. Selecting a saved mapping shows only its fields, so the fields it lacks cannot be brought back from it: deselect the mapping to see the last search again. A new search deselects the saved mapping.

**Messages** (status line)

| When                                              | Message                                                    |
| ------------------------------------------------- | ---------------------------------------------------------- |
| Search running                                    | `Searching…`                                               |
| Search finished                                   | `<n> records for taxid <taxid> (RefSeq only / all reference assemblies)` |
| Search found nothing                              | `0 records`, and `No reports found for this taxid.` in the tree area |
| Nothing searched yet                              | `Enter a taxid to see the structure of its NCBI reports.` (tree area) |
| Export without a name                             | `Enter a name for the mapping`                             |
| Export with a name already used                   | `"<name>" already exists, choose another name`             |
| Export with no field selected                     | `Select at least one field to export`                      |
| Mapping saved                                     | `Saved "<name>"`                                           |
| Mapping removed                                   | `Removed "<name>"`                                         |
| The saved mappings cannot be loaded               | `Could not load saved mappings: <reason>`                  |
| A request fails                                   | The message of the backend, as received                    |

# base_query.js

**Base query** page (`#/base-query`). Get the result table of a taxid with a saved mapping, and import extra data.

**Components**: `query_bar`, `mapping_list`, `result_table` (and `import_data.js` for the import).

**Flow**
1. **Search**: a mapping must be selected in the list. `GET /api/ncbi/query` with the taxid, the RefSeq setting and the mapping name. The result is displayed in the result table.
2. **Import data**: the button opens a file chooser (`.json`). The values of the file are merged into the table as new columns with `mergeImport()` (format in [`js/README.md`](../README.md#import_datajs)), and the table is redrawn. If some accessions could not be matched, a popup lists them (closed with its button or Escape). Imported columns are kept only in the page: a new search replaces the table.
3. **Remove outliers**, **Filter data** and **Export raw data** are placeholders: the buttons are disabled with the tooltip `Coming soon`.

**Messages** (status line, unless stated otherwise)

| When                                              | Message                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| Nothing searched yet                              | `Enter a taxid and press Search.` (table area)                        |
| Search without a selected mapping                 | `Select a field mapping first`                                       |
| Search running                                    | `Searching…`                                                         |
| Search finished                                   | `<n> records · <c> columns · mapping "<name>"`                       |
| Search found nothing                              | `0 records`, and `No reports found for this taxid.` in the table area |
| Import before any search                          | `Run a search before importing data`                                 |
| Import done                                       | `Imported "<file name>" · <n> new columns`                           |
| Import fails (not JSON, wrong format)             | `Import failed: <reason>`                                            |
| Popup, accessions not matched                     | `In the file but not in the table (ignored): <n>` and `In the table but not in the file (empty cells): <n>`, each followed by the list |
| The saved mappings cannot be loaded               | `Could not load saved mappings: <reason>`                            |
| A request fails                                   | The message of the backend, as received                              |
