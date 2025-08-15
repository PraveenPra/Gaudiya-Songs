(() => {
  // Elements
  const resultsEl = document.getElementById("results");
  const searchEl = document.getElementById("search");
  const tpl = document.getElementById("result-item");
  const songView = document.getElementById("songView");
  const songTitle = document.getElementById("songTitle");
  const songMeta = document.getElementById("songMeta");
  const songContent = document.getElementById("songContent");
  const backToResults = document.getElementById("backToResults");
  const toggleInternalSearchBtn = document.getElementById(
    "toggleInternalSearch"
  );
  const internalSearchContainer = document.getElementById(
    "internalSearchContainer"
  );
  const internalSearchEl = document.getElementById("internalSearch");
  const settingsView = document.getElementById("settingsView");
  const backFromSettings = document.getElementById("backFromSettings");
  const internalSearchToggle = document.getElementById("internalSearchToggle");
  const showTranslationsToggle = document.getElementById(
    "showTranslationsToggle"
  );
  const translationLayoutGroup = document.getElementById(
    "translationLayoutGroup"
  );
  const navHome = document.getElementById("navHome");
  const navGlobalSearch = document.getElementById("navGlobalSearch");
  const navSettings = document.getElementById("navSettings");

  // State
  let SONGS = [];
  let lastQuery = "";
  let currentSong = null;

  const defaultSettings = {
    internalSearchEnabled: true,
    showTranslations: true,
    translationLayout: "grouped", // 'grouped' | 'inline'
  };

  // Utils
  const stripDiacritics = (s) =>
    s
      ?.normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[’ʻ'`´]/g, "'")
      .toLowerCase() || "";

  const escapeRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function highlightDiacriticInsensitive(original, normQuery) {
    if (!normQuery) return original;
    const normOrig = stripDiacritics(original);
    const re = new RegExp(escapeRE(normQuery), "gi");
    let out = "";
    let last = 0;
    normOrig.replace(re, (m, idx) => {
      out +=
        original.slice(last, idx) +
        "<mark>" +
        original.slice(idx, idx + m.length) +
        "</mark>";
      last = idx + m.length;
    });
    out += original.slice(last);
    return out;
  }

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
  let settings = loadSettings();

  // Index building for structured songs
  function buildIndex(songs) {
    return songs.map((s) => {
      const allVerseLines = [];
      const allTransLines = [];
      (s.verses || []).forEach((v) => {
        (v.text || []).forEach((line) => allVerseLines.push(line));
        (v.translation || []).forEach((line) => allTransLines.push(line));
      });
      const normText = stripDiacritics(
        [...allVerseLines, ...allTransLines].join("\n")
      );
      return {
        ...s,
        allVerseLines,
        allTransLines,
        normTitle: stripDiacritics(s.title),
        normAuthor: stripDiacritics(s.author || ""),
        normText,
      };
    });
  }

  // Results rendering helpers
  function makeSnippetFromLines(lines, normQ) {
    for (const line of lines) {
      const normLine = stripDiacritics(line);
      const idx = normLine.indexOf(normQ);
      if (idx !== -1) {
        const pad = 40;
        const start = Math.max(0, idx - pad);
        const end = Math.min(line.length, idx + normQ.length + pad);
        const slice = line.slice(start, end);
        // highlight on the slice using alignment by offsets within the original slice
        const normSlice = stripDiacritics(slice);
        const re = new RegExp(escapeRE(normQ), "i");
        const m = normSlice.match(re);
        if (!m) return slice + "…";
        const a = slice.slice(0, m.index);
        const b = slice.slice(m.index, m.index + m[0].length);
        const c = slice.slice(m.index + m[0].length);
        return `${a}<mark>${b}</mark>${c}` + (end < line.length ? "…" : "");
      }
    }
    return "";
  }

  function renderResults(items) {
    resultsEl.innerHTML = "";
    if (!items.length) {
      resultsEl.innerHTML = '<p class="empty">No matches.</p>';
      return;
    }
    const normQ = stripDiacritics(lastQuery.trim());
    const frag = document.createDocumentFragment();
    for (const item of items) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".title").textContent = item.title;
      node.querySelector(".meta").textContent = `${item.author || "Unknown"}${
        item.book ? " • " + item.book : ""
      }`;

      let snippet = makeSnippetFromLines(item.allVerseLines, normQ);
      if (!snippet) {
        const s2 = makeSnippetFromLines(item.allTransLines, normQ);
        snippet = s2
          ? `<span class="section-label">[Translation]</span> ${s2}`
          : item.allVerseLines[0] || "";
      }
      node.querySelector(".snippet").innerHTML = snippet;
      node.addEventListener("click", () => openSong(item));
      frag.appendChild(node);
    }
    resultsEl.appendChild(frag);
  }

  // Song view rendering
  function renderSongContent(song, normInSongQ = "") {
    const showTrans = settings.showTranslations;
    const layout = settings.translationLayout;

    const wrapVerse = (v, i) => {
      const num = v.n || i + 1;
      const head = `<div class="verse-head"><span class="verse-num">(${num})</span>${
        v.note ? `<span>${v.note}</span>` : ""
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
      if (layout === "inline") {
        return `<article class="verse">${head}<div class="verse-text">${textHtml}</div>${transHtml}</article>`;
      }
      return `<article class="verse">${head}<div class="verse-text">${textHtml}</div></article>`;
    };

    if (layout === "inline") {
      songContent.innerHTML = (song.verses || []).map(wrapVerse).join("");
    } else {
      // grouped: verses section, then translations section (optional)
      const versesHtml = (song.verses || [])
        .map((v, i) => wrapVerse(v, i))
        .join("");
      const transSection = showTrans
        ? `<div class="section-label">Translations</div>` +
          (song.verses || [])
            .map((v, i) => {
              if (!(v.translation || []).length) return "";
              return (
                `<article class="verse">` +
                `<div class="verse-head"><span class="verse-num">(${
                  v.n || i + 1
                })</span>${v.note ? `<span>${v.note}</span>` : ""}</div>` +
                `<div class="translation">${(v.translation || [])
                  .map(
                    (line) =>
                      `<p>${highlightDiacriticInsensitive(
                        line,
                        normInSongQ
                      )}</p>`
                  )
                  .join("")}</div>` +
                `</article>`
              );
            })
            .join("")
        : "";
      songContent.innerHTML = versesHtml + transSection;
    }
  }

  function openSong(item) {
    currentSong = item;
    songTitle.textContent = item.title;
    songMeta.textContent = `${item.author || "Unknown"}${
      item.book ? " • " + item.book : ""
    }`;
    document.getElementById("mainHeader").classList.add("hidden");
    resultsEl.classList.add("hidden");
    settingsView.classList.add("hidden");
    songView.classList.remove("hidden");

    // Toggle internal search affordance based on settings
    toggleInternalSearchBtn.classList.toggle(
      "hidden",
      !settings.internalSearchEnabled
    );
    internalSearchContainer.classList.add("hidden");
    internalSearchEl.value = "";

    renderSongContent(item);
  }

  // Navigation
  backToResults.addEventListener("click", () => {
    songView.classList.add("hidden");
    settingsView.classList.add("hidden");
    document.getElementById("mainHeader").classList.remove("hidden");
    resultsEl.classList.remove("hidden");
    searchEl.value = lastQuery;
    liveSearch(lastQuery);
  });

  navHome.addEventListener("click", () => {
    songView.classList.add("hidden");
    settingsView.classList.add("hidden");
    document.getElementById("mainHeader").classList.remove("hidden");
    resultsEl.classList.remove("hidden");
  });

  navGlobalSearch.addEventListener("click", () => {
    songView.classList.add("hidden");
    settingsView.classList.add("hidden");
    document.getElementById("mainHeader").classList.remove("hidden");
    resultsEl.classList.remove("hidden");
    searchEl.value = "";
    searchEl.focus();
    renderResults([]);
  });

  navSettings.addEventListener("click", () => {
    songView.classList.add("hidden");
    document.getElementById("mainHeader").classList.add("hidden");
    resultsEl.classList.add("hidden");
    settingsView.classList.remove("hidden");
    // sync UI from settings
    internalSearchToggle.checked = !!settings.internalSearchEnabled;
    showTranslationsToggle.checked = !!settings.showTranslations;
    [...translationLayoutGroup.querySelectorAll("input[type=radio]")].forEach(
      (r) => {
        r.checked = r.value === settings.translationLayout;
      }
    );
  });

  backFromSettings.addEventListener("click", () => {
    settingsView.classList.add("hidden");
    document.getElementById("mainHeader").classList.remove("hidden");
    resultsEl.classList.remove("hidden");
  });

  // Settings interactions
  internalSearchToggle?.addEventListener("change", (e) => {
    settings.internalSearchEnabled = !!e.target.checked;
    saveSettings(settings);
    // Reflect immediately if a song is open
    toggleInternalSearchBtn.classList.toggle(
      "hidden",
      !settings.internalSearchEnabled
    );
  });

  showTranslationsToggle?.addEventListener("change", (e) => {
    settings.showTranslations = !!e.target.checked;
    saveSettings(settings);
    if (currentSong)
      renderSongContent(
        currentSong,
        stripDiacritics(internalSearchEl.value.trim())
      );
  });

  translationLayoutGroup?.addEventListener("change", (e) => {
    if (e.target?.name === "translationLayout") {
      settings.translationLayout = e.target.value;
      saveSettings(settings);
      if (currentSong)
        renderSongContent(
          currentSong,
          stripDiacritics(internalSearchEl.value.trim())
        );
    }
  });

  // Internal song search (diacritic-insensitive)
  toggleInternalSearchBtn.addEventListener("click", () => {
    if (!settings.internalSearchEnabled) return;
    internalSearchContainer.classList.toggle("hidden");
    if (!internalSearchContainer.classList.contains("hidden")) {
      internalSearchEl.focus();
    } else {
      internalSearchEl.value = "";
      if (currentSong) renderSongContent(currentSong, "");
    }
  });

  internalSearchEl.addEventListener("input", () => {
    const q = stripDiacritics(internalSearchEl.value.trim());
    if (currentSong) renderSongContent(currentSong, q);
  });

  // Global search
  function liveSearch(q) {
    lastQuery = q;
    const normQ = stripDiacritics(q.trim());
    if (!normQ) {
      renderResults([]);
      return;
    }
    const res = SONGS.filter(
      (s) =>
        s.normTitle.includes(normQ) ||
        s.normAuthor.includes(normQ) ||
        s.normText.includes(normQ)
    ).slice(0, 50);
    renderResults(res);
  }
  searchEl.addEventListener("input", (e) => liveSearch(e.target.value));

  // Init: fetch structured songs.json and build index
  async function init() {
    try {
      const resp = await fetch("/songs.json", { cache: "no-store" });
      const json = await resp.json();
      SONGS = buildIndex(json.songs || []);
      renderResults([]);
    } catch (err) {
      console.error("Failed to load songs.json", err);
      resultsEl.innerHTML =
        '<p class="empty">Offline and no cached data yet. Please reconnect once.</p>';
    }
  }
  init();
})();
