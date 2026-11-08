// Returns a function that writes (or clears) a status line, optionally as an error.
export function statusSetter(el) {
  return (text, isError = false) => {
    el.textContent = text;
    el.classList.toggle("error", isError);
  };
}
