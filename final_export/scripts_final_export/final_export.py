"""The final export: for each species, its genomes (with the links to their files) and its raw data runs, in one JSON file.

The genomes and the runs are joined by the taxid of the species: the raw reads belong to a species,
not to one assembly, so the runs are searched only once per species even if it has several genomes.
Nothing is downloaded, only the links.
"""

import time
from datetime import datetime

from artifact_links.scripts_artifact_links.export import PAUSE, collect_links, write_export
from raw_data.scripts_raw_data.raw_data_export import collect_raw_data

FORMAT_NAME = "genomexplore-export"
FORMAT_VERSION = "1.0"  # to change when the structure of the file changes


def build_final_export(genomes, data_types=("RNA-Seq",)):
    """Build the final export of a selection of genomes.

    genomes: a list of dicts, each with "source" ("NCBI", "GWH" or "Ensembl"), "accession" and "taxid",
    plus optionally "species" and the extra information the link scripts can use (assembly_name, folder_url).
    data_types: the raw data types to look for (one pass per data type).

    """
    export = {
        "format": FORMAT_NAME,
        "format_version": FORMAT_VERSION,
        "created": datetime.now().isoformat(timespec="seconds"),
        "raw_data_selection": None,
        "species": [],
        "problems": [],
    }

    # group the genomes by species (taxid), keeping the order in which they were given.
    by_taxid = {}
    for genome in genomes:
        taxid = str(genome.get("taxid") or "").strip()
        if not taxid:
            export["problems"].append({"step": "input", "source": genome.get("source"),
                                       "accession": genome.get("accession"),
                                       "message": "no taxid given, so the genome can't be joined to its species"})
            continue
        if taxid not in by_taxid:
            by_taxid[taxid] = {"taxid": taxid, "species": genome.get("species"), "genomes": [], "raw_data": []}
        by_taxid[taxid]["genomes"].append(genome)

    # The links of each genome (one genome at a time, with the same pause as export.py).
    for n, group in enumerate(by_taxid.values()):
        given = group["genomes"]
        group["genomes"] = []
        for i, genome in enumerate(given):
            if n > 0 or i > 0:
                time.sleep(PAUSE)
            result = collect_links([genome])
            group["genomes"].extend(result["genomes"])
            for problem in result["problems"]:
                export["problems"].append({"step": "links", "taxid": group["taxid"], **problem})
        # if no species name was given, take the one found by the link scripts
        if not group["species"] and group["genomes"]:
            group["species"] = group["genomes"][0].get("species")

    #the raw data, once per species.
    species_list = [{"taxid": group["taxid"], "species": group["species"]} for group in by_taxid.values()]
    raw = collect_raw_data(species_list, data_types)
    export["raw_data_selection"] = raw["selection"]
    for entry in raw["species"]:
        group = by_taxid[entry["taxid"]]
        group["raw_data"].append({key: value for key, value in entry.items() if key not in ("taxid", "species")})
    for problem in raw["problems"]:
        export["problems"].append({"step": "raw data", **problem})

    export["species"] = list(by_taxid.values())
    return export
