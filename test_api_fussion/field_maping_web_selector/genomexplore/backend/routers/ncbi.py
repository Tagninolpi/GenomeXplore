from fastapi import APIRouter, HTTPException, Query
import requests

from backend.helpers import mappings
from backend.helpers.flatten import build_table
from backend.helpers.raw_cache import get_reports
from backend.helpers.structure import build_structure

router = APIRouter(prefix="/api/ncbi", tags=["ncbi"])


def _reports(taxid, refseq):
    try:
        return get_reports(taxid, refseq)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"NCBI request failed: {exc}")


@router.get("/structure")
def ncbi_structure(
    taxid: str = Query(..., pattern=r"^\d+$"),
    refseq: bool = True,
):
    """Setup page: count dict (structure) of the raw reports."""
    reports = _reports(taxid, refseq)
    return {
        "taxid": taxid,
        "refseq": refseq,
        "total": len(reports),
        "structure": build_structure(reports),
    }


@router.get("/query")
def ncbi_query(
    taxid: str = Query(..., pattern=r"^\d+$"),
    refseq: bool = True,
    mapping: str | None = None,
):
    """Base query page: {accession: {column: value}} limited to the mapping's fields."""
    structure = None
    if mapping:
        # Resolve the mapping first, so a bad name fails before the slow NCBI fetch.
        try:
            structure = mappings.get(mapping)["structure"]
        except mappings.NotFound:
            raise HTTPException(status_code=404, detail=f'No mapping named "{mapping}"')
        except mappings.StoreError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
    reports = _reports(taxid, refseq)
    columns, rows = build_table(reports, structure)
    return {
        "taxid": taxid,
        "refseq": refseq,
        "mapping": mapping or None,
        "total": len(rows),
        "columns": columns,
        "rows": rows,
    }
