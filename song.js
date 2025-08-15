// song.js
import { initTheme } from "./theme.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const songTitleEl = document.getElementById("songTitle");
  const songMetaEl = document.getElementById("songMeta");
  const songContent = document.getElementById("songContent");
  const backBtn = document.getElementById("back");
  const toggleInternalSearchBtn = document.getElementById(
    "toggleInternalSearch"
  );
  const internalSearchContainer = document.getElementById(
    "internalSearchContainer"
  );
  const internalSearchEl = document.getElementById("internalSearch");
  const navHome = document.getElementById("navHome");
  const navSearch = document.getElementById("navSearch");
  const navSettings = document.getElementById("navSettings");

  if (!window.GSUtils) {
    console.error("GSUtils missing — ensure utils.js loaded.");
    return;
  }
  const { stripDiacritics, highlightDiacriticInsensitive, buildIndex } =
    window.GSUtils;

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
  const settings = loadSettings();

  let SONG = null;

  function renderSongContent(song, normInSongQ = "") {
    const showTrans = settings.showTranslations;
    const layout = settings.translationLayout;

    const wrapVerse = (v, i) => {
      const num = v.n || i + 1;
      const head = `<div class="verse-head"><span class="verse-num">(${num})</span>${
        v.note ? ` <span>${v.note}</span>` : ""
      }</div>`;
      const textHtml = (v.text || [])
        .map(
          (line) => `<p>${highlightDiacriticInsensitive(line, normInSongQ)}</p>`
        )
        .join("");
      const transHtml =
        showTrans && (v.translation || []).length
          ? `<div class="translation"><span class="label">Translation</span>${(
              v.translation || []
            )
              .map(
                (line) =>
                  `<p>${highlightDiacriticInsensitive(line, normInSongQ)}</p>`
              )
              .join("")}</div>`
          : "";
      if (layout === "inline")
        return `<article class="verse">${head}<div class="verse-text">${textHtml}</div>${transHtml}</article>`;
      return `<article class="verse">${head}<div class="verse-text">${textHtml}</div></article>`;
    };

    if (layout === "inline") {
      songContent.innerHTML = (song.verses || []).map(wrapVerse).join("");
    } else {
      const versesHtml = (song.verses || [])
        .map((v, i) => wrapVerse(v, i))
        .join("");
      const transSection = showTrans
        ? `<div class="section-label">Translations</div>` +
          (song.verses || [])
            .map((v, i) => {
              if (!(v.translation || []).length) return "";
              return `<article class="verse"><div class="verse-head"><span class="verse-num">(${
                v.n || i + 1
              })</span>${
                v.note ? ` <span>${v.note}</span>` : ""
              }</div><div class="translation">${(v.translation || [])
                .map(
                  (line) =>
                    `<p>${highlightDiacriticInsensitive(line, normInSongQ)}</p>`
                )
                .join("")}</div></article>`;
            })
            .join("")
        : "";
      songContent.innerHTML = versesHtml + transSection;
    }
    songContent.style.paddingBottom = "4.5rem"; // ensure bottom nav doesn't overlap
  }

  backBtn.addEventListener("click", () => history.back());
  navHome && navHome.addEventListener("click", () => (location.href = "/"));
  navSearch && navSearch.addEventListener("click", () => (location.href = "/"));
  navSettings &&
    navSettings.addEventListener(
      "click",
      () => (location.href = "/settings.html")
    );

  toggleInternalSearchBtn.addEventListener("click", () => {
    if (!settings.internalSearchEnabled) return;
    internalSearchContainer.classList.toggle("hidden");
    if (!internalSearchContainer.classList.contains("hidden"))
      internalSearchEl.focus();
    else {
      internalSearchEl.value = "";
      renderSongContent(SONG, "");
    }
  });
  internalSearchEl.addEventListener("input", () => {
    const q = stripDiacritics(internalSearchEl.value.trim());
    if (SONG) renderSongContent(SONG, q);
  });

  // register SW
  if ("serviceWorker" in navigator)
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    );

  (async function init() {
    if (!id) {
      songTitleEl.textContent = "Song not found";
      return;
    }
    try {
      const resp = await fetch("/songs.json", { cache: "no-store" });
      const json = await resp.json();
      const indexed = buildIndex(json.songs || []);
      const found = indexed.find((s) => s.id === id);
      if (!found) {
        songTitleEl.textContent = "Song not found";
        return;
      }
      SONG = found;
      songTitleEl.textContent = SONG.title;
      songMetaEl.textContent = `${SONG.author || ""}${
        SONG.book ? " • " + SONG.book : ""
      }`;
      toggleInternalSearchBtn.classList.toggle(
        "hidden",
        !settings.internalSearchEnabled
      );
      renderSongContent(SONG, "");
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Failed to load song", err);
      songTitleEl.textContent = "Failed to load song";
    }
  })();
});
