(() => {
  const SONGS_URL = "/songs.json";
  const resultsEl = document.getElementById("results");
  const searchEl = document.getElementById("search");
  const tpl = document.getElementById("result-item");
  const songView = document.getElementById("songView");
  const songTitle = document.getElementById("songTitle");
  const songMeta = document.getElementById("songMeta");
  const songLyrics = document.getElementById("songLyrics");
  const backToResults = document.getElementById("backToResults");
  const openSearchBtn = document.getElementById("openSearch");
  const songSearchEl = document.getElementById("songSearch");

  let SONGS = [];
  let lastQuery = "";
  let currentSong = null;
  let currentSongNorm = "";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js");
    });
  }

  const stripDiacritics = (s) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[’ʻ'`´]/g, "'")
      .toLowerCase();

  const buildIndex = (songs) =>
    songs.map((s) => ({
      ...s,
      normTitle: stripDiacritics(s.title),
      normAuthor: stripDiacritics(s.author || ""),
      normText: stripDiacritics(s.lyrics),
    }));

  function highlightInSong(original, normText, normQuery) {
    if (!normQuery) return original;
    const re = new RegExp(
      normQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi"
    );
    const normOriginal = stripDiacritics(original);
    let result = "";
    let lastIndex = 0;
    normOriginal.replace(re, (match, idx) => {
      result +=
        original.slice(lastIndex, idx) +
        "<mark>" +
        original.slice(idx, idx + match.length) +
        "</mark>";
      lastIndex = idx + match.length;
    });
    result += original.slice(lastIndex);
    return result;
  }

  function renderResults(items) {
    resultsEl.innerHTML = "";
    if (!items.length) {
      resultsEl.innerHTML =
        '<p class="empty">No matches yet. Try typing a word from any line.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const item of items) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".title").textContent = item.title;
      node.querySelector(".meta").textContent = `${
        item.author || "Unknown"
      } • ${item.raga || ""}`.replace(/ • $/, "");
      node.querySelector(".snippet").innerHTML = item.lyrics; // snippet generation omitted for brevity here
      node.addEventListener("click", () => openSong(item));
      frag.appendChild(node);
    }
    resultsEl.appendChild(frag);
  }

  function openSong(item) {
    currentSong = item;
    currentSongNorm = stripDiacritics(item.lyrics);
    songTitle.textContent = item.title;
    songMeta.textContent = `${item.author || "Unknown"}${
      item.source ? " • " + item.source : ""
    }`;
    songLyrics.innerHTML = item.lyrics;
    songSearchEl.classList.add("hidden");
    songSearchEl.value = "";
    document.getElementById("mainHeader").classList.add("hidden");
    resultsEl.classList.add("hidden");
    songView.classList.remove("hidden");
  }

  backToResults.addEventListener("click", () => {
    songView.classList.add("hidden");
    document.getElementById("mainHeader").classList.remove("hidden");
    resultsEl.classList.remove("hidden");
    searchEl.value = lastQuery;
    liveSearch(lastQuery);
  });

  openSearchBtn.addEventListener("click", () => {
    if (songSearchEl.classList.contains("hidden")) {
      songSearchEl.classList.remove("hidden");
      songSearchEl.focus();
    } else {
      songSearchEl.classList.add("hidden");
      songSearchEl.value = "";
      songLyrics.innerHTML = currentSong.lyrics;
    }
  });

  songSearchEl.addEventListener("input", (e) => {
    const q = stripDiacritics(e.target.value.trim());
    if (!q) {
      songLyrics.innerHTML = currentSong.lyrics;
      return;
    }
    songLyrics.innerHTML = highlightInSong(
      currentSong.lyrics,
      currentSongNorm,
      q
    );
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
    )
      .slice(0, 50)
      .map((s) => ({ ...s, _normQ: normQ }));
    renderResults(res);
  }

  searchEl.addEventListener("input", (e) => liveSearch(e.target.value));

  async function loadFromIndexedDB() {
    const items = await DB.getAll(DB.STORE_SONGS);
    if (items?.length) {
      return items;
    }
    return null;
  }

  async function saveSongsToIndexedDB(list) {
    await DB.clearStore(DB.STORE_SONGS);
    await DB.putAll(DB.STORE_SONGS, list);
  }

  async function fetchAndSeed() {
    const resp = await fetch(SONGS_URL, { cache: "no-store" });
    const json = await resp.json();
    const version = json.version || 1;
    const prevVersion = await DB.getMeta("songs_version");
    if (prevVersion !== version) {
      await saveSongsToIndexedDB(json.songs);
      await DB.setMeta("songs_version", version);
    } else {
      const count = (await DB.getAll(DB.STORE_SONGS)).length;
      if (!count) {
        await saveSongsToIndexedDB(json.songs);
      }
    }
    return json.songs;
  }

  async function init() {
    try {
      const cached = await loadFromIndexedDB();
      if (cached) {
        SONGS = buildIndex(cached);
        renderResults([]);
      }
      const fresh = await fetchAndSeed();
      SONGS = buildIndex(fresh);
    } catch (err) {
      console.error("Init failed", err);
      resultsEl.innerHTML =
        '<p class="empty">Offline and no cached data yet. Please reconnect once.</p>';
    }
  }

  init();
})();
