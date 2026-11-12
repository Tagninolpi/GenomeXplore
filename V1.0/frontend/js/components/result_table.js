// Paged result table. Column 1 = accession, then one column per field, one row per record.
// The number of rows per page is computed from the screen height so a page fills the screen (recomputed on resize).
// Each column is as wide as its longest value (or its name), so values are shown in full; a wide table scrolls left/right. 

const ROW_H = 32;
const BELOW = 62;// space under the table: pager margin + paddings/borders + scrollbar
const MIN_ROWS = 5;
const CELL_PAD = 21;// horizontal space in a cell: 10px padding on each side + 1px border

// transform json cell value to string
function fmt(value) {
  if (value === undefined) return "";
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// change the full path name of table columns to onlly the leaf organism.organism_name => organism_name
const leafName = (path) => path.split(".").pop();

// cell definition
function cell(tag, text, title) {
  const c = document.createElement(tag);
  c.textContent = text;
  if (title) c.title = title; // browser tooltip, shown the full path name when hovering (description if new value)
  return c;
}


// measure per column the widest cell ( value or column name) set that value to be the cell width of all cells in that column  
function measureColumns(table, columns, rows) {
  const { fontSize, fontFamily } = getComputedStyle(table);
  const ctx = document.createElement("canvas").getContext("2d");
  const widths = [];

  ctx.font = `600 ${fontSize} ${fontFamily}`; // header cells are bold
  ["accession", ...columns].forEach((name, i) => { widths[i] = ctx.measureText(leafName(name)).width; });

  ctx.font = `400 ${fontSize} ${fontFamily}`;
  for (const [accession, record] of rows) {
    widths[0] = Math.max(widths[0], ctx.measureText(accession).width);
    columns.forEach((col, i) => {
      widths[i + 1] = Math.max(widths[i + 1], ctx.measureText(fmt(record[col])).width);
    });
  }
  return widths.map((w) => Math.ceil(w) + CELL_PAD);
}



export function createResultTable(container, { columns, rows }) {
  let perPage = MIN_ROWS;
  let start = 0; // index of the first row on the current page

  // --- build the static parts: table (header + empty body) and pager
  const table = document.createElement("table");
  table.className = "result-table";

  const colgroup = document.createElement("colgroup");

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(...["accession", ...columns].map((name) => cell("th", leafName(name), name)));
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  table.append(colgroup, thead, tbody);

  const scroll = document.createElement("div"); // lets the wide table scroll left/right
  scroll.className = "table-scroll";
  scroll.appendChild(table);

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  const label = document.createElement("span");
  const next = document.createElement("button");
  next.textContent = "Next";
  const pager = document.createElement("div");
  pager.className = "pager";
  pager.append(prev, label, next);

  container.replaceChildren(scroll, pager); // must be on the page before measuring text

  // --- column widths ---
  const widths = measureColumns(table, columns, rows);
  table.style.width = widths.reduce((sum, w) => sum + w, 0) + "px";
  for (const w of widths) {
    const col = document.createElement("col");
    col.style.width = w + "px";
    colgroup.appendChild(col);
  }

  // --- page logic ---

  // Show the rows of the current page and update the pager.
  function draw() {
    const end = Math.min(start + perPage, rows.length);
    tbody.replaceChildren(
      ...rows.slice(start, end).map(([accession, record]) => {
        const tr = document.createElement("tr");
        tr.append(cell("td", accession), ...columns.map((col) => cell("td", fmt(record[col]))));
        return tr;
      })
    );
    const pages = Math.max(1, Math.ceil(rows.length / perPage));
    label.textContent = `Rows ${rows.length ? start + 1 : 0}–${end} of ${rows.length} · page ${Math.floor(start / perPage) + 1}/${pages}`;
    prev.disabled = start === 0;
    next.disabled = end >= rows.length;
  }

  // How many rows fit between the top of the table and the bottom of the screen.
  // Row and header heights are measured from the real DOM (borders, fonts, zoom).
  function fit() {
    const rowH = tbody.firstElementChild?.getBoundingClientRect().height || ROW_H;
    const headH = thead.getBoundingClientRect().height;
    const top = scroll.getBoundingClientRect().top + window.scrollY;
    const avail = window.innerHeight - top - pager.offsetHeight - BELOW - headH;
    return Math.max(MIN_ROWS, Math.floor(avail / rowH));
  }

  function layout() {
    if (!tbody.firstElementChild) draw(); // draw a first page so there is a row to measure
    perPage = fit();
    start = Math.floor(start / perPage) * perPage; // keep the first visible row on the page
    draw();
  }

  prev.addEventListener("click", () => { start = Math.max(0, start - perPage); draw(); });
  next.addEventListener("click", () => { start += perPage; draw(); }); // disabled on the last page

  window.addEventListener("resize", layout);
  layout();

  return {
    destroy: () => {
      window.removeEventListener("resize", layout);
      container.replaceChildren();
    },
  };
}
