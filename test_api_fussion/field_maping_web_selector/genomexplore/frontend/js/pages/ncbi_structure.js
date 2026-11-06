import { getJSON } from "../api.js";
import { createSchemaTree } from "../components/schema_tree.js";

export const id = "ncbi-structure";
export const title = "NCBI structure";

export function mount(el) {
  el.innerHTML = `
    <div class="searchbar">
      <input type="text" id="taxid" placeholder="562" aria-label="Taxid" autocomplete="off" />
      <button id="search">Search</button>
    </div>
    <div class="status" id="status"></div>
    <div class="module" id="module"><p class="empty">Enter a taxid to see the structure of its NCBI reports.</p></div>
  `;
  const input = el.querySelector("#taxid");
  const button = el.querySelector("#search");
  const status = el.querySelector("#status");
  const module = el.querySelector("#module");
  let tree = null;
  let requestId = 0;

  function setStatus(text, isError = false) {
    status.textContent = text;
    status.classList.toggle("error", isError);
  }

  async function search() {
    const taxid = input.value.trim();
    if (!/^\d+$/.test(taxid)) {
      setStatus("Enter a numeric taxid", true);
      return;
    }
    const myRequest = ++requestId;
    button.disabled = true;
    setStatus("Searching…");
    try {
      const data = await getJSON("/api/ncbi/structure", { taxid });
      if (myRequest !== requestId) return;
      if (tree) tree.destroy();
      module.replaceChildren();
      if (data.total === 0) {
        module.innerHTML = '<p class="empty">No reports found for this taxid.</p>';
        setStatus("0 records");
        return;
      }
      tree = createSchemaTree(module, { structure: data.structure, total: data.total });
      setStatus(`${data.total} records for taxid ${data.taxid}`);
    } catch (err) {
      if (myRequest !== requestId) return;
      setStatus(err.message, true);
    } finally {
      if (myRequest === requestId) button.disabled = false;
    }
  }

  button.addEventListener("click", search);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });
  input.focus();

  return () => { requestId++; if (tree) tree.destroy(); };
}
