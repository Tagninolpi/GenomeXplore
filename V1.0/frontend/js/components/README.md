# Components

Reusable building blocks of the two pages. Each one is a function `createX(container, options)` that draws itself inside `container` and returns a small object with what the page needs (for example `getSelected()` or `destroy()`). The page calls `destroy()` when it is left, so nothing stays on screen or keeps listening.

| Component          | Used in      | Returns                                |
| ------------------ | ------------ | -------------------------------------- |
| `query_bar.js`     | Both pages   | `focus`, `setBusy`                     |
| `mapping_list.js`  | Both pages   | `getSelected`, `clear`, `destroy`      |
| `schema_tree.js`   | Setup page   | `getPruned`, `destroy`                 |
| `result_table.js`  | Base query   | `destroy`                              |

## Adding a component

Create `js/components/<name>.js` exporting a `createX(container, options)` function that returns a handle with `destroy()`, add `css/components/<name>.css` if it needs styles (see [`css/README.md`](../../css/README.md#adding-a-stylesheet)), and use it from a page.

---

# query_bar.js

`createQueryBar(container, { onSearch, onError })`

Taxid input + **RefSeq only** toggle + Search button. RefSeq on = RefSeq assemblies only (this is the starting state), off = any reference assembly (including GenBank). It does not call the backend: it checks the taxid and hands `{ taxid, refseq }` to `onSearch`, and the page does the request. The search starts on the Search button or the Enter key.

Returns `focus()` (put the cursor in the taxid box) and `setBusy(true/false)` (disable the Search button during a search).

**Error message** (given to `onError`): `Enter a numeric taxid` if the taxid is not made of digits only.

# mapping_list.js

`createMappingList(container, { onSelect })`

Left panel listing the saved mappings, taken from `store.js`. It refreshes by itself when a mapping is added or removed (it subscribes to the store). Click a mapping to select it, click again to deselect it; `onSelect(name)` is called with the selected name, or `null`. If the selected mapping is removed, the selection is cleared. Hovering a mapping shows its taxid, RefSeq setting and record count.

Returns `getSelected()`, `clear()` (deselect) and `destroy()` (unsubscribe from the store).

When there is no mapping, it shows `No saved mappings yet`.

# schema_tree.js

`createSchemaTree(container, { structure, total })`

Interactive tree of the NCBI report fields, built from a structure (as returned by the backend `/structure` route or stored in a mapping) and the total number of reports. Root keys are on the left, and the fields of a branch are drawn to its right.

- **Colours**: each branch is coloured by how often the field exists, from the lowest percentage in the data (red) to 100% (green). A branch that has children takes the colour of the best selected field below it. The legend at the top right shows the range. A deselected branch is grey and dashed.
- **Selection**: click a field to deselect or restore it. Click a branch: if anything below it is selected, everything below is deselected and the branch collapses; otherwise everything below is selected and expanded again. The top left counter gives `<selected> of <all> fields selected`.
- **Tooltip** (on hover, or on keyboard focus): the full path of the field, then `<count>/<total> records (<percentage>)` for a field, or the best count and number of selected fields for a branch, then a hint about what a click does. The curves from the root to the field are highlighted.

Returns `getPruned()`, the selected fields in the same format as the structure it was built from (unselected fields and empty branches removed, which is what is saved as a mapping), and `destroy()`.

# result_table.js

`createResultTable(container, { columns, rows })`, where `rows` is a list of `[accession, record]` pairs.

Paged result table: first column is the accession, then one column per field, one row per record.

- A column header shows the last part of the field path (`organism_name`); hover it to see the full path (`organism.organism_name`).
- Cells that are lists or dicts are shown as JSON. A missing value is an empty cell.
- Each column is as wide as its longest value (or its name), so values are shown in full, and a wide table scrolls left and right.
- The number of rows per page is computed from the screen height so a page fills the screen, and it is recomputed when the window is resized (the first visible row stays on the page).
- **Previous** and **Next** change page (disabled on the first and last page). The pager shows `Rows 1–8 of 901 · page 1/113`.

Returns `destroy()`.
