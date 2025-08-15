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
    // 1. Other categories
    if (song.categories) {
      song.categories.forEach((cat) => {
        if (!categoryIndex[cat]) categoryIndex[cat] = [];
        categoryIndex[cat].push(song);
      });
    }

    // 2. Author
    const author = song.author?.trim();
    if (author) {
      const key = `author:${author}`;
      if (!categoryIndex[key]) categoryIndex[key] = [];
      categoryIndex[key].push(song);
    }

    // 3. Deity (put in categories directly with prefix)
    if (song.deity) {
      song.deity.forEach((deity) => {
        const key = `deity:${deity}`;
        if (!categoryIndex[key]) categoryIndex[key] = [];
        categoryIndex[key].push(song);
      });
    }
  });
}

export { loadSongs, songs, categoryIndex };
