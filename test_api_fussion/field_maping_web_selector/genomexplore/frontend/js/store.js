// Saved field mappings, shared by every page. The whole list is fetched once and kept in
// memory, so selecting or loading a mapping never needs an API call. Adding or removing
// goes to the backend first; the local copy changes only after the backend confirms,
// so both always agree.
import { getJSON, postJSON, deleteJSON } from "./api.js";

const BASE = "/api/field-mappings";
let items = []; // [{ name, total, taxid, refseq, structure }] in creation order
let loading = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function ensureLoaded() {
  if (!loading) {
    loading = getJSON(BASE)
      .then((list) => { items = list; emit(); })
      .catch((err) => { loading = null; throw err; }); // allow a retry on the next mount
  }
  return loading;
}

export const getMappings = () => items;
export const getMapping = (name) => items.find((m) => m.name === name) ?? null;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function addMapping(entry) {
  const saved = await postJSON(BASE, entry);
  items = [...items, saved];
  emit();
  return saved;
}

export async function removeMapping(name) {
  await deleteJSON(BASE, { name });
  items = items.filter((m) => m.name !== name);
  emit();
}
