import { getJSON, postJSON } from "../api.js";
import { ensureLoaded } from "../store.js";
import { createQueryBar } from "../components/query_bar.js";
import { createMappingList } from "../components/mapping_list.js";
import { createResultTable } from "../components/result_table.js";
import { mergeImport } from "../import_data.js";
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
          <button id="export" title="Links to the genome files + representative RNA-seq runs, as one JSON file">Export raw data</button>
          <button id="import">Import data</button>
          <input type="file" id="import-file" accept=".json,application/json" hidden />
        </div>
        <div class="module" id="module"><p class="empty">Enter a taxid and press Search.</p></div>
      </section>
    </div>
  `;
  const setStatus = statusSetter(el.querySelector("#status"));
  const module = el.querySelector("#module");
  let table = null;
  let current = null; // { columns, rows } of the table on screen
  let searched = null; // { taxid, refseq } of the search shown in the table (needed by the export)
  let requestId = 0;

  function showMessage(text) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = text;
    module.replaceChildren(p);
  }

  // select field mapping from list to use for the request
  const list = createMappingList(el.querySelector("#list"));

  //taxid + refseq + field mapping
  const bar = createQueryBar(el.querySelector("#bar"), {
    onError: (msg) => setStatus(msg, true),
    onSearch: async ({ taxid, refseq }) => {
      const mapping = list.getSelected();
      // field mapping required
      if (mapping === null) {
        setStatus("Select a field mapping first", true);
        return;
      }
      
      const myRequest = ++requestId;
      bar.setBusy(true);
      setStatus("Searching…");
      // send request to backend
      try {
        const data = await getJSON("/api/ncbi/query", { taxid, refseq, mapping });
        if (myRequest !== requestId) return;
        if (table) { table.destroy(); table = null; }
        current = null;
        searched = { taxid, refseq };
        if (data.total === 0) {
          showMessage("No reports found for this taxid.");
          setStatus("0 records");
        // create result table
        } else {
          current = { columns: data.columns, rows: Object.entries(data.rows) };
          table = createResultTable(module, current);
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

  // Popup listing the accessions that could not be matched. Closed with its button or Escape.
  function showImportReport({ notInTable, notInImport }) {
    const dialog = document.createElement("dialog");
    dialog.className = "import-report";
    const sections = [
      ["In the file but not in the table (ignored)", notInTable],
      ["In the table but not in the file (empty cells)", notInImport],
    ];
    for (const [heading, accessions] of sections) {
      if (!accessions.length) continue;
      const h = document.createElement("h3");
      h.textContent = `${heading}: ${accessions.length}`;
      const pre = document.createElement("pre"); // one accession per line, scrolls if long
      pre.textContent = accessions.join("\n");
      dialog.append(h, pre);
    }
    const form = document.createElement("form"); // a form with method "dialog" closes the dialog
    form.method = "dialog";
    const close = document.createElement("button");
    close.textContent = "Close";
    form.appendChild(close);
    dialog.appendChild(form);
    dialog.addEventListener("close", () => dialog.remove());
    el.appendChild(dialog);
    dialog.showModal();
  }

  // Import data: pick a JSON file, add its values to the table as new columns.
  const importFile = el.querySelector("#import-file");
  el.querySelector("#import").addEventListener("click", () => {
    if (!current) { setStatus("Run a search before importing data", true); return; }
    importFile.click();
  });
  importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    importFile.value = ""; // so the same file can be picked again
    if (!file) return;
    try {
      const merged = mergeImport(current.columns, current.rows, JSON.parse(await file.text()));
      const added = merged.columns.length - current.columns.length;
      current = { columns: merged.columns, rows: merged.rows };
      table.destroy();
      table = createResultTable(module, current);
      setStatus(`Imported "${file.name}" · ${added} new columns`);
      if (merged.notInTable.length || merged.notInImport.length) showImportReport(merged);
    } catch (err) {
      setStatus(`Import failed: ${err.message}`, true);
    }
  });

  // Export raw data: send the accessions of the table to the backend, which builds the final export
  // (links to the genome files + representative runs from ENA), then download it as a JSON file.
  const exportButton = el.querySelector("#export");
  exportButton.addEventListener("click", async () => {
    if (!current) { setStatus("Run a search before exporting", true); return; }
    const accessions = current.rows.map(([accession]) => accession);
    // ENA can take several minutes per species, so a big table can take very long
    if (accessions.length > 20 &&
        !confirm(`Export ${accessions.length} genomes? It can take several minutes per species.`)) return;

    exportButton.disabled = true;
    setStatus(`Exporting ${accessions.length} genomes… (links + raw data from ENA, this can take several minutes)`);
    try {
      const data = await postJSON("/api/export", { ...searched, accessions });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement("a"); // a hidden link, clicked to download the file
      link.href = URL.createObjectURL(blob);
      link.download = `genomexplore_export_${searched.taxid}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus(`Exported ${data.species.length} species · ${data.problems.length} problems`, data.problems.length > 0);
    } catch (err) {
      setStatus(`Export failed: ${err.message}`, true);
    } finally {
      exportButton.disabled = false;
    }
  });

  ensureLoaded().catch((err) => setStatus(`Could not load saved mappings: ${err.message}`, true));
  bar.focus();

  return () => {
    requestId++;
    if (table) table.destroy();
    list.destroy();
  };
}
