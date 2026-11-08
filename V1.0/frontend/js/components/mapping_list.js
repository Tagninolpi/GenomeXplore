// List of saved mapping names. Clicking selects; clicking the selected one again unselects.
// It re-renders itself whenever the shared store changes, and drops its selection if the
// selected mapping disappears. `onSelect(name | null)` fires only on user clicks.
import { getMappings, subscribe } from "../store.js";

export function createMappingList(container, { onSelect = () => {} } = {}) {
  let selected = null;
  const list = document.createElement("ul");
  list.className = "mapping-list";
  container.replaceChildren(list);

  function render() {
    const items = getMappings();
    if (selected !== null && !items.some((m) => m.name === selected)) selected = null;
    list.replaceChildren();
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No saved mappings yet";
      list.appendChild(li);
      return;
    }
    items.forEach((m) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.className = "mapping-item";
      b.textContent = m.name;
      b.title = `${m.name}\ntaxid ${m.taxid} · ${m.refseq ? "RefSeq only" : "all reference assemblies"} · ${m.total} records`;
      b.setAttribute("aria-pressed", String(m.name === selected));
      b.addEventListener("click", () => {
        selected = selected === m.name ? null : m.name;
        render();
        onSelect(selected);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  const unsubscribe = subscribe(render);
  render();

  return {
    getSelected: () => selected,
    clear: () => { selected = null; render(); },
    destroy: unsubscribe,
  };
}
