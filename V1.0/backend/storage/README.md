# `storage/field_mappings.json`

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
