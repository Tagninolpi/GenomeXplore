// Schema tree: root keys on the far left, one button per key, branches coloured by
// how often the field exists (green = 100%, red = lowest percentage in the data).
// A branch into a dict key takes the colour of the best (max) selected leaf below it.
// Clicking a key with children collapses it (deselects its leaves); clicking again restores it.
// Counts and ratios are shown in a tooltip while hovering (or focusing) a key.

const ROW = 34;
const H = 26;
const GAP = 64;
const STUB = 28;
const SVGNS = "http://www.w3.org/2000/svg";

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

function pct(r) {
  return (r * 100).toFixed(1).replace(/\.0$/, "") + "%";
}

export function createSchemaTree(container, { structure, total, onChange = () => {} }) {
  const roots = buildNodes(structure, 0, null, []);
  const allLeaves = roots.flatMap((n) => n.leaves);
  const minRatio = Math.min(...allLeaves.map((l) => l.count / total));

  container.replaceChildren();
  const head = document.createElement("div");
  head.className = "tree-head";
  const summary = document.createElement("span");
  const legend = document.createElement("span");
  legend.className = "legend";
  const swatches = document.createElement("span");
  swatches.className = "swatches";
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const s = document.createElement("span");
    s.style.background = hue(t);
    swatches.appendChild(s);
  });
  legend.append(pct(minRatio), swatches, "100%");
  head.append(summary, legend);

  const scroll = document.createElement("div");
  scroll.className = "tree-scroll";
  const treeEl = document.createElement("div");
  treeEl.className = "tree";
  scroll.appendChild(treeEl);

  container.append(head, scroll);

  // Tooltip lives on <body> so the scroll container never clips it.
  const tip = document.createElement("div");
  tip.className = "tree-tip";
  tip.hidden = true;
  document.body.appendChild(tip);

  function hue(t) {
    return `hsl(${Math.round(Math.max(0, Math.min(1, t)) * 120)},65%,45%)`;
  }

  function selectedLeaves(n) {
    return n.leaves.filter((l) => l.selected);
  }

  function ratioOf(n) {
    const sel = selectedLeaves(n);
    if (!sel.length) return null;
    return Math.max(...sel.map((l) => l.count)) / total;
  }

  function colorOf(n) {
    const r = ratioOf(n);
    if (r === null) return null;
    const t = minRatio >= 1 ? 1 : (r - minRatio) / (1 - minRatio);
    return hue(t);
  }

  function describe(n) {
    const path = n.path.join(".");
    if (!n.children) {
      const detail = `${n.count}/${total} records (${pct(n.count / total)})`;
      return { path, detail: n.selected ? detail : detail + " · deselected", hint: "Click to " + (n.selected ? "deselect" : "select") };
    }
    const sel = selectedLeaves(n);
    if (!sel.length) return { path, detail: "deselected", hint: "Click to restore" };
    const mx = Math.max(...sel.map((l) => l.count));
    return {
      path,
      detail: `max ${mx}/${total} records (${pct(mx / total)}) across ${sel.length} fields`,
      hint: "Click to collapse",
    };
  }

  function showTip(n, x, y) {
    const { path, detail, hint } = describe(n);
    tip.replaceChildren();
    const a = document.createElement("div");
    a.className = "tip-path";
    a.textContent = path;
    const b = document.createElement("div");
    b.textContent = detail;
    const c = document.createElement("div");
    c.className = "tip-hint";
    c.textContent = hint;
    tip.append(a, b, c);
    tip.hidden = false;
    moveTip(x, y);
  }

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

  function hideTip() {
    tip.hidden = true;
  }

  function setCollapsed(n, value) {
    if (!n.children) return;
    n.collapsed = value;
    n.children.forEach((c) => setCollapsed(c, value));
  }

  function toggle(n) {
    if (!n.children) {
      n.selected = !n.selected;
      return;
    }
    if (n.leaves.some((l) => l.selected)) {
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

  function render() {
    treeEl.replaceChildren();

    const visible = [];
    (function collect(list) {
      list.forEach((n) => {
        visible.push(n);
        if (n.children && !n.collapsed) collect(n.children);
      });
    })(roots);

    let row = 0;
    (function place(list) {
      list.forEach((n) => {
        if (n.children && !n.collapsed) {
          place(n.children);
          n.y = (n.children[0].y + n.children[n.children.length - 1].y) / 2;
        } else {
          n.y = row * ROW;
          row += 1;
        }
      });
    })(roots);

    visible.forEach((n) => {
      const b = document.createElement("button");
      b.className = "key" + (selectedLeaves(n).length ? "" : " off");
      b.textContent = n.key;
      b.setAttribute("aria-pressed", selectedLeaves(n).length ? "true" : "false");
      b.style.left = "0px";
      b.style.top = "0px";
      treeEl.appendChild(b);
      n.btn = b;
    });

    const maxDepth = Math.max(...visible.map((n) => n.depth));
    const colW = new Array(maxDepth + 1).fill(0);
    visible.forEach((n) => { colW[n.depth] = Math.max(colW[n.depth], n.btn.offsetWidth); });
    const colX = [];
    let x = STUB;
    for (let d = 0; d <= maxDepth; d++) {
      colX.push(x);
      x += colW[d] + GAP;
    }
    const width = x - GAP;
    const height = Math.max(row * ROW - (ROW - H), H);
    treeEl.style.width = width + "px";
    treeEl.style.height = height + "px";

    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    treeEl.prepend(svg);

    visible.forEach((n) => {
      n.btn.style.left = colX[n.depth] + "px";
      n.btn.style.top = n.y + "px";
      n.btn.style.width = colW[n.depth] + "px";

      const cx = colX[n.depth];
      const cy = n.y + H / 2;
      let px = 0;
      let py = cy;
      if (n.parent) {
        px = colX[n.parent.depth] + colW[n.parent.depth];
        py = n.parent.y + H / 2;
      }
      const mx = (px + cx) / 2;
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", `M${px},${py} C${mx},${py} ${mx},${cy} ${cx},${cy}`);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke-width", "3");
      p.setAttribute("stroke-linecap", "round");
      const color = colorOf(n);
      if (color) {
        p.setAttribute("stroke", color);
      } else {
        p.style.stroke = "var(--text-muted)";
        p.setAttribute("stroke-dasharray", "4 4");
        p.style.opacity = "0.5";
      }
      svg.appendChild(p);
      n.path_el = p;
    });

    visible.forEach((n) => {
      n.btn.addEventListener("mouseenter", (e) => { highlight(n, visible); showTip(n, e.clientX, e.clientY); });
      n.btn.addEventListener("mousemove", (e) => moveTip(e.clientX, e.clientY));
      n.btn.addEventListener("mouseleave", () => { clearHighlight(visible); hideTip(); });
      n.btn.addEventListener("focus", () => {
        highlight(n, visible);
        const r = n.btn.getBoundingClientRect();
        showTip(n, r.left, r.bottom - 12);
      });
      n.btn.addEventListener("blur", () => { clearHighlight(visible); hideTip(); });
      n.btn.addEventListener("click", () => {
        toggle(n);
        render();
        updateSummary();
        n.btn.focus();
        onChange(api.getSelected());
      });
    });
  }

  function highlight(n, visible) {
    const chain = new Set();
    for (let c = n; c; c = c.parent) chain.add(c);
    visible.forEach((m) => {
      const on = chain.has(m);
      m.path_el.setAttribute("stroke-width", on ? "5" : "3");
      if (colorOf(m)) m.path_el.style.opacity = on ? "1" : "0.3";
    });
  }

  function clearHighlight(visible) {
    visible.forEach((m) => {
      m.path_el.setAttribute("stroke-width", "3");
      m.path_el.style.opacity = colorOf(m) ? "1" : "0.5";
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

  const api = {
    getPruned: () => prune(roots),
    getSelected: () => allLeaves.filter((l) => l.selected).map((l) => l.path),
    destroy: () => { tip.remove(); container.replaceChildren(); },
  };

  updateSummary();
  render();
  return api;
}
