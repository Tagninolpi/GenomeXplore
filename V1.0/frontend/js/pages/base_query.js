import { getJSON } from "../api.js";
import { ensureLoaded } from "../store.js";
import { createQueryBar } from "../components/query_bar.js";
import { createMappingList } from "../components/mapping_list.js";
import { createResultTable } from "../components/result_table.js";
import { statusSetter } from "../ui.js";

export const id = "base-query";
export const title = "Base query";

const SOON = "Coming soon";

export function mount(el) {
  el.innerHTML = `
    <div class="searchbar" id="bar"></div>
    <div class="status" id="status"></div>
    <div class="layout">
      <aside class="module side">
        <h2>Field mapping</h2>
        <div id="list"></div>
        <p class="hint">Select a mapping, then press Search. Mappings are created on the Setup page.</p>
      </aside>
      <section class="main-col">
        <div class="actionbar">
          <button disabled title="${SOON}">Remove outliers</button>
          <button disabled title="${SOON}">Filter data</button>
          <button disabled title="${SOON}">Export raw data</button>
          <button disabled title="${SOON}">Import data</button>
        </div>
        <div class="module" id="module"><p class="empty">Enter a taxid and press Search.</p></div>
      </section>
    </div>
  `;
  const setStatus = statusSetter(el.querySelector("#status"));
  const module = el.querySelector("#module");
  let table = null;
  let requestId = 0;

  function showMessage(text) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = text;
    module.replaceChildren(p);
  }

  // Selecting a mapping only selects it: the next search uses it (a mapping is required).
  const list = createMappingList(el.querySelector("#list"));

  const bar = createQueryBar(el.querySelector("#bar"), {
    onError: (msg) => setStatus(msg, true),
    onSearch: async ({ taxid, refseq }) => {
      const mapping = list.getSelected();
      if (mapping === null) {
        setStatus("Select a field mapping first", true);
        return;
      }
      const myRequest = ++requestId;
      bar.setBusy(true);
      setStatus("Searching…");
      try {
        const data = await getJSON("/api/ncbi/query", { taxid, refseq, mapping });
        if (myRequest !== requestId) return;
        if (table) { table.destroy(); table = null; }
        if (data.total === 0) {
          showMessage("No reports found for this taxid.");
          setStatus("0 records");
        } else {
          table = createResultTable(module, { columns: data.columns, rows: Object.entries(data.rows) });
          setStatus(`${data.total} records · ${data.columns.length} columns · mapping "${mapping}"`);
        }
      } catch (err) {
        if (myRequest !== requestId) return;
        setStatus(err.message, true);
      } finally {
        if (myRequest === requestId) bar.setBusy(false);
      }
    },
  });

  ensureLoaded().catch((err) => setStatus(`Could not load saved mappings: ${err.message}`, true));
  bar.focus();

  return () => {
    requestId++;
    if (table) table.destroy();
    list.destroy();
  };
}
