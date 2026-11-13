"""Saved field mappings, stored in one local JSON file.

File layout: {name: {"total": int, "taxid": str, "refseq": bool, "structure": {...}}}

examples : 

{
 "Human_basic": {"total": 1, "taxid": "9606", "refseq": true,
                 "structure": {"accession": 1, "organism": {"organism_name": 1}}},
 "Ecoli":       {"total": 230, "taxid": "562", "refseq": true, "structure": {...}}
}

list_all()               # [{"name": "Human_basic", "total": 1, "taxid": "9606", ...},
                         #  {"name": "Ecoli", "total": 230, ...}]
get("Ecoli")             # {"total": 230, "taxid": "562", "refseq": True, "structure": {...}}
get("nope")              # None
add("New", entry)        # True  (saved)
add("New", entry)        # False (the name already exists, nothing changed)
delete("New")            # True
delete("New")            # False (already gone)
"""
import json
import threading
from pathlib import Path

STORE = Path(__file__).resolve().parent.parent / "storage" / "field_mappings.json"
_lock = threading.Lock()   # one add/delete at a time (a double click sends two requests)


def _read():
    if not STORE.exists():
        return {}
    return json.loads(STORE.read_text(encoding="utf-8"))


def _write(data):
    STORE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STORE.with_suffix(".tmp")                    # write a copy first...
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    tmp.replace(STORE)                                 # ...then swap it in (all or nothing)


def list_all():
    """Every mapping in creation order: [{"name": ..., "total": ..., ...}, ...]"""
    return [{"name": name, **entry} for name, entry in _read().items()]


def get(name):
    """The mapping's entry, or None if there is no such name."""
    return _read().get(name)


def add(name, entry):
    """Save a new mapping. Returns False (saves nothing) if the name already exists."""
    with _lock:
        data = _read()
        if name in data:
            return False
        data[name] = entry
        _write(data)
        return True


def delete(name):
    """Remove a mapping. Returns False if there is no such name."""
    with _lock:
        data = _read()
        if name not in data:
            return False
        del data[name]
        _write(data)
        return True
