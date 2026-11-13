"""Keep only the mapped fields of each raw NCBI report, as one flat row per report."""


def get_leaf_paths(structure, prefix=()):
    """List the path to every leaf of the mapping, as tuples of keys.
    example :
    
    structure : {"accession": 1,
     "organism": {"organism_name": 1},
     "assembly_info": {"paired_assembly": {"status": 1}}}
     
    return : [('accession',), ('organism', 'organism_name'), ('assembly_info', 'paired_assembly', 'status')]
     """
    paths = []
    for key, value in structure.items():
        path = prefix + (key,)
        if isinstance(value, dict):
            paths.extend(get_leaf_paths(value, path))   # branch: go deeper
        else:
            paths.append(path)                          # leaf: keep its path
    return paths


def get_value(record, path):
    """
    record : raw assembly dict
    
    path : ("organism", "organism_name")
    
    return : (True, 'Homo sapiens') 
    """
    value = record
    for key in path:
        if not isinstance(value, dict) or key not in value:
            return False, None        # path breaks here: field not in this record
        value = value[key]
    return True, value


def build_table(reports, structure):
    """Keep only the mapped fields of each report.

    reports : (raw list of all the assemblies (dict))
    [
    {'accession': 'GCF_000001405.40',
    ...,
    'assembly_info': {'assembly_level': 'Chromosome',
                        ...},
    ...]

    structure : (dict with branches and leaves deleted (leaves = count ))
    {'accession': 1,
        ...,
        'assembly_info': {'assembly_level': 1,
                            ...},
    }


    Returns (columns, rows):
      columns = ["organism.organism_name", ...]            (full dotted paths)
      rows    = {accession: {column: value, ...}, ...}     (one flat dict per report)
    """
    # Prepare once: which fields to read, and what to call them as columns.
    fields = []
    for path in get_leaf_paths(structure): # ('organism', 'organism_name')
        if path != ("accession",):               # accession is the row key, not a column
            fields.append((".".join(path), path)) # (name,path used for get_value) = ("organism.organism_name", ("organism", "organism_name"))

    rows = {}
    for record in reports:
        row = {}
        for column, path in fields:
            found, value = get_value(record, path)
            if found:                            # a field the record lacks stays absent
                row[column] = value
        rows[record["accession"]] = row

    columns = [column for column, path in fields]
    return columns, rows
