import requests


def fetch_all_NCBI_reports(taxon,true_refseq=True,page_size=1000):
    URL = f"https://api.ncbi.nlm.nih.gov/datasets/v2/genome/taxon/{taxon}/dataset_report"
    session = requests.Session()
    params = {"page_size": page_size,"filters.reference_only": "true"}
    if true_refseq:
        params["filters.assembly_source"] = "refseq"
        
    reports = []
    while True:
        response = session.get(URL, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()
        reports.extend(data.get("reports", []))
        token = data.get("next_page_token")
        if not token:
            break
        params["page_token"] = token
        print(f"{len(reports)} / {data.get('total_count', '?')}")
    return reports
