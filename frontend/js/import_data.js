// Merge imported values into the data of the table on screen (nothing is sent to the backend).
//
// imported : the content of the JSON file, one dict of new values per accession
//   { "GCF_000001405.40": { "my_column": 12, "other_column": "x" }, ... }
// columns  : column names of the table            ["organism.organism_name", ...]
// rows     : [accession, record] pairs of the table  [["GCF_000001405.40", { "organism.organism_name": "Homo sapiens" }], ...]
//
// Returns the new columns and rows (the inputs are not modified) and two lists of accessions:
//   notInTable  : in the file but not in the table (their values are ignored)
//   notInImport : in the table but not in the file (they get no value for the new columns)

const isDict = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

export function mergeImport(columns, rows, imported) {
  if (!isDict(imported) || !Object.values(imported).every(isDict)) {
    throw new Error('the file must look like { "accession": { "column_name": value, ... }, ... }');
  }

  const inFile = new Set(Object.keys(imported));
  const inTable = new Set(rows.map(([accession]) => accession));
  const allColumns = new Set(columns); // a Set keeps each new name once, in order of first appearance

  const newRows = rows.map(([accession, record]) => {
    const values = inFile.has(accession) ? imported[accession] : {};
    Object.keys(values).forEach((name) => allColumns.add(name));
    return [accession, { ...record, ...values }];
  });

  return {
    columns: [...allColumns],
    rows: newRows,
    notInTable: [...inFile].filter((accession) => !inTable.has(accession)),
    notInImport: rows.map(([accession]) => accession).filter((accession) => !inFile.has(accession)),
  };
}
