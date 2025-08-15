// app.js — search page
document.addEventListener("DOMContentLoaded", () => {
  const resultsEl = document.getElementById("results");
  const searchEl = document.getElementById("search");
  const tpl = document.getElementById("result-item");

  if (!window.GSUtils) {
    console.error("GSUtils missing — ensure utils.js is loaded before app.js");
    return;
  }
  const { stripDiacritics, buildIndex, makeSnippetFromLines } = window.GSUtils;

  let SONGS = [];
  let lastQuery = "";

  function renderResults(items) {
    resultsEl.innerHTML = "";
    if (!items || !items.length) {
      // resultsEl.innerHTML = '<p class="empty">No matches.</p>';
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
      node.addEventListener("click", () => {
        location.href = "song.html?id=" + encodeURIComponent(item.id);
      });
      node.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ")
          location.href = "song.html?id=" + encodeURIComponent(item.id);
      });
      frag.appendChild(node);
    }
    resultsEl.appendChild(frag);
  }

  // basic debounced search
  let debounceTimer = null;
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
  searchEl.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => liveSearch(e.target.value), 120);
  });

  // bottom nav
  document.getElementById("navHome").addEventListener("click", () => {
    searchEl.value = "";
    searchEl.focus();
    renderResults([]);
  });
  document.getElementById("navGlobalSearch").addEventListener("click", () => {
    searchEl.value = "";
    searchEl.focus();
    renderResults([]);
  });
  document.getElementById("navCategories").addEventListener("click", () => {
    location.href = "categories.html";
  });
  document.getElementById("navSettings").addEventListener("click", () => {
    location.href = "settings.html";
  });

  // register service worker (safe to call multiple times across pages)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    );
  }

  // init — load songs.json, build index
  (async function init() {
    try {
      const resp = await fetch("songs.json", { cache: "no-store" });
      const json = await resp.json();
      SONGS = buildIndex(json.songs || []);
      renderResults([]); // empty initial state
    } catch (err) {
      console.error("Failed to load songs.json", err);
      resultsEl.innerHTML =
        '<p class="empty">Failed to load songs (offline or error). Please retry when online.</p>';
    }
  })();
});

// --- Service Worker Registration & Update Handling ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      console.log("[SW] registered", registration);

      // If a new SW is waiting, prompt immediately
      if (registration.waiting) {
        showUpdateBanner(registration);
      }

      // If a new SW is installed and waiting
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateBanner(registration);
          }
        });
      });
    });

    // Reload once the SW activates
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });
  });
}

function showUpdateBanner(registration) {
  const banner = document.createElement("div");
  banner.className = "update-banner";
  banner.innerHTML = `
    <span>🔄 Update available</span>
    <button>Refresh</button>
  `;
  document.body.appendChild(banner);

  banner.querySelector("button").addEventListener("click", () => {
    if (registration.waiting) {
      registration.waiting.postMessage("skipWaiting");
    }
  });
}
