// Taxid input + RefSeq toggle + Search button, shared by setup and query.
// RefSeq on  = RefSeq assemblies only. Off = any reference assembly (incl. GenBank).

export function createQueryBar(container, { onSearch, onError }) {
  container.innerHTML = `
    <input type="text" class="taxid" placeholder="9606" aria-label="Taxid" autocomplete="off" />
    <button class="toggle" aria-pressed="true" title="On: RefSeq assemblies only. Off: any reference assembly (incl. GenBank)">RefSeq only</button>
    <button class="search">Search</button>
  `;
  const input = container.querySelector(".taxid");
  const toggle = container.querySelector(".toggle");
  const button = container.querySelector(".search");
  let refseq = true;                              // state of the toggle (on at the start)

// toggle refseq on click
  toggle.addEventListener("click", () => {
    refseq = !refseq;
    toggle.setAttribute("aria-pressed", refseq);
  });

// submit taxid, refseq togle when search clicked
  function submit() {
    const taxid = input.value.trim();
    if (!/^\d+$/.test(taxid)) {                   // digits only
      onError("Enter a numeric taxid");
      return;
    }
    onSearch({ taxid, refseq });
  }

  button.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

  return {
    focus: () => input.focus(),
    setBusy: (busy) => { button.disabled = busy; },
  };
}
