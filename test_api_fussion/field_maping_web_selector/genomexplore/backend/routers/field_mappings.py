from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.helpers import mappings

router = APIRouter(prefix="/api/field-mappings", tags=["field-mappings"])

MAX_DEPTH = 32


class MappingIn(BaseModel):
    name: str
    total: int = Field(ge=1)
    taxid: str = Field(pattern=r"^\d+$")
    refseq: bool
    structure: dict


def _check_structure(node, total, depth=0):
    """Same shape as build_structure's output: branches are non-empty dicts,
    leaves are record counts between 1 and total."""
    if depth > MAX_DEPTH:
        raise ValueError("structure is nested too deeply")
    if not isinstance(node, dict) or not node:
        raise ValueError("every branch of the structure must be a non-empty object")
    for key, value in node.items():
        if isinstance(value, dict):
            _check_structure(value, total, depth + 1)
        elif isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= total:
            raise ValueError(f'"{key}" must be a count between 1 and {total}')


@router.get("")
def list_mappings():
    try:
        return mappings.list_all()
    except mappings.StoreError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("", status_code=201)
def create_mapping(body: MappingIn):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="The mapping needs a name")
    try:
        _check_structure(body.structure, body.total)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    entry = {
        "total": body.total,
        "taxid": body.taxid,
        "refseq": body.refseq,
        "structure": body.structure,
    }
    try:
        mappings.add(name, entry)
    except mappings.NameExists:
        raise HTTPException(status_code=409, detail=f'A mapping named "{name}" already exists')
    except mappings.StoreError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"name": name, **entry}


# The name travels as a query parameter: in a URL path, names like ".." or "a/b" would break routing.
@router.delete("", status_code=204)
def delete_mapping(name: str = Query(..., min_length=1)):
    try:
        mappings.delete(name)
    except mappings.NotFound:
        raise HTTPException(status_code=404, detail=f'No mapping named "{name}"')
    except mappings.StoreError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
