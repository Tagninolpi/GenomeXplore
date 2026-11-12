# field_mappings.py

## Route :
/api/field-mappings

## functions : 
`GET` list all mappings
`POST` save a custom mapping (validated, stored in the local JSON)
`DELETE` remove a mapping by name


# ncbi.py

## Route :
/api/ncbi

## fucntions :
GET /structure field structure with counts, used by the **Setup** page to build the schema tree·
GET /query result table of a taxid with a saved mapping, used by the **Base query** page
