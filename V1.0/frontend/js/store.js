// Saved field mappings, shared by every page. The whole list is fetched once and kept in
// memory, so selecting or loading a mapping never needs an API call. Adding or removing
// goes to the backend first; the local copy changes only after the backend confirms,
// so both always agree.

import { getJSON, postJSON, deleteJSON } from "./api.js";

const BASE = "/api/field-mappings";
let items = [];      // [{ name, total, taxid, refseq, structure }]
let loading = null;  // the fetch promise, so the list is only fetched once
let onChange = () => {}; // the one mapping list currently on screen, called when items change

// The page on screen registers its redraw function here. Only one page is shown at a time
// (app.js cleans up the old page before mounting the new one), so one slot is enough.
export function subscribe(fn) {
  onChange = fn;
  return () => { onChange = () => {}; };
}

export function ensureLoaded() {
  if (!loading) {
    loading = getJSON(BASE)
      .then((list) => { items = list; onChange(); })
      .catch((err) => { loading = null; throw err; }); // allow a retry on the next mount
  }
  return loading;
}

export const getMappings = () => items;
export const getMapping = (name) => items.find((m) => m.name === name) ?? null;

export async function addMapping(entry) {
  const saved = await postJSON(BASE, entry);
  items = [...items, saved];
  onChange();
  return saved;
}

export async function removeMapping(name) {
  await deleteJSON(BASE, { name });
  items = items.filter((m) => m.name !== name);
  onChange();
}
