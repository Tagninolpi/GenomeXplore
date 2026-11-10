"""Choose a few representative runs among all the runs of a species, with simple rules.

This is the rule-based method.
It takes the "runs" list given by ena_runs() and nothing is asked to any database.

The 3 steps:
1. remove the runs that are not useful (no FASTQ file, or too small);
2. inside each tissue, sort the runs from best to worst (paired-end first, then the deepest);
3. take one run per tissue, in rounds, each time from a study not used yet if possible.
   We never take two runs of the same study and the same tissue (they are replicates),
   so we can stop with fewer than 10 runs.
"""

MAX_RUNS = 10
MIN_BASES = 1_000_000_000  # 1 billion bases: smaller runs are removed

# Runs whose material is not RNA/DNA of the species' tissue are removed:
EXCLUDED_SOURCES = {"METATRANSCRIPTOMIC", "METAGENOMIC", "TRANSCRIPTOMIC SINGLE CELL", "GENOMIC SINGLE CELL"}


def is_useful(run, min_bases):
    """A run is kept if it has at least one FASTQ file, enough bases, and the right kind of material."""
    return (bool(run["fastq"])
            and run["base_count"] is not None and run["base_count"] >= min_bases
            and run.get("library_source") not in EXCLUDED_SOURCES)


def best_first(run):
    """Sorting key: paired-end runs before single-end ones, then the deepest first."""
    return (run["layout"] != "PAIRED", -run["base_count"])


def order_tissues(runs_by_tissue):
    """Tissues studied by the most different studies come first.

    A tissue studied by several teams is common and easier to compare between species.
    Runs without a tissue (None) always come last.
    If two tissues have the same number of studies, the one with more runs comes first,
    then alphabetical order (so the result is always the same).
    """
    def key(tissue):
        runs = runs_by_tissue[tissue]
        number_of_studies = len({run["study_accession"] for run in runs})
        return (tissue is None, -number_of_studies, -len(runs), tissue or "")
    return sorted(runs_by_tissue, key=key)


def pick_one(candidates, used_studies, used_pairs):
    """Choose one run among the (already sorted) runs of a tissue, and say why.

    Best: a run from a study not used yet.
    Otherwise: a run from a (study, tissue) pair not used yet.
    Otherwise: nothing (None, None), because the runs left are only replicates
    of a study and tissue we already have, and they would add almost nothing.
    """
    for run in candidates:
        if run["study_accession"] not in used_studies:
            return run, "from a study not used yet"
    for run in candidates:
        if (run["study_accession"], run["tissue_type"]) not in used_pairs:
            return run, "from a study already used, but not for this tissue"
    return None, None


def select_runs(runs, max_runs=MAX_RUNS, min_bases=MIN_BASES):
    """Choose at most max_runs representative runs.

    runs: the "runs" list given by ena_runs().
    Returns:
    {"method": "rules", "settings": {...},
     "runs_given": 2000,        how many runs we started from
     "runs_useful": 1700,       how many were left after step 1
     "selected": [{...run..., "reason": "round 1: tissue 'heart', from a study not used yet"}, ...]}
    """
    # Step 1: remove the runs that are not useful.
    useful = [run for run in runs if is_useful(run, min_bases)]

    # Step 2: group the runs by tissue, best runs first inside each tissue.
    runs_by_tissue = {}
    for run in useful:
        runs_by_tissue.setdefault(run["tissue_type"], []).append(run)
    for tissue_runs in runs_by_tissue.values():
        tissue_runs.sort(key=best_first)
    tissues = order_tissues(runs_by_tissue)

    # Step 3: one run per tissue, round after round, until we have enough.
    selected = []
    used_runs = set()
    used_studies = set()
    used_pairs = set()
    round_number = 0
    while len(selected) < max_runs:
        round_number += 1
        added_this_round = 0
        for tissue in tissues:
            if len(selected) == max_runs:
                break
            candidates = [run for run in runs_by_tissue[tissue] if run["run_accession"] not in used_runs]
            if not candidates:
                continue  # every run of this tissue is already taken
            run, why = pick_one(candidates, used_studies, used_pairs)
            if run is None:
                continue  # only replicates left for this tissue
            selected.append({**run, "reason": f"round {round_number}: tissue {tissue!r}, {why}"})
            used_runs.add(run["run_accession"])
            used_studies.add(run["study_accession"])
            used_pairs.add((run["study_accession"], run["tissue_type"]))
            added_this_round += 1
        if added_this_round == 0:
            break  # nothing new to add: we stop, even with fewer than max_runs runs

    return {
        "method": "rules",
        "settings": {"max_runs": max_runs, "min_bases": min_bases,
                     "excluded_sources": sorted(EXCLUDED_SOURCES)},
        "runs_given": len(runs),
        "runs_useful": len(useful),
        "selected": selected,
    }
