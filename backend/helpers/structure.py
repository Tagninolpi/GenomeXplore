"""Count how often each field exists across a list of nested dicts.

Dicts become branches. Anything else (numbers, strings, lists, even an empty {})
is a leaf holding the number of records that have it.
If the same key is a dict in one record and a plain value in another,
the first one seen wins and the other is ignored.
"""

'''
input : 
records = [
    {"accession": "GCF_1", "organism": {"organism_name": "Homo sapiens", "common_name": "human"}},
    {"accession": "GCF_2", "organism": {"organism_name": "Homo sapiens"}},
]
output : 
{"accession": 2,
 "organism": {"organism_name": 2, "common_name": 1}}
'''

def add_record(structure, record):
    """
    go through the dict :
    for non dict values:
    set value to 1 if new key
    add 1 if same key

    for dict values continue until value non dict
    """
    for key, value in record.items():
        if isinstance(value, dict) and value:       
            branch = structure.setdefault(key, {})  
            if isinstance(branch, dict):            
                add_record(branch, value)           
        elif key not in structure:                  
            structure[key] = 1
        elif not isinstance(structure[key], dict):  
            structure[key] += 1                     


def build_structure(records):
    """
    merge the dict structure of all the dicts in the list
    replace the non dict value with the count (how many of  the dicts in the list have that path/value)
    """
    structure = {}
    for record in records:
        add_record(structure, record)
    return structure
