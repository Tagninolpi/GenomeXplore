# css

Styles of the whole app, split per page and per component (same names as the `js/` files).

`index.html` links only `style.css`, which imports all the others. The order of the imports matters (a later file wins when two rules are equally specific): base, then layout, then components, then pages.

The dark theme follows the system setting (`prefers-color-scheme`). The colours are CSS variables defined in `base.css` (`--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--accent`, `--danger`): use them instead of fixed colours, so both themes keep working.

## Adding a stylesheet

Create the file in `components/` (for a component) or `pages/` (for a page), and add one `@import` line in `style.css`, in the matching group.

---

# style.css

Entry point, only `@import` lines.

# base.css

Colour variables (light and dark theme), reset, default look of inputs and buttons.

# layout.css

Top bar and menu, page container, two-column layout, panels, status line, hint text (shared by both pages).

# components/query_bar.css

`query_bar.js`: taxid input, RefSeq toggle, Search button.

# components/mapping_list.css

`mapping_list.js`: list of saved mappings.

# components/schema_tree.css

`schema_tree.js`: tree, colour legend, hover tooltip.

# components/result_table.css

`result_table.js`: table and Previous / Next pager.

# pages/setup_field_mapping.css

Setup page only: Remove button, name + Export bar.

# pages/base_query.css

Base query page only: action buttons, import report popup.
