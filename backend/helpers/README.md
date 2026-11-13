# Helpers

Functions that hold all the data logic of the backend. They contain no web code, so they can be tested without the server. They are called by the [routers](../routers/README.md).

| File           | Role                                                          |
| -------------- | ------------------------------------------------------------- |
| `ncbi.py`      | Download the raw reports from NCBI                            |
| `raw_cache.py` | Reuse the last download (the only way routers get NCBI data)  |
| `structure.py` | Count how often each field exists                             |
| `flatten.py`   | Turn the reports into a flat table of the mapped fields       |
| `mappings.py`  | Read and write the saved mappings                             |

---

# ncbi.py

`fetch_all_NCBI_reports(taxon, true_refseq=True, page_size=1000)` downloads all the raw assembly reports of a taxon from the NCBI Datasets API (`genome/taxon/{taxid}/dataset_report`) and returns them as a list of dicts, exactly as NCBI sends them. The list is empty if nothing is found.

- Only **reference** assemblies are requested (`filters.reference_only`).
- `true_refseq=True` adds the filter `assembly_source=refseq` (RefSeq assemblies only). `False` adds no source filter, so RefSeq **and** GenBank reference assemblies are returned.
- NCBI answers in pages (`page_size`, 1000 reports per request). The function follows the `next_page_token` until there are no more pages, so searches with RefSeq off or a large taxon can take a while.
- Each request has a 60 s timeout. A network or HTTP error stops the download and is raised as a `requests` exception. The router catches it and shows it as `NCBI request failed: <reason>`.

Routers do not call this function directly: they go through `raw_cache.py`.

# raw_cache.py

`get_reports(taxid, refseq)` returns the raw reports of a search, downloading them with `ncbi.py` only when needed.

- It keeps the reports of the **last** search `(taxid, refseq)` in memory. Both pages need the same raw data for the same request, so it is fetched once and reused.
- A different search replaces the stored one, but only after its download fully succeeded (a failed search keeps the previous data).
- Nothing is saved to disk: a server restart empties it.
- A lock lets one request at a time through, so two identical requests arriving together download the data only once.
- The returned list is shared, so it must be treated as **read-only**.

# structure.py

`build_structure(reports)` merges all the reports into one dict of their fields, where each leaf holds the number of reports that have it (`add_record` adds one report to the structure).

```python
build_structure([
    {"accession": "GCF_1", "organism": {"organism_name": "Homo sapiens", "common_name": "human"}},
    {"accession": "GCF_2", "organism": {"organism_name": "Homo sapiens"}},
])
# {"accession": 2, "organism": {"organism_name": 2, "common_name": 1}}
```

- A dict becomes a branch. Anything else (number, text, list, even an empty `{}`) is a leaf. Lists are not looked into.
- If a key is a dict in one report and a plain value in another, the first one seen wins.

# flatten.py

`build_table(reports, structure)` keeps only the fields of a mapping and turns each report into one flat row. It returns `(columns, rows)`:

- `columns`: the full path of each field, joined with dots (e.g. `organism.organism_name`).
- `rows`: `{ accession: { column: value } }`. A field a report lacks stays absent from its row (empty cell).

Details:
- `accession` is the row key, so it is not a column.
- Only the **shape** of `structure` is used (which keys exist), not its counts.
- `get_leaf_paths(structure)` lists the path of every leaf, e.g. `('organism', 'organism_name')`, and `get_value(record, path)` reads one value from a report.
- Values are kept as they are (a list or dict stays a list or dict).

# mappings.py

Reads and writes the saved mappings in the local JSON file (format in [`storage/`](../storage/README.md)).

| Function              | Returns                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `list_all()`          | All the mappings in creation order: `[{"name": ..., "total": ..., ...}, ...]` |
| `get(name)`           | The mapping's entry, or `None` if the name does not exist                     |
| `add(name, entry)`    | `True` if saved, `False` (nothing changed) if the name already exists         |
| `delete(name)`        | `True` if removed, `False` if the name does not exist                         |

- A lock allows one change at a time (a double click sends two requests).
- Writes are all-or-nothing: the new content is written to a temporary file that then replaces the real one, so the file cannot be left half-written.
- A missing file is treated as "no mappings" and is created on the first save.
