from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.helpers import mappings

router = APIRouter(prefix="/api/field-mappings", tags=["field-mappings"])


class MappingIn(BaseModel): # structure of the json form save mapping request
    name: str
    total: int = Field(ge=1)
    taxid: str = Field(pattern=r"^\d+$")
    refseq: bool
    structure: dict


def structure_error(node, total):
    """Return a message if `node` is not a valid pruned structure, else None."""
    if not node:
        return "a branch of the structure is empty" # if you create a structure with one taxid but use an other to do a new request, might cause issue
    for key, value in node.items():
        if isinstance(value, dict):
            error = structure_error(value, total)
            if error:
                return error
        elif isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= total:
            return f'"{key}" must be a count between 1 and {total}'
    return None


@router.get("")
def list_mappings():
    return mappings.list_all()

@router.post("")
def create_mapping(body: MappingIn):
    error = structure_error(body.structure, body.total)
    if error:
        raise HTTPException(status_code=422, detail=error)
    entry = body.model_dump(exclude={"name"})
    if not mappings.add(body.name, entry):
        raise HTTPException(status_code=409, detail=f'A mapping named "{body.name}" already exists')
    return {"name": body.name, **entry}


@router.delete("", status_code=204)
def delete_mapping(name: str = Query(..., min_length=1)):
    if not mappings.delete(name):
        raise HTTPException(status_code=404, detail=f'No mapping named "{name}"')
