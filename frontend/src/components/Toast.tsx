export function toast(msg: string) {
  const t = document.getElementById("toast");
  if (t) {
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout((t as any)._timer);
    (t as any)._timer = setTimeout(() => t.classList.remove("show"), 2600);
  }
}
