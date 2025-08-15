export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);

  document.querySelectorAll('input[name="theme"]').forEach((radio) => {
    radio.checked = radio.value === saved;
    radio.addEventListener("change", () => {
      applyTheme(radio.value);
    });
  });
}