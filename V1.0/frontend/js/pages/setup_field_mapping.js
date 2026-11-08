import { getJSON } from "../api.js";
import { ensureLoaded, getMapping, getMappings, addMapping, removeMapping } from "../store.js";
import { createSchemaTree } from "../components/schema_tree.js";
import { createQueryBar } from "../components/query_bar.js";
import { createMappingList } from "../components/mapping_list.js";
import { statusSetter } from "../ui.js";

export const id = "setup-field-mapping";
export const title = "Setup field mapping";

const EMPTY_DEFAULT = "Enter a taxid to see the structure of its NCBI reports.";

export function mount(el) {
  el.innerHTML = `
    <div class="searchbar" id="bar"></div>
    <div class="status" id="status"></div>
    <div class="layout">
      <aside class="module side">
        <h2>Saved mappings</h2>
        <div id="list"></div>
        <button id="remove" class="side-btn" disabled>Remove</button>
      </aside>
      <section class="main-col">
        <div class="module" id="module"></div>
        <div class="exportbar">
          <input type="text" id="name" placeholder="Mapping name" aria-label="Mapping name" autocomplete="off" />
          <button id="export" disabled>Export</button>
        </div>
      </section>
    </div>
  `;
  const setStatus = statusSetter(el.querySelector("#status"));
  const module = el.querySelector("#module");
  const removeBtn = el.querySelector("#remove");
  const nameInput = el.querySelector("#name");
  const exportBtn = el.querySelector("#export");

  let main = null;           // result of the last search: { taxid, refseq, total, structure }
  let shown = null;          // what the tree currently displays (main result or a saved mapping)
  let emptyText = EMPTY_DEFAULT;
  let tree = null;
  let requestId = 0;

  // Tree shows the selected saved mapping, else the main search result, else nothing.
  function render() {
    if (tree) { tree.destroy(); tree = null; }
    const name = list.getSelected();
    shown = name !== null ? getMapping(name) : main;
    module.replaceChildren();
    if (shown) {
      tree = createSchemaTree(module, { structure: shown.structure, total: shown.total });
    } else {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = emptyText;
      module.appendChild(p);
    }
    removeBtn.disabled = name === null;
    exportBtn.disabled = !shown;
  }

  const list = createMappingList(el.querySelector("#list"), { onSelect: render });

  const bar = createQueryBar(el.querySelector("#bar"), {
    onError: (msg) => setStatus(msg, true),
    onSearch: async ({ taxid, refseq }) => {
      const myRequest = ++requestId;
      bar.setBusy(true);
      setStatus("Searching…");
      try {
        const data = await getJSON("/api/ncbi/structure", { taxid, refseq });
        if (myRequest !== requestId) return;
        list.clear(); // a new search shows its own result, not a saved mapping
        if (data.total === 0) {
          main = null;
          emptyText = "No reports found for this taxid.";
          setStatus("0 records");
        } else {
          main = { taxid: data.taxid, refseq: data.refseq, total: data.total, structure: data.structure };
          setStatus(`${data.total} records for taxid ${data.taxid} (${data.refseq ? "RefSeq only" : "all reference assemblies"})`);
        }
        render();
      } catch (err) {
        if (myRequest !== requestId) return;
        setStatus(err.message, true);
      } finally {
        if (myRequest === requestId) bar.setBusy(false);
      }
    },
  });

  async function exportMapping() {
    const name = nameInput.value.trim();
    if (!name) {
      setStatus("Enter a name for the mapping", true);
      nameInput.focus();
      return;
    }
    if (getMappings().some((m) => m.name === name)) {
      setStatus(`"${name}" already exists, choose another name`, true);
      nameInput.focus();
      return;
    }
    const source = shown;
    const structure = tree.getPruned();
    if (!Object.keys(structure).length) {
      setStatus("Select at least one field to export", true);
      return;
    }
    exportBtn.disabled = true;
    try {
      await addMapping({ name, total: source.total, taxid: source.taxid, refseq: source.refseq, structure });
      nameInput.value = "";
      setStatus(`Saved "${name}"`);
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      exportBtn.disabled = !shown;
    }
  }

  async function removeSelected() {
    const name = list.getSelected();
    if (name === null) return;
    removeBtn.disabled = true;
    try {
      await removeMapping(name); // the list drops its selection when the store changes
      setStatus(`Removed "${name}"`);
    } catch (err) {
      setStatus(err.message, true);
    }
    render();
  }

  exportBtn.addEventListener("click", exportMapping);
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !exportBtn.disabled) exportMapping(); });
  removeBtn.addEventListener("click", removeSelected);

  render();
  ensureLoaded().catch((err) => setStatus(`Could not load saved mappings: ${err.message}`, true));
  bar.focus();

  return () => {
    requestId++;
    if (tree) tree.destroy();
    list.destroy();
  };
}
