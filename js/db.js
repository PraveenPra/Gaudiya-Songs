(function () {
  const DB_NAME = "gaudiya_songs_db";
  const DB_VERSION = 1;
  const STORE_SONGS = "songs";
  const STORE_META = "meta";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SONGS)) {
          const store = db.createObjectStore(STORE_SONGS, { keyPath: "id" });
          store.createIndex("title", "title", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function putAll(storeName, items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function clearStore(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], "readwrite");
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getMeta(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META], "readonly");
      const req = tx.objectStore(STORE_META).get(key);
      req.onsuccess = () => resolve(req.result?.value);
      req.onerror = () => reject(req.error);
    });
  }

  async function setMeta(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_META], "readwrite");
      tx.objectStore(STORE_META).put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getById(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], "readonly");
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  window.DB = {
    openDB,
    putAll,
    clearStore,
    getAll,
    getMeta,
    setMeta,
    getById,
    STORE_SONGS,
    STORE_META,
  };
})();
