// Paged result table. Column 1 = accession, then one column per field, one row per record.
// The number of rows per page is computed from the screen height so a page fills the screen
// (recomputed on resize). Cells are fixed-width, long values are cut with "…" and shown in
// full on hover. Values are displayed as they are (objects/arrays as compact JSON).

const ACC_W = 170;
const COL_W = 190;
const ROW_H = 32;     // defaults; replaced by measured values after the first draw
const HEAD_H = 36;
const BELOW = 62;     // pager margin + module padding/border + page padding + scrollbar
const MIN_ROWS = 5;

function fmt(value) {
  if (value === undefined) return "";
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function createResultTable(container, { columns, rows }) {
  let rowH = ROW_H;
  let headH = HEAD_H;
  let perPage = MIN_ROWS;
  let start = 0;

  container.replaceChildren();
  const scroll = document.createElement("div");
  scroll.className = "table-scroll";
  const pager = document.createElement("div");
  pager.className = "pager";
  const prev = document.createElement("button");
  prev.textContent = "Previous";
  const label = document.createElement("span");
  const next = document.createElement("button");
  next.textContent = "Next";
  pager.append(prev, label, next);
  container.append(scroll, pager);

  const table = document.createElement("table");
  table.className = "result-table";
  table.style.width = ACC_W + columns.length * COL_W + "px";
  const colgroup = document.createElement("colgroup");
  [ACC_W, ...columns.map(() => COL_W)].forEach((w) => {
    const col = document.createElement("col");
    col.style.width = w + "px";
    colgroup.appendChild(col);
  });
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["accession", ...columns].forEach((name) => {
    const th = document.createElement("th");
    th.textContent = name;
    th.title = name;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  table.append(colgroup, thead, tbody);
  scroll.appendChild(table);

  function fit() {
    const top = scroll.getBoundingClientRect().top + window.scrollY;
    const avail = window.innerHeight - top - pager.offsetHeight - BELOW;
    return Math.max(MIN_ROWS, Math.floor((avail - headH) / rowH));
  }

  function draw() {
    const end = Math.min(start + perPage, rows.length);
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const [accession, record] = rows[i];
      const tr = document.createElement("tr");
      const first = document.createElement("td");
      first.textContent = accession;
      first.title = accession;
      tr.appendChild(first);
      columns.forEach((col) => {
        const td = document.createElement("td");
        const text = fmt(record[col]);
        td.textContent = text;
        if (text) td.title = text;
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    }
    tbody.replaceChildren(frag);
    const pages = Math.max(1, Math.ceil(rows.length / perPage));
    label.textContent = `Rows ${rows.length ? start + 1 : 0}–${end} of ${rows.length} · page ${Math.floor(start / perPage) + 1}/${pages}`;
    prev.disabled = start === 0;
    next.disabled = end >= rows.length;
  }

  function layout() {
    perPage = fit();
    start = Math.floor(start / perPage) * perPage; // keep the first visible row on the page
    draw();
  }

  // Replace the default row/header heights by the real rendered ones (borders, fonts, zoom),
  // so the page fills the screen exactly.
  function calibrate() {
    const tr = tbody.firstElementChild;
    if (!tr) return;
    const rh = tr.getBoundingClientRect().height;
    const hh = thead.getBoundingClientRect().height;
    if (rh > 0 && (Math.abs(rh - rowH) > 0.5 || Math.abs(hh - headH) > 0.5)) {
      rowH = rh;
      headH = hh;
      layout();
    }
  }

  prev.addEventListener("click", () => { start = Math.max(0, start - perPage); draw(); });
  next.addEventListener("click", () => { if (start + perPage < rows.length) { start += perPage; draw(); } });

  let raf = 0;
  const onResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layout);
  };
  window.addEventListener("resize", onResize);

  layout();
  calibrate();

  return {
    destroy: () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      container.replaceChildren();
    },
  };
}
