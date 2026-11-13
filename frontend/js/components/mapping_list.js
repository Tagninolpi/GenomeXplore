// interactive field mapping selector (local saved verison)
// shows all local mappings
// select and deselect via clicking
// when adding or deletign refresh to update
// used in setup and query

import { getMappings, subscribe } from "../store.js";


export function createMappingList(container, { onSelect = () => {} } = {}) {
// refresh list
  let selected = null;
  const list = document.createElement("ul");
  list.className = "mapping-list";
  container.replaceChildren(list);

// looks at the local save of the mapping list
  function render() {
    const items = getMappings();
    // set selected to null if the current selected was deleted
    if (selected !== null && !items.some((m) => m.name === selected)) selected = null;
    list.replaceChildren();
    
    // nothing selected
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No saved mappings yet";
      list.appendChild(li);
      return;
    }

    
    items.forEach((m) => {
      const li = document.createElement("li");
      const b = document.createElement("button");// button to select and deselect a field
      b.className = "mapping-item";
      b.textContent = m.name;
      b.title = `${m.name}\ntaxid ${m.taxid} · ${m.refseq ? "RefSeq only" : "all reference assemblies"} · ${m.total} records`;
      b.setAttribute("aria-pressed", String(m.name === selected));
// select deselect
      b.addEventListener("click", () => {
        selected = selected === m.name ? null : m.name;
        render();
        onSelect(selected);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
  }
// refresh list when changes accure
  const unsubscribe = subscribe(render);
  render();

// select/unselect , add and remove (refresh list)
  return {
    getSelected: () => selected,
    clear: () => { selected = null; render(); },
    destroy: unsubscribe,
  };
}
