"""Get the raw sequencing runs of one species from ENA, as a clean list (nothing is downloaded).

ENA also contains the runs of SRA and DDBJ,
so one request covers the three databases. GSA (China) is not included.
"""

from artifact_links.scripts_artifact_links.common import LinkError, fetch

SOURCE = "ENA"
SEARCH_URL = "https://www.ebi.ac.uk/ena/portal/api/search"
COUNT_URL = "https://www.ebi.ac.uk/ena/portal/api/count"

# The fields we ask ENA for, for each run.
FIELDS = [
    "run_accession", "study_accession", "sample_accession", "study_title", "sample_title",
    "tissue_type", "cell_type", "dev_stage", "sex",
    "library_layout", "library_source", "instrument_model", "read_count", "base_count",
    "fastq_ftp", "fastq_bytes", "fastq_md5",
]

# Free-text fields written by the submitters put in lower case
TEXT_FIELDS = ["tissue_type", "cell_type", "dev_stage", "sex"]

# Words some submitters write instead of leaving a field empty. They become None.
MISSING_WORDS = {
    "missing", "not collected", "not applicable", "not provided", "unknown",
    "na", "n/a", "none", "-",
}

# The data types (library strategies) ENA knows, copied from
# https://www.ebi.ac.uk/ena/portal/api/controlledVocab?field=library_strategy (2026-11-09).
# ENA does not refuse an unknown data type, it just finds 0 runs, so we check it ourselves.
DATA_TYPES = [
    "AMPLICON", "ATAC-seq", "Bisulfite-Seq", "CLONE", "CLONEEND", "CTS", "ChIA-PET", "ChIP-Seq",
    "ChM-Seq", "DNase-Hypersensitivity", "EST", "FAIRE-seq", "FINISHING", "FL-cDNA", "GBS", "Hi-C",
    "MBD-Seq", "MNase-Seq", "MRE-Seq", "MeDIP-Seq", "NOMe-Seq", "OTHER", "POOLCLONE", "RAD-Seq",
    "RIP-Seq", "RNA-Seq", "Ribo-Seq", "SELEX", "Synthetic-Long-Read", "Targeted-Capture",
    "Tethered Chromatin Conformation Capture", "Tn-Seq", "VALIDATION", "WCS", "WGA", "WGS", "WXS",
    "miRNA-Seq", "ncRNA-Seq", "snRNA-seq", "ssRNA-seq",
]

# Big species have millions of runs, MAX_RUNS is the maximum number of runs we can ask for at once
MAX_RUNS = 5000


def check_data_type(data_type):
    """Give back the data type written exactly like ENA writes it ("rna-seq" -> "RNA-Seq").

    ENA needs the exact spelling, so we accept any upper/lower case and correct it.
    A data type ENA doesn't know at all ("RNAseq") is refused with a clear message.
    """
    for known in DATA_TYPES:
        if data_type.strip().lower() == known.lower():
            return known
    raise LinkError(
        f'"{data_type}" is not a data type known by ENA (e.g. RNA-Seq, ChIP-Seq, Hi-C, WGS)'
    )


def build_query(taxid, data_type):
    """The ENA search text, e.g. tax_eq(9685) AND library_strategy="RNA-Seq"."""
    return f'tax_eq({taxid}) AND library_strategy="{data_type}"'


def count_runs(taxid, data_type="RNA-Seq"):
    """How many runs ENA has for this species and data type."""
    params = {"result": "read_run", "query": build_query(taxid, data_type)}
    answer = fetch(COUNT_URL, "number of runs", SOURCE, params=params).text
    # The answer is two lines of text: "count" then the number.
    return int(answer.split()[-1])


def clean_text(value):
    """Lower case, no spaces around, and None for empty or "missing"-like values."""
    value = value.strip().lower()
    if value in MISSING_WORDS or value == "":
        return None
    return value


def split_files(run):
    """Turn ENA's three ";"-separated texts into a list of files: [{url, size, md5}, ...].

    A paired-end run usually has 2 files (_1 and _2), sometimes a third one.
    ENA gives the paths without "https://", so we add it.
    """
    if not run["fastq_ftp"]:
        return []
    paths = run["fastq_ftp"].split(";")
    sizes = run["fastq_bytes"].split(";")
    md5s = run["fastq_md5"].split(";")
    files = []
    for path, size, md5 in zip(paths, sizes, md5s):
        files.append({"url": "https://" + path, "size": int(size) if size else None, "md5": md5 or None})
    return files


def clean_run(run):
    """One raw ENA run -> one clean dict."""
    clean = {
        "run_accession": run["run_accession"],
        "study_accession": run["study_accession"],
        "sample_accession": run["sample_accession"],
        "study_title": run["study_title"] or None,
        "sample_title": run["sample_title"] or None,
        "layout": run["library_layout"] or None,
        "library_source": run["library_source"] or None,
        "instrument": run["instrument_model"] or None,
        "read_count": int(run["read_count"]) if run["read_count"] else None,
        "base_count": int(run["base_count"]) if run["base_count"] else None,
        "fastq": split_files(run),
    }
    for field in TEXT_FIELDS:
        clean[field] = clean_text(run[field])
    return clean


def ena_runs(taxid, data_type="RNA-Seq", max_runs=MAX_RUNS):
    """Get the runs of one species (taxid) for one data type (RNA-Seq, ChIP-Seq, Hi-C...).

    Returns:
    {"source": "ENA", "taxid": "9685", "data_type": "RNA-Seq",
     "total_runs": 2000,      how many runs ENA has in total
     "complete": True,        False when total_runs > max_runs (we only got part of them)
     "runs": [{...}, ...]}
    """
    taxid = str(taxid).strip()
    if not taxid.isdigit():
        raise LinkError(f'"{taxid}" is not a valid taxid (it must be a number, e.g. 9685)')
    data_type = check_data_type(data_type)

    total = count_runs(taxid, data_type)
    runs = []
    if total > 0:
        params = {
            "result": "read_run",
            "query": build_query(taxid, data_type),
            "fields": ",".join(FIELDS),
            "limit": min(total, max_runs),
            "format": "json",
        }
        answer = fetch(SEARCH_URL, f"list of {data_type} runs", SOURCE, params=params)
        runs = [clean_run(run) for run in answer.json()]

    return {
        "source": SOURCE,
        "taxid": taxid,
        "data_type": data_type,
        "total_runs": total,
        "complete": total <= max_runs,
        "runs": runs,
    }
