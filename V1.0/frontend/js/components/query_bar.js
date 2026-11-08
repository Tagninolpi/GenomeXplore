// Taxid input + RefSeq toggle + Search button, shared by every page that queries NCBI.
// RefSeq on  = RefSeq assemblies only. Off = any reference assembly (incl. GenBank).
// `container` should have the "searchbar" class.
export function createQueryBar(container, { onSearch, onError = () => {} }) {
  container.innerHTML = `
    <input type="text" class="taxid" placeholder="562" aria-label="Taxid" autocomplete="off" />
    <button class="toggle" aria-pressed="true" title="On: RefSeq assemblies only. Off: any reference assembly (incl. GenBank)">RefSeq only</button>
    <button class="search">Search</button>
  `;
  const input = container.querySelector(".taxid");
  const toggle = container.querySelector(".toggle");
  const button = container.querySelector(".search");

  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-pressed", String(toggle.getAttribute("aria-pressed") !== "true"));
  });

  function submit() {
    const taxid = input.value.trim();
    if (!/^\d+$/.test(taxid)) {
      onError("Enter a numeric taxid");
      return;
    }
    onSearch({ taxid, refseq: toggle.getAttribute("aria-pressed") === "true" });
  }

  button.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

  return {
    focus: () => input.focus(),
    setBusy: (busy) => { button.disabled = busy; },
  };
}
