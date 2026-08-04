const DB_NAME = 'music_streaming_db';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';

export const initDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_id' });
      }
    };
  });
};

export const saveTrack = async (track, blob) => {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const record = {
      ...track,
      audioBlob: blob,
      downloadedAt: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const deleteTrack = async (trackId) => {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(trackId);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const getDownloadedTracks = async () => {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const isTrackDownloaded = async (trackId) => {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(trackId);

    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => resolve(false);
  });
};

export const downloadTrackFile = async (track, onProgress = () => {}) => {
  try {
    if (!track.audioUrl) {
      throw new Error("No audio URL available for download.");
    }
    const response = await fetch(track.audioUrl);
    if (!response.ok) throw new Error("Failed to download audio file.");
    
    const blob = await response.blob();
    
    // Save to IndexedDB for offline app database
    await saveTrack(track, blob);
    
    // Trigger browser file download to local system Downloads folder
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const extension = track.audioUrl.split('.').pop().split('?')[0] || 'mp3';
    a.download = `${track.title} - ${track.artist}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error downloading track:", error);
    throw error;
  }
};
