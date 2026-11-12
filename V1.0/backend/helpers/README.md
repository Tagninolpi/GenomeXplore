# ncbi.py
fetch_all_NCBI_reports(taxid, true_refseq)
downloads all the raw assembly reports of a taxon from the NCBI Datasets API (page by page).
true_refseq=True keeps only RefSeq assemblies, `False` keeps all reference assemblies (RefSeq and GenBank).

# raw_cache.py
Keeps the raw reports of the **last** search `(taxid, refseq)` in memory.
Both pages need the same raw data for the same request, so it is fetched once and reused.
A different search replaces it, and a restart empties it.

# structure.py

build_structure(reports) merges all the reports into one dict of their fields, where each leaf holds the number of reports that have it.

# flatten.py
build_table(reports, structure)
keeps only the fields of a mapping and turns each report into one flat row (columns named by their full path, e.g. `organism.organism_name`). 
Rows are keyed by accession, and a field a report lacks stays empty.

# mappings.py
Reads and writes the saved mappings in the local JSON file: `list_all`, `get`, `add`, `delete`.
Writes are protected against double clicks and cannot corrupt the file.
