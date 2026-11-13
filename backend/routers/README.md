# Routers

Routers receive the requests sent by the frontend, check the input and call the helpers. They contain very little logic: the work is done in [`helpers/`](../helpers/README.md) (the [backend README](../README.md#how-the-scripts-work-together) shows which helpers each route calls). Both routers are registered in `main.py`, and each serves one page of the app.

When a request fails, the router answers with an error message. The frontend (`js/api.js`) displays it in red in the status line of the page. The messages of each router are listed below.

| Router              | Route prefix          | Used by (frontend)                                                     |
| ------------------- | --------------------- | ---------------------------------------------------------------------- |
| `field_mappings.py` | `/api/field-mappings` | `store.js`: mapping list on both pages, add and remove                 |
| `ncbi.py`           | `/api/ncbi`           | `setup_field_mapping.js` (`/structure`) and `base_query.js` (`/query`) |

---

# field_mappings.py

Manages the saved field mappings. The router never touches the JSON file itself: every read and write goes through `helpers/mappings.py` (file format in [`storage/`](../storage/README.md)).

## Validation

- **`MappingIn`**: the format of a mapping sent by the frontend (`name`, `total` ≥ 1, `taxid` digits only, `refseq` true/false, `structure`). A request that does not match is refused.
- **`structure_error(node, total)`**: checks the `structure` recursively. No branch may be empty, and every leaf must be a whole number count between 1 and `total` (the number of reports of the original search). It returns an error message, or `None` if the structure is valid.

## Endpoints

| Method   | Calls                 | What it does                                                                                                                      |
| -------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `mappings.list_all()` | Returns all the saved mappings as a list (`name`, `total`, `taxid`, `refseq`, `structure`), in creation order.                    |
| `POST`   | `mappings.add()`      | Validates the mapping (`MappingIn` and `structure_error`), then saves it. Returns the saved mapping.                              |
| `DELETE` | `mappings.delete()`   | Removes the mapping whose name is given in the query parameter `name`. Returns nothing.                                           |

## Error messages

| When                                                                     | Message                                                  |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| `POST`: a branch of the structure has no field                           | `a branch of the structure is empty`                     |
| `POST`: a leaf is not a valid count                                      | `"<field>" must be a count between 1 and <total>`        |
| `POST`: the name is already used                                         | `A mapping named "<name>" already exists`                |
| `POST`: wrong format (`MappingIn`: missing name, taxid not digits...)    | Automatic validation error, shown as a generic "Request failed" message |
| `DELETE`: the name does not exist                                        | `No mapping named "<name>"`                              |

## How the page copy and the file stay identical

- The JSON file is the reference copy: it keeps the mappings after a page refresh, a disconnection or a server restart.
- The frontend (`store.js`) fetches the list **once** with `GET` and keeps it in memory, so selecting a mapping never needs a request.
- After a `POST` or `DELETE`, `store.js` updates its own copy **only once the backend has confirmed success**, then refreshes the list on screen. A failed request changes nothing, so the page and the file always agree.
- Duplicate names are refused twice: by the Setup page before sending, and by the backend as the final check.

---

# ncbi.py

Both endpoints take a `taxid` (digits only) and a `refseq` setting (default `true`). Neither downloads anything directly: they call the internal function `_reports(taxid, refseq)`, which gets the reports from [`raw_cache.get_reports()`](../helpers/README.md#raw_cachepy) and turns an NCBI failure into an error message. A `/structure` search followed by a `/query` with the same `taxid` and `refseq` therefore needs only one NCBI request.

## Endpoints

### `GET /structure`

Used by the **Setup field mapping** page to build the schema tree. It does not use the saved mappings.

1. Gets the raw reports (`_reports`).
2. Calls `structure.build_structure(reports)` to count how many reports have each field.
3. Returns `{ taxid, refseq, total, structure }`, where `total` is the number of reports found.

### `GET /query`

Used by the **Base query** page to get the result table. It has one more required parameter: `mapping`, the name of the saved mapping to apply.

1. Loads the mapping with `mappings.get(mapping)`.
2. Gets the raw reports (`_reports`).
3. Calls `flatten.build_table(reports, mapping["structure"])` to keep only the mapped fields, as one flat row per report.
4. Returns `{ total, columns, rows }`: `total` is the number of rows, `columns` the full field paths (e.g. `organism.organism_name`), and `rows` a dict `{ accession: { column: value } }`.

Only the **fields** of the mapping are used. Its stored `taxid`, `refseq` and `total` just document the search it was created from, so a mapping can be applied to any taxid.

## Error messages

| When                                                          | Message                                                                       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/query`: the mapping name does not exist                     | `No mapping named "<name>"`                                                   |
| The NCBI request fails (network error, NCBI error or timeout) | `NCBI request failed: <reason>`, where the reason is the underlying error text |
| Either route: `taxid` is not digits, or `mapping` is missing  | Automatic validation error, shown as a generic "Request failed" message       |

A search that finds nothing is not an error: the routes return `total: 0` and the page shows "0 records". The frontend also checks the taxid before sending, so the validation error is rarely seen.
