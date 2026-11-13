"""Collect the chosen runs of several species and write them into one JSON file (nothing is downloaded).

For each species and each data type (one "pass" per data type), it gets the runs from ENA
(ena_runs), chooses the representative ones (select_runs), and keeps them with the reason of each choice.
"""

import time
from datetime import datetime

from backend.artifact_links.common import LinkError
from backend.artifact_links.export import write_export  # same way of writing the file
from backend.raw_data.ena_runs import ena_runs
from backend.raw_data.select_runs import EXCLUDED_SOURCES, MAX_RUNS, MIN_BASES, select_runs

FORMAT_NAME = "genomexplore-raw-data"
FORMAT_VERSION = "1.0"  # to change when the structure of the file changes

PAUSE = 0.2  # seconds between two requests to ENA


def collect_raw_data(species_list, data_types=("RNA-Seq",), max_runs=MAX_RUNS, min_bases=MIN_BASES):
    """Collect the chosen runs of a list of species.

    species_list: a list of dicts, each with "taxid" and optionally "species" (the name, only to make the file easier to read).
    data_types: one pass per data type, e.g. ("RNA-Seq", "ChIP-Seq").

    A species that fails goes into "problems" with its message; the others still get their runs.
    A species with no run is not a problem: it is kept with an empty list.
    """
    export = {
        "format": FORMAT_NAME,
        "format_version": FORMAT_VERSION,
        "created": datetime.now().isoformat(timespec="seconds"),
        "selection": {
            "method": "rules",
            "source": "ENA (also contains the runs of SRA and DDBJ)",
            "data_types": list(data_types),
            "max_runs": max_runs,
            "min_bases": min_bases,
            "excluded_sources": sorted(EXCLUDED_SOURCES),
        },
        "species": [],
        "problems": [],
    }

    first = True
    for entry in species_list:
        taxid, name = entry["taxid"], entry.get("species")
        for data_type in data_types:
            if not first:
                time.sleep(PAUSE)
            first = False

            try:
                found = ena_runs(taxid, data_type)
            except LinkError as error:
                export["problems"].append({"taxid": str(taxid), "species": name,
                                           "data_type": data_type, "message": str(error)})
                continue

            choice = select_runs(found["runs"], max_runs, min_bases)
            export["species"].append({
                "taxid": found["taxid"],
                "species": name,
                "data_type": found["data_type"],
                "total_runs": found["total_runs"],   # how many runs ENA has
                "complete": found["complete"],       # False when we could only read part of them
                "runs_useful": choice["runs_useful"],
                "runs": choice["selected"],
            })

    return export
