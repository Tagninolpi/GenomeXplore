// To add a page: create js/pages/<name>.js exporting `id`, `title` and
// `mount(container)` (optionally returning a cleanup function), then add it here.
import * as setupFieldMapping from "./pages/setup_field_mapping.js";
import * as baseQuery from "./pages/base_query.js";

const PAGES = [setupFieldMapping, baseQuery];

const nav = document.getElementById("nav");
const view = document.getElementById("view");
let cleanup = null;

PAGES.forEach((page) => {
  const link = document.createElement("a");
  link.href = `#/${page.id}`;
  link.textContent = page.title;
  link.dataset.id = page.id;
  nav.appendChild(link);
});

function show() {
  const id = location.hash.replace(/^#\//, "");
  const page = PAGES.find((p) => p.id === id) ?? PAGES[0];
  if (cleanup) cleanup();
  view.replaceChildren();
  cleanup = page.mount(view) ?? null;
  nav.querySelectorAll("a").forEach((a) => {
    a.classList.toggle("active", a.dataset.id === page.id);
  });
}

window.addEventListener("hashchange", show);
show();
