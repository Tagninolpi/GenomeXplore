// To add a page: create js/pages/<name>.js exporting `id`, `title` and `mount(container)'
import * as setupFieldMapping from "./pages/setup_field_mapping.js";
import * as baseQuery from "./pages/base_query.js";

const PAGES = [setupFieldMapping, baseQuery];

// setupFieldMapping.id = ./pages/setup_field_mapping.js
// .title = page menu text
// .mount = container that can build the page 

const nav = document.getElementById("nav");
const view = document.getElementById("view");
let cleanup;

// Menu: one link per page.
for (const page of PAGES) {
  const link = document.createElement("a");
  link.href = `#/${page.id}`;
  link.textContent = page.title;
  link.dataset.id = page.id;
  nav.appendChild(link);
}

function show() {
  const id = location.hash.slice(2); // "#/base-query" -> "base-query"
  const page = PAGES.find((p) => p.id === id) ?? PAGES[0];

  // Put the real address in the URL when it was empty or unknown (no hashchange fires for this).
  history.replaceState(null, "", `#/${page.id}`);

  cleanup?.();                                  // the page we leave cleans up after itself
  view.replaceChildren();                       // empty the page area
  cleanup = page.mount(view);

  for (const link of nav.children) {            // highlight the current page in the menu
    link.classList.toggle("active", link.dataset.id === page.id);
  }
}

window.addEventListener("hashchange", show);
show();
