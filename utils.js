// utils.js — small robust helpers (diacritic strip, index builder, snippet/higlighting)
window.GSUtils = (function () {
  const stripDiacritics = (s) => {
    if (!s) return "";
    try {
      return s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[’ʻ'`´]/g, "'")
        .toLowerCase();
    } catch (e) {
      // older browsers fallback (best-effort)
      return s.replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
  };

  const escapeRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Map a normalized index (position in stripped string) back into an approximate original-string index.
  // Works by incremental accumulation; lines are short so performance is fine.
  function normIndexToOriginalPos(original, normIndex) {
    if (!original) return 0;
    let acc = "";
    for (let i = 0; i <= original.length; i++) {
      const test = original.slice(0, i);
      const normLen = stripDiacritics(test).length;
      if (normLen >= normIndex)
        return Math.max(0, i - (normLen > normIndex ? 1 : 0));
    }
    return original.length;
  }

  // Highlight matches diacritic-insensitively within a single string.
  function highlightDiacriticInsensitive(original, normQuery) {
    if (!normQuery) return original || "";
    const normOrig = stripDiacritics(original || "");
    const q = normQuery;
    const re = new RegExp(escapeRE(q), "gi");
    let out = "";
    let lastNormIdx = 0;
    let match;
    // Use exec loop on normalized text to get indices
    while ((match = re.exec(normOrig)) !== null) {
      const mIdx = match.index;
      const mLen = match[0].length;
      // map to original indices
      const startOrig = normIndexToOriginalPos(original, mIdx);
      const endOrig = normIndexToOriginalPos(original, mIdx + mLen);
      out += original.slice(
        lastNormIdx ? normIndexToOriginalPos(original, lastNormIdx) : 0,
        startOrig
      );
      out += "<mark>" + original.slice(startOrig, endOrig) + "</mark>";
      lastNormIdx = mIdx + mLen;
      if (re.lastIndex === match.index) re.lastIndex++; // avoid zero-length loop
    }
    // append the remainder
    const tailStart = normIndexToOriginalPos(original, lastNormIdx);
    out += original.slice(tailStart);
    return out || original;
  }

  // Build search index for structured songs
  function buildIndex(songs) {
    return (songs || []).map((s) => {
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

  // Create a small snippet (with <mark>) from lines matching normQ
  function makeSnippetFromLines(lines, normQ) {
    if (!lines || !lines.length || !normQ) return "";
    for (const line of lines) {
      const normLine = stripDiacritics(line || "");
      const idx = normLine.indexOf(normQ);
      if (idx !== -1) {
        // get approximate original positions for highlighting
        const startOrig = normIndexToOriginalPos(line, Math.max(0, idx - 20));
        const endOrig = normIndexToOriginalPos(line, idx + normQ.length + 20);
        const slice = line.slice(startOrig, endOrig);
        // highlight inside slice
        const highlighted = highlightDiacriticInsensitive(slice, normQ);
        return highlighted + (endOrig < line.length ? "…" : "");
      }
    }
    return "";
  }

  function renderSong(song) {
    const container = document.getElementById("song-container");
    container.innerHTML = "";

    if (!song) {
      container.innerHTML = "<p>Song not found.</p>";
      return;
    }

    const title = document.createElement("h1");
    title.textContent = song.title;
    container.appendChild(title);

    if (song.author) {
      const author = document.createElement("h3");
      author.textContent = song.author;
      container.appendChild(author);
    }

    if (song.book) {
      const book = document.createElement("h4");
      book.textContent = song.book;
      container.appendChild(book);
    }

    song.verses.forEach((v) => {
      const verseBlock = document.createElement("div");
      verseBlock.classList.add("verse");

      const text = document.createElement("p");
      text.innerHTML = v.text.join("<br>");
      verseBlock.appendChild(text);

      if (v.translation) {
        const trans = document.createElement("p");
        trans.classList.add("translation");
        trans.innerHTML = "<em>" + v.translation.join("<br>") + "</em>";
        verseBlock.appendChild(trans);
      }

      container.appendChild(verseBlock);
    });
  }

  return {
    stripDiacritics,
    highlightDiacriticInsensitive,
    buildIndex,
    makeSnippetFromLines,
    renderSong,
  };
})();
