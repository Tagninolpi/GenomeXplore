"""Keeps the raw NCBI reports of the *current* search only.

Both pages need the same raw list for the same (taxid, refseq). The first call
fetches it; later calls with the same key reuse it. A different key replaces
the stored entry. Nothing is persisted: a restart or reload empties the cache.

The returned list is shared, so callers must treat it as read-only.
"""
import threading

from backend.helpers.ncbi import fetch_all_NCBI_reports

_lock = threading.Lock()
_key = None
_reports = None


def get_reports(taxid, refseq):
    global _key, _reports
    key = (int(taxid), bool(refseq))
    with _lock:
        if key != _key:
            reports = fetch_all_NCBI_reports(taxid, true_refseq=refseq)
            # Only replace the cached entry once the fetch fully succeeded.
            _key, _reports = key, reports
        return _reports
