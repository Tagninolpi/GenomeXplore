from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.artifact_links.common import LinkError
from backend.final_export.final_export import build_final_export
from backend.raw_data.ena_runs import DATA_TYPES, check_data_type
from backend.routers.ncbi import _reports

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportIn(BaseModel):  # structure of the json sent by the button
    taxid: str = Field(pattern=r"^\d+$")  # the taxid of the search
    refseq: bool
    accessions: list[str] = Field(min_length=1)  # the genomes of the table
    data_types: list[str] = Field(default=["RNA-Seq"], min_length=1)  # one pass per data type


@router.get("/data-types")
def list_data_types():
    """The data types ENA knows (RNA-Seq, ChIP-Seq, Hi-C...), for the menu next to the export button."""
    return DATA_TYPES


@router.post("")
def export_genomes(body: ExportIn):
    """Build the final export of the genomes of the table.

    The table only has the fields chosen in the mapping, so the taxid, species name and assembly name
    of each genome are taken from the raw NCBI reports of the search (already in the cache).
    The taxid of each genome is its own species, not the taxid of the search (e.g. 9397 = all bats).
    """
    # check the data types before the long work, so a typo is refused straight away
    try:
        data_types = [check_data_type(data_type) for data_type in body.data_types]
    except LinkError as error:
        raise HTTPException(status_code=422, detail=str(error))

    reports = {report["accession"]: report for report in _reports(body.taxid, body.refseq)}

    genomes, not_found = [], []
    for accession in body.accessions:
        report = reports.get(accession)
        if report is None:
            not_found.append(accession)
            continue
        organism = report.get("organism", {})
        genomes.append({
            "source": "NCBI",
            "accession": accession,
            "taxid": organism.get("tax_id"),
            "species": organism.get("organism_name"),
            "assembly_name": report.get("assembly_info", {}).get("assembly_name"),
        })

    export = build_final_export(genomes, data_types)
    for accession in not_found:
        export["problems"].append({"step": "input", "source": "NCBI", "accession": accession,
                                   "message": "not in the results of the search, search again before exporting"})
    return export
