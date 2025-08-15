(() => {
  const resultsEl = document.getElementById("results");
  const searchEl = document.getElementById("search");
  const tpl = document.getElementById("result-item");
  const songView = document.getElementById("songView");
  const songTitle = document.getElementById("songTitle");
  const songMeta = document.getElementById("songMeta");
  const songLyrics = document.getElementById("songLyrics");
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
  const navHome = document.getElementById("navHome");
  const navGlobalSearch = document.getElementById("navGlobalSearch");
  const navSettings = document.getElementById("navSettings");

  let SONGS = [];
  let lastQuery = "";
  let currentSong = null;
  let settings = { internalSearchEnabled: true };

  const stripDiacritics = (s) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const buildIndex = (songs) =>
    songs.map((s) => ({
      ...s,
      normTitle: stripDiacritics(s.title),
      normAuthor: stripDiacritics(s.author || ""),
      normText: stripDiacritics(s.lyrics),
    }));

  function renderResults(items) {
    resultsEl.innerHTML = "";
    if (!items.length) {
      resultsEl.innerHTML = '<p class="empty">No matches.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const item of items) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".title").textContent = item.title;
      node.querySelector(".meta").textContent = `${
        item.author || "Unknown"
      } • ${item.raga || ""}`.replace(/ • $/, "");
      node.querySelector(".snippet").textContent =
        item.lyrics.slice(0, 100) + "…";
      node.addEventListener("click", () => openSong(item));
      frag.appendChild(node);
    }
    resultsEl.appendChild(frag);
  }

  function openSong(item) {
    currentSong = item;
    songTitle.textContent = item.title;
    songMeta.textContent = `${item.author || "Unknown"}${
      item.source ? " • " + item.source : ""
    }`;
    songLyrics.textContent = item.lyrics;
    document.getElementById("mainHeader").classList.add("hidden");
    resultsEl.classList.add("hidden");
    songView.classList.remove("hidden");
    internalSearchContainer.classList.add("hidden");
    toggleInternalSearchBtn.classList.toggle(
      "hidden",
      !settings.internalSearchEnabled
    );
  }

  backToResults.addEventListener("click", () => {
    songView.classList.add("hidden");
    document.getElementById("mainHeader").classList.remove("hidden");
    resultsEl.classList.remove("hidden");
    searchEl.value = lastQuery;
    liveSearch(lastQuery);
  });

  toggleInternalSearchBtn.addEventListener("click", () => {
    internalSearchContainer.classList.toggle("hidden");
    if (!internalSearchContainer.classList.contains("hidden")) {
      internalSearchEl.focus();
    }
  });

  internalSearchEl.addEventListener("input", () => {
    const term = stripDiacritics(internalSearchEl.value);
    if (!term) {
      songLyrics.innerHTML = currentSong.lyrics;
      return;
    }
    const regex = new RegExp(`(${term})`, "gi");
    const normLyrics = stripDiacritics(currentSong.lyrics);
    let highlighted = "";
    let lastIndex = 0;
    normLyrics.replace(regex, (match, p1, offset) => {
      highlighted +=
        currentSong.lyrics.slice(lastIndex, offset) +
        "<mark>" +
        currentSong.lyrics.slice(offset, offset + p1.length) +
        "</mark>";
      lastIndex = offset + p1.length;
    });
    highlighted += currentSong.lyrics.slice(lastIndex);
    songLyrics.innerHTML = highlighted;
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
    internalSearchToggle.checked = settings.internalSearchEnabled;
  });

  backFromSettings.addEventListener("click", () => {
    settingsView.classList.add("hidden");
    document.getElementById("mainHeader").classList.remove("hidden");
    resultsEl.classList.remove("hidden");
  });

  internalSearchToggle.addEventListener("change", (e) => {
    settings.internalSearchEnabled = e.target.checked;
  });

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

  async function init() {
    try {
      const resp = await fetch("/songs.json");
      const json = await resp.json();
      SONGS = buildIndex(json.songs);
      renderResults([]);
    } catch (err) {
      console.error(err);
    }
  }

  init();
})();
