const DB_NAME = 'music_streaming_db';
const DB_VERSION = 2;
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
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'storageId' });
      store.createIndex('userId', 'userId', { unique: false });
    };
  });
};

export const saveTrack = async (track, blob, userId = 'guest') => {
  const db = await initDb();
  const effectiveUserId = userId || 'guest';
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const record = {
      ...track,
      storageId: `${effectiveUserId}_${track._id}`,
      userId: effectiveUserId,
      audioBlob: blob,
      downloadedAt: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const deleteTrack = async (trackId, userId = 'guest') => {
  const db = await initDb();
  const effectiveUserId = userId || 'guest';
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(`${effectiveUserId}_${trackId}`);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const getDownloadedTracks = async (userId = 'guest') => {
  const db = await initDb();
  const effectiveUserId = userId || 'guest';
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      const userTracks = all.filter(t => (t.userId || 'guest') === effectiveUserId);
      resolve(userTracks);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

export const isTrackDownloaded = async (trackId, userId = 'guest') => {
  const db = await initDb();
  const effectiveUserId = userId || 'guest';
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`${effectiveUserId}_${trackId}`);

    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => resolve(false);
  });
};

export const downloadTrackFile = async (track, onProgress = () => {}, userId = 'guest') => {
  try {
    if (!track.audioUrl) {
      throw new Error("No audio URL available for download.");
    }

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (
      typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1')
        ? 'http://127.0.0.1:5000'
        : 'https://music-streaming-app-xg03.onrender.com'
    );
    const rawAudioUrl = track.audioUrl.startsWith('/') ? `${BACKEND_URL}${track.audioUrl}` : track.audioUrl;
    const downloadUrl = `${BACKEND_URL}/api/tracks/download-proxy?url=${encodeURIComponent(rawAudioUrl)}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;

    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error("Failed to download audio file.");
    
    const blob = await response.blob();
    
    // Save to IndexedDB for offline app database scoped to current user
    await saveTrack(track, blob, userId);
    
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
