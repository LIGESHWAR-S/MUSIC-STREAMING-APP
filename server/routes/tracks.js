import express from 'express';
import Track from '../models/Track.js';
import { checkIsOffline } from '../config/db.js';
import { fallbackDb, readDb, writeDb } from '../utils/dbFallback.js';

const router = express.Router();

// Helper to register an external track in local JSON database
const registerExternalTrackJson = (track) => {
  const db = readDb();
  let existing = db.tracks.find(t => t._id === track._id);
  if (!existing) {
    existing = {
      _id: track._id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre,
      duration: track.duration,
      coverUrl: track.coverUrl,
      audioUrl: track.audioUrl,
      likesCount: 0,
      likedBy: []
    };
    db.tracks.push(existing);
    writeDb(db);
  }
  return existing;
};

// Helper to register an external track in MongoDB
const registerExternalTrackMongo = async (track) => {
  let existing = await Track.findOne({ 
    $or: [
      { _id: track._id },
      { audioUrl: track.audioUrl }
    ]
  });
  
  if (!existing) {
    // Generate valid ObjectId if it isn't one, but we can also store string _ids in Mongo if we override the key type,
    // or just let Mongoose generate an ObjectId and map it. 
    // To keep it simple, we can create a new track document with standard ObjectId and save it.
    existing = new Track({
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre,
      duration: track.duration,
      coverUrl: track.coverUrl,
      audioUrl: track.audioUrl,
      likesCount: 0,
      likedBy: []
    });
    // We can preserve the itunes ID by adding a custom field, or just save it
    await existing.save();
  }
  return existing;
};

// Get all tracks (with local search + global iTunes API search)
router.get('/', async (req, res) => {
  try {
    const { q, genre } = req.query;
    
    // 1. Fetch Local Matches
    let localTracks = [];
    if (checkIsOffline()) {
      localTracks = fallbackDb.getTracks();
      if (genre) {
        localTracks = localTracks.filter(t => t.genre.toLowerCase().includes(genre.toLowerCase()));
      }
      if (q) {
        const query = q.toLowerCase();
        localTracks = localTracks.filter(t => 
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query)
        );
      }
    } else {
      let queryObj = {};
      if (genre) {
        queryObj.genre = { $regex: genre, $options: 'i' };
      }
      if (q) {
        queryObj.$or = [
          { title: { $regex: q, $options: 'i' } },
          { artist: { $regex: q, $options: 'i' } },
          { album: { $regex: q, $options: 'i' } }
        ];
      }
      localTracks = await Track.find(queryObj);
    }

    // 2. Fetch from Jamendo API (Full-length tracks) and iTunes API (Commercial Previews)
    let externalTracks = [];
    if (q && q.trim().length > 1) {
      const qLower = q.toLowerCase();
      
      // Fetch full-length independent tracks from Jamendo
      let jamendoTracks = [];
      try {
        const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=jsonpretty&search=${encodeURIComponent(q)}&limit=15`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.results) {
            jamendoTracks = data.results.map(item => ({
              _id: `jamendo_${item.id}`,
              title: `${item.name} (Full Track)`,
              artist: item.artist_name,
              album: item.album_name || 'Single',
              genre: 'Independent',
              duration: parseInt(item.duration) || 180,
              coverUrl: item.image ? item.image : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop',
              audioUrl: item.audio, // Full length direct stream
              likesCount: 0,
              isExternal: true
            })).filter(track => track.audioUrl);
          }
        }
      } catch (err) {
        console.warn("Jamendo API search failed:", err.message);
      }

      // Fetch commercial preview tracks from iTunes
      let itunesTracks = [];
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=15`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.results) {
            itunesTracks = data.results.map(item => ({
              _id: `itunes_${item.trackId}`,
              title: `${item.trackName} (Preview)`,
              artist: item.artistName,
              album: item.collectionName || 'Single',
              genre: item.primaryGenreName || 'Commercial',
              duration: Math.round(item.trackTimeMillis / 1000) || 30,
              coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop',
              audioUrl: item.previewUrl, // 30-second preview stream
              likesCount: 0,
              isExternal: true
            })).filter(track => track.audioUrl);
          }
        }
      } catch (err) {
        console.warn("iTunes API search failed:", err.message);
      }

      // Merge external tracks (giving priority to Jamendo full tracks, followed by iTunes previews)
      externalTracks = [...jamendoTracks, ...itunesTracks];
    }

    // Merge: local first, then external (filtered to remove duplicate IDs and title/artist combos)
    const seenIds = new Set(localTracks.map(t => t._id));
    const seenKeys = new Set(localTracks.map(t => `${t.title.replace(' (Full Track)', '').replace(' (Preview)', '').toLowerCase()}_${t.artist.toLowerCase()}`));
    
    const uniqueExternal = externalTracks.filter(ext => {
      if (seenIds.has(ext._id)) return false;
      seenIds.add(ext._id);
      
      const cleanTitle = ext.title.replace(' (Full Track)', '').replace(' (Preview)', '').toLowerCase();
      const key = `${cleanTitle}_${ext.artist.toLowerCase()}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      
      return true;
    });

    res.json([...localTracks, ...uniqueExternal]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint to register/save an external track when played/liked
router.post('/register', async (req, res) => {
  try {
    const { track } = req.body;
    if (!track || !track.title || !track.audioUrl) {
      return res.status(400).json({ message: "Invalid track details" });
    }

    if (checkIsOffline()) {
      const registered = registerExternalTrackJson(track);
      return res.json(registered);
    }

    const registered = await registerExternalTrackMongo(track);
    res.json(registered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recommended tracks
router.get('/recommendations', async (req, res) => {
  try {
    if (checkIsOffline()) {
      const tracks = fallbackDb.getTracks();
      const recommendations = [...tracks].sort((a, b) => b.likesCount - a.likesCount).slice(0, 4);
      return res.json(recommendations);
    }
    const recommendations = await Track.find().sort({ likesCount: -1 }).limit(4);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unique genres
router.get('/genres', async (req, res) => {
  try {
    if (checkIsOffline()) {
      const tracks = fallbackDb.getTracks();
      const genres = [...new Set(tracks.map(t => t.genre))];
      return res.json(genres);
    }
    const genres = await Track.distinct('genre');
    res.json(genres);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// YouTube video search API (proxied via Backend to bypass client CORS and adblocker issues)
router.get('/yt-search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Missing query parameter 'q'" });
    }

    const searchUrls = [
      `https://invidious.flokinet.to/api/v1/search?q=${encodeURIComponent(q)}`,
      `https://invidious.projectsegfaut.im/api/v1/search?q=${encodeURIComponent(q)}`,
      `https://yewtu.be/api/v1/search?q=${encodeURIComponent(q)}`,
      `https://invidious.privacydev.net/api/v1/search?q=${encodeURIComponent(q)}`
    ];

    for (let i = 0; i < searchUrls.length; i++) {
      try {
        console.log(`Backend resolving YT video ID via instance ${i}: ${searchUrls[i]}`);
        const response = await fetch(searchUrls[i], { signal: AbortSignal.timeout(4000) });
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && data[0].videoId) {
            console.log(`Backend successfully resolved videoId: ${data[0].videoId}`);
            return res.json({ videoId: data[0].videoId });
          }
        }
      } catch (err) {
        console.warn(`Backend YT resolver: Instance ${i} failed:`, err.message);
      }
    }

    // Try a direct scrape fallback if Invidious fails
    try {
      console.log("All Invidious instances failed. Attempting direct scrape fallback...");
      const scrapeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
      const scrapeRes = await fetch(scrapeUrl, { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(4000) 
      });
      if (scrapeRes.ok) {
        const html = await scrapeRes.text();
        const match = html.match(/"videoId":"([^"]+)"/);
        if (match && match[1]) {
          console.log(`Scraper successfully resolved videoId: ${match[1]}`);
          return res.json({ videoId: match[1] });
        }
      }
    } catch (scrapeErr) {
      console.error("Direct scraper fallback failed:", scrapeErr.message);
    }

    res.status(404).json({ message: "Could not resolve video ID" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get track details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (checkIsOffline()) {
      const track = fallbackDb.getTrackById(id);
      if (!track) return res.status(404).json({ message: "Track not found" });
      return res.json(track);
    }
    const track = await Track.findById(id);
    if (!track) return res.status(404).json({ message: "Track not found" });
    res.json(track);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
export { registerExternalTrackJson, registerExternalTrackMongo };
