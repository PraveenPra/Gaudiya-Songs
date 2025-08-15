// settings.js
import { initTheme } from "./theme.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const defaultSettings = {
    internalSearchEnabled: true,
    showTranslations: true,
    translationLayout: "grouped",
  };
  function loadSettings() {
    try {
      return {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem("gs_settings") || "{}"),
      };
    } catch {
      return { ...defaultSettings };
    }
  }
  function saveSettings(s) {
    localStorage.setItem("gs_settings", JSON.stringify(s));
  }

  const settings = loadSettings();

  const backBtn = document.getElementById("back");
  const internalSearchToggle = document.getElementById("internalSearchToggle");
  const showTranslationsToggle = document.getElementById(
    "showTranslationsToggle"
  );
  const translationLayoutGroup = document.getElementById(
    "translationLayoutGroup"
  );

  backBtn.addEventListener("click", () => history.back());

  function syncToUI() {
    internalSearchToggle.checked = !!settings.internalSearchEnabled;
    showTranslationsToggle.checked = !!settings.showTranslations;
    [...translationLayoutGroup.querySelectorAll("input[type=radio]")].forEach(
      (r) => (r.checked = r.value === settings.translationLayout)
    );
  }
  syncToUI();

  internalSearchToggle.addEventListener("change", (e) => {
    settings.internalSearchEnabled = !!e.target.checked;
    saveSettings(settings);
  });
  showTranslationsToggle.addEventListener("change", (e) => {
    settings.showTranslations = !!e.target.checked;
    saveSettings(settings);
  });
  translationLayoutGroup.addEventListener("change", (e) => {
    if (e.target?.name === "translationLayout") {
      settings.translationLayout = e.target.value;
      saveSettings(settings);
    }
  });
});
