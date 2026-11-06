"""Turn raw NCBI reports into table rows: {accession: {column: value}}.

With a mapping, the mapping's leaf paths are compiled ONCE into a list of
(column name, path) and each report is read only at those paths (plain dict
lookups that stop at the first missing key). Fields outside the mapping are
never touched. Without a mapping, every report is flattened recursively.

Column name = full dotted path ("assembly_info.assembly_name"). Values are kept
as they are (lists stay lists); a field a record does not have is simply absent
from that record's row.
"""

_MISSING = object()
ACCESSION = "accession"


def compile_paths(structure):
    """Leaf paths of a (pruned) structure dict, in order: [("a", "b"), ...].

    Same leaf rule as structure.build_structure: a non-empty dict is a branch,
    anything else (counts in the saved mappings) is a leaf.
    """
    paths = []

    def walk(node, prefix):
        for key, value in node.items():
            path = prefix + (key,)
            if isinstance(value, dict) and value:
                walk(value, path)
            else:
                paths.append(path)

    walk(structure, ())
    return paths


def _lookup(record, path):
    cur = record
    for key in path:
        if not isinstance(cur, dict) or key not in cur:
            return _MISSING
        cur = cur[key]
    return cur


def flatten_record(record, prefix="", out=None):
    """Recursive flatten; an empty dict is kept as a value (as in build_structure)."""
    if out is None:
        out = {}
    for key, value in record.items():
        name = prefix + key
        if isinstance(value, dict) and value:
            flatten_record(value, name + ".", out)
        else:
            out[name] = value
    return out


def build_table(reports, structure=None):
    """Return (columns, rows). The accession is the row key, not a column."""
    rows = {}
    if structure is None:
        columns = {}  # ordered set: union of keys in order of first appearance
        for i, record in enumerate(reports):
            flat = flatten_record(record)
            acc = flat.pop(ACCESSION, None)
            rows[acc if isinstance(acc, str) else f"unknown_{i}"] = flat
            columns.update(dict.fromkeys(flat))
        return list(columns), rows

    plan = [
        (".".join(path), path)
        for path in compile_paths(structure)
        if path != (ACCESSION,)
    ]
    for i, record in enumerate(reports):
        row = {}
        for name, path in plan:
            value = _lookup(record, path)
            if value is not _MISSING:
                row[name] = value
        acc = record.get(ACCESSION)
        rows[acc if isinstance(acc, str) else f"unknown_{i}"] = row
    return [name for name, _ in plan], rows
