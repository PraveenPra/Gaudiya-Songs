import { songs, categoryIndex, loadSongs } from "./data.js";

let occasions = {};
let recentlyViewed = []; // in-memory only, resets on reload

// Load the occasions rules
export async function loadOccasions() {
  const res = await fetch("../occasions.json", { cache: "no-store" });
  occasions = await res.json();
}

// Call whenever a song is viewed
export function markSongViewed(songId) {
  recentlyViewed = [
    songId,
    ...recentlyViewed.filter((id) => id !== songId),
  ].slice(0, 20);
}

function datesEqualOrBetween(today, start, end) {
  const t =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  const s =
    start.getFullYear() + "-" + (start.getMonth() + 1) + "-" + start.getDate();
  const e =
    end.getFullYear() + "-" + (end.getMonth() + 1) + "-" + end.getDate();
  return t >= s && t <= e;
}

// Get currently active occasion based on today's date
function getActiveOccasion() {
  const today = new Date();
  return (
    occasions.occasions.find((occ) => {
      const start = new Date(occ.start_date);
      const end = new Date(occ.end_date);
      return datesEqualOrBetween(today, start, end);
    }) || null
  );
}

// Get current time key for time-based recommendations
function getTimeKey() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 18 && hour < 24) return "night";
  return null;
}

// Main function to get recommended songs
export function getRecommendedSongs(maxCount = 10) {
  const recSongs = [];
  const addedIds = new Set();

  // 1️⃣ Occasion-based recommendations
  const occ = getActiveOccasion();
  if (occ) {
    // Categories
    if (Array.isArray(occ.categories)) {
      occ.categories
        .filter((cat) => cat) // skip empty
        .forEach((cat) => {
          (categoryIndex[cat] || [])
            .sort((a, b) => a.title.localeCompare(b.title))
            .forEach((s) => {
              if (!addedIds.has(s.id) && recSongs.length < maxCount) {
                recSongs.push(s);
                addedIds.add(s.id);
              }
            });
        });
    }

    // Songs by ID
    if (Array.isArray(occ.songs)) {
      occ.songs.forEach((id) => {
        const song = songs.find((s) => s.id === id);
        if (song && !addedIds.has(song.id) && recSongs.length < maxCount) {
          recSongs.push(song);
          addedIds.add(song.id);
        }
      });
    }
  }

  // 2️⃣ Time-of-day recommendations
  const timeKey = getTimeKey();
  if (timeKey && occasions.time_based[timeKey]) {
    const tData = occasions.time_based[timeKey];
    tData.categories.forEach((cat) => {
      (categoryIndex[cat] || []).forEach((s) => {
        if (!addedIds.has(s.id) && recSongs.length < maxCount) {
          recSongs.push(s);
          addedIds.add(s.id);
        }
      });
    });
  }

  // 3️⃣ Recently viewed songs (in-memory)
  recentlyViewed.forEach((id) => {
    const song = songs.find((s) => s.id === id);
    if (song && !addedIds.has(song.id) && recSongs.length < maxCount) {
      recSongs.push(song);
      addedIds.add(s.id);
    }
  });
  console.log("Active occasion:", occ);
  console.log(
    "RecSongs after occasion:",
    recSongs.map((s) => s.id)
  );

  return recSongs;
}

// recSongsByType = { occasion: [...], time: [...], recent: [...] }
export function displayRecommendedSongs(recSongsByType) {
  const container = document.getElementById("recommendations");
  container.innerHTML = ""; // clear previous content

  // Only display if there are songs
  Object.entries(recSongsByType).forEach(([type, songs]) => {
    if (!songs.length) return;

    // Create a wrapper box
    const box = document.createElement("div");
    box.className = `rec-box rec-${type}`;

    // Label / heading
    const label = document.createElement("div");
    label.className = "rec-label";
    if (type === "occasion") {
      // Show actual occasion name dynamically
      label.textContent = getActiveOccasion()?.name || "Occasion";
    } else if (type === "time") {
      label.textContent = "Time-of-Day";
    } else if (type === "recent") {
      label.textContent = "Recently Viewed";
    }
    box.appendChild(label);

    // Songs list
    const ul = document.createElement("ul");
    ul.className = "songs-list";
    songs.forEach((song) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `song.html?id=${encodeURIComponent(song.id)}`;
      a.textContent = song.title;
      li.appendChild(a);
      ul.appendChild(li);
    });

    box.appendChild(ul);
    container.appendChild(box);
  });
}

export function getRecommendedSongsStructured(maxCount = 10) {
  const recByType = { occasion: [], time: [], recent: [] };
  const addedIds = new Set();

  // Occasion
  const occ = getActiveOccasion();
  if (occ) {
    if (Array.isArray(occ.categories)) {
      occ.categories.forEach((cat) => {
        (categoryIndex[cat] || []).forEach((s) => {
          if (!addedIds.has(s.id) && recByType.occasion.length < maxCount) {
            recByType.occasion.push(s);
            addedIds.add(s.id);
          }
        });
      });
    }
    if (Array.isArray(occ.songs)) {
      occ.songs.forEach((id) => {
        const song = songs.find((s) => s.id === id);
        if (
          song &&
          !addedIds.has(song.id) &&
          recByType.occasion.length < maxCount
        ) {
          recByType.occasion.push(song);
          addedIds.add(song.id);
        }
      });
    }
  }

  // Time-of-day
  const timeKey = getTimeKey();
  if (timeKey && occasions.time_based[timeKey]) {
    const tData = occasions.time_based[timeKey];
    tData.categories.forEach((cat) => {
      (categoryIndex[cat] || []).forEach((s) => {
        if (!addedIds.has(s.id) && recByType.time.length < maxCount) {
          recByType.time.push(s);
          addedIds.add(s.id);
        }
      });
    });
  }

  // Recently viewed
  recentlyViewed.forEach((id) => {
    const song = songs.find((s) => s.id === id);
    if (song && !addedIds.has(song.id) && recByType.recent.length < maxCount) {
      recByType.recent.push(song);
      addedIds.add(song.id);
    }
  });

  return recByType;
}
