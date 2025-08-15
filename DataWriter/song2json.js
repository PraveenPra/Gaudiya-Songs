//helper node script to convert song text files to JSON format
// Usage: node song2json.js
const fs = require("fs");
const path = require("path");

// === CONFIG ===
const inputFile = path.join(__dirname, "input.txt");
const outputFile = path.join(__dirname, "output.json");

function extractField(raw, field) {
  const match = raw.match(new RegExp(`${field}:\\s*(.+)`, "i"));
  return match ? match[1].trim() : "";
}

function generateId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseSong(raw) {
  const title = extractField(raw, "Song Name");
  const author = extractField(raw, "Author");
  const book = extractField(raw, "Book Name");

  const lyricsMatch = raw.match(/LYRICS:\s*([\s\S]+?)\n\s*TRANSLATION/i);
  if (!lyricsMatch) throw new Error("Lyrics section not found");
  const lyricsSection = lyricsMatch[1].trim();

  const translationMatch = raw.match(/TRANSLATION\s*([\s\S]+)/i);
  if (!translationMatch) throw new Error("Translation section not found");
  const translationSection = translationMatch[1].trim();

  const verseRegex = /\((\d+)\)\s*([\s\S]*?)(?=\(\d+\)|$)/g;
  let lyricVerses = [];
  let match;
  while ((match = verseRegex.exec(lyricsSection)) !== null) {
    const n = parseInt(match[1], 10);
    const textLines = match[2]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    lyricVerses[n] = textLines;
  }

  const transVerseRegex = /\d\)\s*([\s\S]*?)(?=\n\s*\d\)|$)/g;
  let translationVerses = [];
  let tIndex = 1;
  let tMatch;
  while ((tMatch = transVerseRegex.exec(translationSection)) !== null) {
    translationVerses[tIndex] = [tMatch[1].trim()];
    tIndex++;
  }

  let verses = [];
  for (let i = 1; i < lyricVerses.length; i++) {
    if (lyricVerses[i]) {
      verses.push({
        n: i,
        text: lyricVerses[i],
        translation: translationVerses[i] || [],
      });
    }
  }

  return {
    id: generateId(title),
    title,
    author,
    book,
    verses,
  };
}

// === MAIN ===
try {
  const raw = fs.readFileSync(inputFile, "utf-8");
  const songObj = parseSong(raw);
  const songString = JSON.stringify(songObj, null, 2);

  if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0) {
    // Append comma + newline before the new object
    fs.appendFileSync(outputFile, ",\n" + songString, "utf-8");
  } else {
    fs.writeFileSync(outputFile, songString, "utf-8");
  }

  console.log(`✅ Song appended to ${outputFile}`);
} catch (err) {
  console.error("❌ Error:", err.message);
}
