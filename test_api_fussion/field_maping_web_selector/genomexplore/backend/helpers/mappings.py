"""Saved field mappings, stored in one local JSON file.

File layout: {name: {"total": int, "taxid": str, "refseq": bool, "structure": {...}}}
Names are case-sensitive and unrestricted (they are dict keys, not file names).
Writes are atomic (temp file + rename) and serialised with a lock, so a crash or
a double click cannot leave a half-written file.
"""
import json
import os
import tempfile
import threading
from pathlib import Path

STORE = Path(__file__).resolve().parent.parent / "storage" / "field_mappings.json"
_lock = threading.Lock()


class NameExists(Exception):
    pass


class NotFound(Exception):
    pass


class StoreError(Exception):
    pass


def _read():
    try:
        with STORE.open(encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as exc:
        # Never silently start from {}: the next write would erase the user's mappings.
        raise StoreError(f"{STORE.name} is not valid JSON ({exc})") from exc
    if not isinstance(data, dict):
        raise StoreError(f"{STORE.name} must contain a JSON object")
    return data


def _write(data):
    STORE.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=STORE.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        os.replace(tmp, STORE)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def list_all():
    """Ordered list (creation order) of {"name": ..., **entry}."""
    with _lock:
        return [{"name": name, **entry} for name, entry in _read().items()]


def get(name):
    with _lock:
        data = _read()
    if name not in data:
        raise NotFound(name)
    return data[name]


def add(name, entry):
    with _lock:
        data = _read()
        if name in data:
            raise NameExists(name)
        data[name] = entry
        _write(data)


def delete(name):
    with _lock:
        data = _read()
        if name not in data:
            raise NotFound(name)
        del data[name]
        _write(data)
