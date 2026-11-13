// Schema tree: root keys on the far left, one button per key, branches coloured by how often the field exists 
// (green = 100%, red = lowest percentage in the data)
// A branch into a dict key takes the colour of the best (max) selected leaf below it.
// Clicking a key with children collapses it (deselects its leaves); clicking again restores it.
// Counts and ratios are shown in a tooltip while hovering a key.

const ROW = 34;   // vertical distance between two rows
const H = 26;     // button height
const GAP = 64;   // horizontal space between two columns (where the curves are drawn)
const STUB = 28;  // space left of the first column (root curves start here)
const SVGNS = "http://www.w3.org/2000/svg";

// Create an element with an optional class and text.
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Turn the structure { key: count | { ...sub keys } } into a tree of nodes.
// A leaf holds its count; a branch holds its children and all the leaves below it.
function buildNodes(obj, depth, parent, path) {
  return Object.entries(obj).map(([key, val]) => {
    const node = {
      key, depth, parent,
      path: [...path, key],
      children: null, leaves: null,
      count: 0, selected: true, collapsed: false,
    };
    if (val !== null && typeof val === "object") {
      node.children = buildNodes(val, depth + 1, node, node.path);
      node.leaves = node.children.flatMap((c) => c.leaves);
    } else {
      node.count = val;
      node.leaves = [node];
    }
    return node;
  });
}

const pct = (r) => (r * 100).toFixed(1).replace(/\.0$/, "") + "%";

// 0 = red, 1 = green
const hue = (t) => `hsl(${Math.round(Math.max(0, Math.min(1, t)) * 120)},65%,45%)`;

export function createSchemaTree(container, { structure, total }) {
  const roots = buildNodes(structure, 0, null, []);
  const allLeaves = roots.flatMap((n) => n.leaves);
  const minRatio = Math.min(...allLeaves.map((l) => l.count / total));
  let visible = []; // nodes currently drawn, parents before children (filled by render)

  // --- page structure: header (summary + colour legend), scrollable tree, tooltip ---
  const summary = el("span");

  const swatches = el("span", "swatches");
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const s = el("span");
    s.style.background = hue(t);
    swatches.appendChild(s);
  });
  const legend = el("span", "legend");
  legend.append(pct(minRatio), swatches, "100%");

  const head = el("div", "tree-head");
  head.append(summary, legend);

  const treeEl = el("div", "tree");
  const scroll = el("div", "tree-scroll");
  scroll.appendChild(treeEl);

  container.replaceChildren(head, scroll);

  // Tooltip lives on <body> so the scroll container never clips it.
  const tip = el("div", "tree-tip");
  tip.hidden = true;
  document.body.appendChild(tip);

  // --- data helpers ---

  const selectedLeaves = (n) => n.leaves.filter((l) => l.selected);

  // Highest count among the selected leaves of n (n itself if it is a leaf), null if none.
  function bestCount(n) {
    const sel = selectedLeaves(n);
    return sel.length ? Math.max(...sel.map((l) => l.count)) : null;
  }

  // Colour of the curve into n, null if everything below it is deselected.
  function colorOf(n) {
    const best = bestCount(n);
    if (best === null) return null;
    const t = minRatio >= 1 ? 1 : (best / total - minRatio) / (1 - minRatio);
    return hue(t);
  }

  // --- tooltip ---

  function describe(n) {
    const path = n.path.join(".");
    if (!n.children) {
      const detail = `${n.count}/${total} records (${pct(n.count / total)})`;
      return {
        path,
        detail: n.selected ? detail : detail + " · deselected",
        hint: `Click to ${n.selected ? "deselect" : "select"}`,
      };
    }
    const best = bestCount(n);
    if (best === null) return { path, detail: "deselected", hint: "Click to restore" };
    return {
      path,
      detail: `max ${best}/${total} records (${pct(best / total)}) across ${selectedLeaves(n).length} fields`,
      hint: "Click to collapse",
    };
  }

  function showTip(n, x, y) {
    const { path, detail, hint } = describe(n);
    tip.replaceChildren(el("div", "tip-path", path), el("div", "", detail), el("div", "tip-hint", hint));
    tip.hidden = false;
    moveTip(x, y);
  }

  // Put the tooltip next to the pointer, flipped to the other side if it would leave the screen.
  function moveTip(x, y) {
    const pad = 8;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let left = x + 14;
    let top = y + 16;
    if (left + w > window.innerWidth - pad) left = Math.max(pad, x - w - 14);
    if (top + h > window.innerHeight - pad) top = Math.max(pad, y - h - 12);
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  // Thicken the curves from the root down to n and fade the others. n = null resets everything.
  function highlight(n) {
    const chain = new Set();
    for (let c = n; c; c = c.parent) chain.add(c);
    visible.forEach((m) => {
      const on = chain.has(m);
      m.path_el.setAttribute("stroke-width", on ? "5" : "3");
      m.path_el.style.opacity = colorOf(m) ? (on || !n ? "1" : "0.3") : "0.5";
    });
  }

  const showHover = (n, x, y) => { highlight(n); showTip(n, x, y); };
  const hideHover = () => { highlight(null); tip.hidden = true; };

  // --- selection ---

  function setCollapsed(n, value) {
    if (!n.children) return;
    n.collapsed = value;
    n.children.forEach((c) => setCollapsed(c, value));
  }

  // Leaf: flip it. Branch: if anything below is selected, deselect all and collapse;
  // otherwise select all and expand.
  function toggle(n) {
    if (!n.children) {
      n.selected = !n.selected;
    } else if (n.leaves.some((l) => l.selected)) {
      n.leaves.forEach((l) => { l.selected = false; });
      n.collapsed = true;
    } else {
      n.leaves.forEach((l) => { l.selected = true; });
      setCollapsed(n, false);
    }
  }

  function updateSummary() {
    const sel = allLeaves.filter((l) => l.selected).length;
    summary.textContent = `${sel} of ${allLeaves.length} fields selected`;
  }

  // --- drawing ---

  // Fill `visible` and give every node its vertical position y. A leaf (or collapsed branch)
  // takes the next free row; an open branch is centred on its first and last child.
  // Returns the number of rows used.
  function layoutRows() {
    visible = [];
    let row = 0;
    (function place(list) {
      list.forEach((n) => {
        visible.push(n);
        if (n.children && !n.collapsed) {
          place(n.children);
          const first = n.children[0];
          const last = n.children[n.children.length - 1];
          n.y = (first.y + last.y) / 2;
        } else {
          n.y = row * ROW;
          row += 1;
        }
      });
    })(roots);
    return row;
  }

  function makeButton(n) {
    const on = selectedLeaves(n).length > 0;
    const b = el("button", on ? "key" : "key off", n.key);
    b.setAttribute("aria-pressed", String(on));
    b.style.left = "0px"; // placeholder position, so the width can be measured
    b.style.top = "0px";
    b.addEventListener("mouseenter", (e) => showHover(n, e.clientX, e.clientY));
    b.addEventListener("mousemove", (e) => moveTip(e.clientX, e.clientY));
    b.addEventListener("mouseleave", hideHover);
    b.addEventListener("focus", () => {
      const r = b.getBoundingClientRect();
      showHover(n, r.left, r.bottom - 12);
    });
    b.addEventListener("blur", hideHover);
    b.addEventListener("click", () => {
      toggle(n);
      render();
      updateSummary();
      n.btn.focus(); // render() made a new button for n
    });
    return b;
  }

  // One column per depth, as wide as its widest button. Returns x positions, widths, total width.
  function measureColumns() {
    const maxDepth = Math.max(...visible.map((n) => n.depth));
    const colW = new Array(maxDepth + 1).fill(0);
    visible.forEach((n) => { colW[n.depth] = Math.max(colW[n.depth], n.btn.offsetWidth); });
    const colX = [];
    let x = STUB;
    for (const w of colW) {
      colX.push(x);
      x += w + GAP;
    }
    return { colX, colW, width: x - GAP };
  }

  // The curve from the right edge of n's parent (or the left edge, for a root) to n's button.
  function drawLink(n, svg, { colX, colW }) {
    const cx = colX[n.depth];
    const cy = n.y + H / 2;
    const px = n.parent ? colX[n.parent.depth] + colW[n.parent.depth] : 0;
    const py = n.parent ? n.parent.y + H / 2 : cy;
    const mx = (px + cx) / 2;

    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", `M${px},${py} C${mx},${py} ${mx},${cy} ${cx},${cy}`);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke-width", "3");
    p.setAttribute("stroke-linecap", "round");
    const color = colorOf(n);
    if (color) {
      p.setAttribute("stroke", color);
    } else { // nothing selected below: grey dashed
      p.style.stroke = "var(--text-muted)";
      p.setAttribute("stroke-dasharray", "4 4");
      p.style.opacity = "0.5";
    }
    svg.appendChild(p);
    n.path_el = p;
  }

  function render() {
    treeEl.replaceChildren();
    const rows = layoutRows();

    visible.forEach((n) => {
      n.btn = makeButton(n);
      treeEl.appendChild(n.btn);
    });

    const cols = measureColumns();
    const height = Math.max(rows * ROW - (ROW - H), H);
    treeEl.style.width = cols.width + "px";
    treeEl.style.height = height + "px";

    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("width", cols.width);
    svg.setAttribute("height", height);
    treeEl.prepend(svg);

    visible.forEach((n) => {
      n.btn.style.left = cols.colX[n.depth] + "px";
      n.btn.style.top = n.y + "px";
      n.btn.style.width = cols.colW[n.depth] + "px";
      drawLink(n, svg, cols);
    });
  }

  // Same format as the structure it was built from, minus every unselected leaf/branch.
  function prune(list) {
    const out = {};
    list.forEach((n) => {
      if (!n.children) {
        if (n.selected) out[n.key] = n.count;
        return;
      }
      const sub = prune(n.children);
      if (Object.keys(sub).length) out[n.key] = sub;
    });
    return out;
  }

  updateSummary();
  render();

  return {
    getPruned: () => prune(roots),
    destroy: () => { tip.remove(); container.replaceChildren(); },
  };
}
