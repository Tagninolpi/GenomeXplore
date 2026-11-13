# storage

Local data saved by the app. For now it holds one file.

# `field_mappings.json`

The saved field mappings, read and written only by [`helpers/mappings.py`](../helpers/README.md#mappingspy) (through the `field_mappings` router). It is created on the first save.

Each top-level key is the **mapping name**:

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

| Field       | Meaning                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| `total`     | Number of NCBI reports found when the mapping was created                                                  |
| `taxid`     | Taxid of that search                                                                                       |
| `refseq`    | `true` = RefSeq only, `false` = all reference assemblies                                                   |
| `structure` | The selected fields. Branches are nested dicts, and each leaf is the number of reports that have the field |

Only `structure` is used to build a result table. The other fields document the search the mapping was created from.

## Sharing and editing by hand

- To share mappings, send this file, or copy only the entries you want into someone else's file. Names must stay unique.
- Mappings created in the app are validated when they are saved, but entries added by hand are **not** checked. Keep the format above (no empty branch, each leaf a count between 1 and `total`).
- Edit the file while the server is stopped, or reload the page afterwards: the page keeps its own copy of the list and does not see manual changes until it is reloaded.
