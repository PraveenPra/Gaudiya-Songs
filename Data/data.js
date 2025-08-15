// js/data.js
let songs = [];
let categoryIndex = {};

async function loadSongs() {
  const res = await fetch("../songs.json", { cache: "no-store" });
  songs = await res.json().then((data) => data.songs);
  console.log("Loaded songs:", songs.length);
  buildCategoryIndex();
  console.log("Category index built:", Object.keys(categoryIndex).length);
}

function buildCategoryIndex() {
  categoryIndex = {};
  songs.forEach((song) => {
    if (!song.categories) return;
    song.categories.forEach((cat) => {
      if (!categoryIndex[cat]) categoryIndex[cat] = [];
      categoryIndex[cat].push(song);
    });
  });
}

export { loadSongs, songs, categoryIndex };
