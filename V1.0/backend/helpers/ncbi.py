import requests


def fetch_all_NCBI_reports(taxon, true_refseq=True, page_size=1000):
    """Download the raw NCBI assembly reports of one taxon. Returns a list of dicts.

    taxon        taxid (e.g. 9606)
    true_refseq  True  = only assemblies of the RefSeq database
                 False = no database filter: reference assemblies of RefSeq AND GenBank
                         (so it also includes the GenBank ones not yet in RefSeq)
    page_size    how many reports NCBI sends per request (1000 is the maximum we use)
    """
    URL = f"https://api.ncbi.nlm.nih.gov/datasets/v2/genome/taxon/{taxon}/dataset_report"

    # A session reuses the same connection for all the requests below (faster).
    session = requests.Session()

    # Filters sent to NCBI with every request:
    #   reference_only = only reference/representative assemblies (not every assembly of the taxon)
    params = {"page_size": page_size, "filters.reference_only": "true"}
    if true_refseq:
        params["filters.assembly_source"] = "refseq"   # without this filter NCBI uses "all"

    reports = []
    # NCBI sends the results in pages. Each answer contains a "next_page_token" as long as
    # there are more pages; we send that token back to get the next page, until it is absent.
    while True:
        response = session.get(URL, params=params, timeout=60)   # give up after 60 s
        response.raise_for_status()      # HTTP error (404, 500...) -> raise instead of going on
        data = response.json()
        reports.extend(data.get("reports", []))   # "reports" is missing when nothing was found
        token = data.get("next_page_token")
        if not token:                    # no token = that was the last page
            break
        params["page_token"] = token     # asks for the next page on the next round
        #print(f"{len(reports)} / {data.get('total_count', '?')}")
    return reports
