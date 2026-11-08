// Every call to the backend goes through request().
async function request(method, url, { params, body } = {}) {

  // for url params : { taxid: "562", refseq: true, mapping: "Ecoli" }
  // add ? and "taxid=562&refseq=true&mapping=Ecoli" after the url so the ncbi api server can directly read it
  if (params) url += "?" + new URLSearchParams(params);

  // requests qith a body get a header that say the body is json and transform body to a str
  const options = { method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  // send the request and wait for the answer
  const response = await fetch(url, options);

  // 2xx = success, anything else = error (this block only runs for errors)
  if (!response.ok) {
    // read the server's error answer ({"detail": "..."}); null if it isn't JSON
    const error = await response.json().catch(() => null);
    // throw the server's message (or a generic one); pages show it with err.message
    throw new Error(typeof error?.detail === "string" ? error.detail : `Request failed (${response.status})`);
  }
  // success: return the data (null when the server sends nothing: 204)
  return response.status === 204 ? null : response.json();
}

export const getJSON = (url, params) => request("GET", url, { params });
// GET uses :

// on page start get al lthe existing field mappings (local file)
// request : getJSON("/api/field-mappings") 
// answer : [{ name, total, taxid, refseq, structure }, ...]

// do ncbi request for taxid to get the structure and counts
// request : getJSON("/api/ncbi/structure", { taxid: "562", refseq: true })
// answer : { taxid, refseq, total, structure }

// do ncbi request to get results based on field mapping restrictions
// request : getJSON("/api/ncbi/query", { taxid: "562", refseq: true, mapping: "Ecoli" })
// answer: { total, columns, rows }

export const postJSON = (url, body) => request("POST", url, { body });
// save a new field mapping restriction to the local file
// postJSON("/api/field-mappings", {name: "Human_basic", total: 1, taxid: "9606", refseq: true, structure: { accession: 1, organism: { organism_name: 1 } }})

export const deleteJSON = (url, params) => request("DELETE", url, { params });
// delete a field mapping in the local file
// deleteJSON("/api/field-mappings", { name: "Human_basic" })
