(() => {
  const SONGS_URL = "/songs.json";
  const resultsEl = document.getElementById("results");
  const searchEl = document.getElementById("search");
  const tpl = document.getElementById("result-item");
  const modal = document.getElementById("songModal");
  const closeModalBtn = document.getElementById("closeModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMeta = document.getElementById("modalMeta");
  const modalLyrics = document.getElementById("modalLyrics");

  let SONGS = []; // in-memory

  // Register SW
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js");
    });
  }

  // Utils
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

  function highlightSnippet(original, normText, normQuery, pad = 40) {
    const idx = normText.indexOf(normQuery);
    if (idx === -1) return original.slice(0, Math.min(120, original.length));
    const start = Math.max(0, idx - pad);
    const end = Math.min(normText.length, idx + normQuery.length + pad);
    // Map the slice indices directly to original since we removed combining marks consistently
    const snippet = original.slice(start, end);
    const before = stripDiacritics(original.slice(start, idx));
    const match = original.slice(idx, idx + normQuery.length);
    // Highlight by re-searching inside snippet to avoid diacritic-length quirks
    const re = new RegExp(
      normQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    const normSnippet = stripDiacritics(snippet);
    const m = normSnippet.match(re);
    if (!m) return snippet;
    const mStart = m.index;
    const mEnd = mStart + m[0].length;
    const a = snippet.slice(0, mStart);
    const b = snippet.slice(mStart, mEnd);
    const c = snippet.slice(mEnd);
    return `${a}<mark>${b}</mark>${c}`;
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
      node.querySelector(".snippet").innerHTML = highlightSnippet(
        item.lyrics,
        item.normText,
        item._normQ
      );
      node.addEventListener("click", () => openModal(item));
      frag.appendChild(node);
    }
    resultsEl.appendChild(frag);
  }

  function openModal(item) {
    modalTitle.textContent = item.title;
    modalMeta.textContent = `${item.author || "Unknown"}${
      item.source ? " • " + item.source : ""
    }`;
    modalLyrics.textContent = item.lyrics;
    modal.showModal();
  }

  closeModalBtn.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });

  function liveSearch(q) {
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
      // ensure store populated at least once
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
