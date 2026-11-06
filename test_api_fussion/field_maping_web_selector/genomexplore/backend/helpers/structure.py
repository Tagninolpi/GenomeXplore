"""Count how often each field exists across a list of nested dicts.

Rules (as specified):
- The first dict gives the skeleton: dict values are kept as branches,
  every other value becomes a leaf with count 1.
- For each following dict, every non-dict value adds 1 to the matching
  leaf, creating the leaf (count 1) if it does not exist yet.

Two edge cases:
- An empty dict ({}) is counted as a leaf, otherwise it would be a branch
  with nothing under it and could never be coloured.
- If the same key is a dict in one record and a plain value in another,
  the first shape wins and the clashing value is ignored.
"""


def _is_branch(value):
    return isinstance(value, dict) and bool(value)


def _skeleton(d):
    return {k: _skeleton(v) if _is_branch(v) else 1 for k, v in d.items()}


def _merge(acc, d):
    for key, value in d.items():
        if key not in acc:
            acc[key] = _skeleton(value) if _is_branch(value) else 1
        elif isinstance(acc[key], dict):
            if _is_branch(value):
                _merge(acc[key], value)
        elif not _is_branch(value):
            acc[key] += 1


def build_structure(records):
    """Return a dict with the structure of `records` and, at every leaf,
    the number of records in which that value exists."""
    acc = {}
    for record in records:
        _merge(acc, record)
    return acc
