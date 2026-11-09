import json
import time
from datetime import datetime

from .common import LinkError
from .ensembl_links import ensembl_links
from .gwh_links import gwh_links
from .ncbi_links import ncbi_links

FORMAT_NAME = "genomexplore-artifact-links"
FORMAT_VERSION = "1.0"  # to change when the structure of the file changes

# database specific script
SCRIPTS = {"NCBI": ncbi_links, "GWH": gwh_links, "Ensembl": ensembl_links}

# extra information each script can receive (e.g. from the search results)
EXTRAS = {
    "NCBI":    ("assembly_name", "species"),
    "GWH":     ("folder_url", "species"),
    "Ensembl": ("folder_url", "species"),
}

PAUSE = 0.4  # seconds between two genomes: NCBI allows ~5 requests per second and uses 2 per genome


def collect_links(genomes):
    """Collect the links of a list of genomes.

    genomes: a list of dicts, each with "source" ("NCBI", "GWH" or "Ensembl") and
    "accession", plus optionally the extra information listed in EXTRAS.

    A genome that fails goes into "problems" with its message; the others still get their links.
    """
    export = {
        "format": FORMAT_NAME,
        "format_version": FORMAT_VERSION,
        "created": datetime.now().isoformat(timespec="seconds"),
        "genomes": [],
        "problems": [],
    }

    for i, genome in enumerate(genomes):
        source, accession = genome["source"], genome["accession"]
        if i > 0:
            time.sleep(PAUSE)

        if source not in SCRIPTS:
            export["problems"].append({"source": source, "accession": accession,
                                       "message": f"unknown database {source!r} (expected NCBI, GWH or Ensembl)"})
            continue

        extras = {key: genome[key] for key in EXTRAS[source] if genome.get(key)}
        try:
            result = SCRIPTS[source](accession, **extras)
        except LinkError as error:
            export["problems"].append({"source": source, "accession": accession, "message": str(error)})
            continue

        export["genomes"].append({"source": source, **result})

    return export


def write_export(export, path):
    """Write the export into a JSON file."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(export, f, indent=2, ensure_ascii=False)
