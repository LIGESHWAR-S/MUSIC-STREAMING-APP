import Track from '../models/Track.js';
import { checkIsOffline } from '../config/db.js';
import { fallbackDb, readDb, writeDb } from '../utils/dbFallback.js';
import https from 'https';
import { Readable } from 'stream';

const decodeHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
};
import ytdl from '@distube/ytdl-core';
import YTDlpWrapClass from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

const YTDlpWrap = YTDlpWrapClass.default || YTDlpWrapClass;

const isWindows = process.platform === 'win32';
const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const binaryPath = path.join(process.cwd(), binaryName);
let ytDlpInstance = null;

const ensureYtDlpBinary = async () => {
  if (ytDlpInstance) return ytDlpInstance;
  if (!fs.existsSync(binaryPath)) {
    console.log(`Downloading yt-dlp binary at runtime: ${binaryPath}`);
    await YTDlpWrap.downloadFromGithub(binaryPath);
    console.log('yt-dlp binary downloaded successfully.');
    // Grant execution permissions on Linux/Mac containers
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(binaryPath, '755');
        console.log('Granted executable permissions (755) to yt-dlp.');
      } catch (err) {
        console.error('Failed to set executable permissions on yt-dlp binary:', err.message);
      }
    }
  }
  ytDlpInstance = new YTDlpWrap(binaryPath);
  return ytDlpInstance;
};

let spotifyToken = null;
let spotifyTokenExpiresAt = 0;

const getSpotifyToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) return null;
  
  const now = Date.now();
  if (spotifyToken && now < spotifyTokenExpiresAt) {
    return spotifyToken;
  }
  
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (response.ok) {
      const data = await response.json();
      spotifyToken = data.access_token;
      spotifyTokenExpiresAt = now + (data.expires_in - 60) * 1000;
      console.log('Successfully refreshed Spotify Web API Access Token.');
      return spotifyToken;
    }
  } catch (err) {
    console.error('Failed to retrieve Spotify access token:', err.message);
  }
  return null;
};

// Helper to register an external track in local JSON database
export const registerExternalTrackJson = (track) => {
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
export const registerExternalTrackMongo = async (track) => {
  let existing = await Track.findOne({ 
    $or: [
      { _id: track._id },
      { audioUrl: track.audioUrl }
    ]
  });
  
  if (!existing) {
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
    await existing.save();
  }
  return existing;
};

// Get all tracks (with local search + global iTunes API search)
export const getAllTracks = async (req, res) => {
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
          (t.title && t.title.toLowerCase().includes(query)) ||
          (t.artist && t.artist.toLowerCase().includes(query)) ||
          (t.album && t.album.toLowerCase().includes(query))
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

    // 2. Query Full Song Providers: JioSaavn, Audius, Jamendo, and iTunes fallback
    let externalTracks = [];
    if (q && q.trim().length > 1) {
      let saavnTracks = [];
      try {
        const saavnUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(q)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=15&p=1`;
        const response = await fetch(saavnUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.jiosaavn.com/'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.results && Array.isArray(data.results)) {
            saavnTracks = data.results.map(item => {
              const primaryArtists = item.more_info?.artistMap?.primary_artists?.map(a => a.name).join(', ');
              const artist = decodeHtml(primaryArtists || item.subtitle || item.more_info?.singers || 'Artist');
              const title = decodeHtml(item.title || item.song);
              const album = decodeHtml(item.more_info?.album || item.album || 'Single');
              const duration = parseInt(item.more_info?.duration) || 240;
              const coverUrl = item.image 
                ? item.image.replace('150x150', '500x500').replace('50x50', '500x500')
                : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
              const encUrl = item.more_info?.encrypted_media_url;

              return {
                _id: `saavn_${item.id}`,
                title,
                artist,
                album,
                genre: item.more_info?.language ? (item.more_info.language.charAt(0).toUpperCase() + item.more_info.language.slice(1)) : 'Music',
                duration,
                coverUrl,
                audioUrl: encUrl ? `/api/tracks/stream-saavn?enc=${encodeURIComponent(encUrl)}` : '',
                likesCount: 0,
                isExternal: true
              };
            }).filter(t => t.audioUrl);
          }
        }
      } catch (err) {
        console.warn("JioSaavn search failed:", err.message);
      }

      let audiusTracks = [];
      try {
        const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=BeatStream`;
        const response = await fetch(audiusUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.data && Array.isArray(data.data)) {
            audiusTracks = data.data.slice(0, 8).map(item => ({
              _id: `audius_${item.id}`,
              title: decodeHtml(item.title),
              artist: decodeHtml(item.user?.name || 'Independent Artist'),
              album: item.genre || 'Single',
              genre: item.genre || 'Electronic',
              duration: item.duration || 180,
              coverUrl: item.artwork?.['480x480'] || item.artwork?.['150x150'] || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop',
              audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=BeatStream`,
              likesCount: 0,
              isExternal: true
            })).filter(t => t.audioUrl);
          }
        }
      } catch (err) {
        console.warn("Audius search failed:", err.message);
      }

      let jamendoTracks = [];
      try {
        const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=jsonpretty&search=${encodeURIComponent(q)}&limit=8`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.results) {
            jamendoTracks = data.results.map(item => ({
              _id: `jamendo_${item.id}`,
              title: decodeHtml(item.name),
              artist: decodeHtml(item.artist_name),
              album: decodeHtml(item.album_name || 'Single'),
              genre: 'Independent',
              duration: parseInt(item.duration) || 180,
              coverUrl: item.image ? item.image : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop',
              audioUrl: item.audio,
              likesCount: 0,
              isExternal: true
            })).filter(track => track.audioUrl);
          }
        }
      } catch (err) {
        console.warn("Jamendo API search failed:", err.message);
      }

      let itunesTracks = [];
      if (saavnTracks.length === 0 && audiusTracks.length === 0 && jamendoTracks.length === 0) {
        try {
          const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=8`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.results) {
              itunesTracks = data.results.map(item => ({
                _id: `itunes_${item.trackId}`,
                title: decodeHtml(item.trackName),
                artist: decodeHtml(item.artistName),
                album: decodeHtml(item.collectionName || 'Single'),
                genre: item.primaryGenreName || 'Commercial',
                duration: Math.round(item.trackTimeMillis / 1000) || 180,
                coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '500x500bb') : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop',
                audioUrl: item.previewUrl,
                likesCount: 0,
                isExternal: true
              })).filter(track => track.audioUrl);
            }
          }
        } catch (err) {
          console.warn("iTunes API search failed:", err.message);
        }
      }

      externalTracks = [...saavnTracks, ...audiusTracks, ...jamendoTracks, ...itunesTracks];
    }

    // Merge: local first, then external (filtered to remove duplicate IDs and title/artist combos)
    const seenIds = new Set(localTracks.map(t => t._id));
    const seenKeys = new Set(localTracks.map(t => {
      const title = t.title || '';
      const artist = t.artist || '';
      return `${title.replace(' (Full Track)', '').replace(' (Preview)', '').toLowerCase()}_${artist.toLowerCase()}`;
    }));
    
    const uniqueExternal = externalTracks.filter(ext => {
      if (seenIds.has(ext._id)) return false;
      seenIds.add(ext._id);
      
      const title = ext.title || '';
      const artist = ext.artist || '';
      const cleanTitle = title.replace(' (Full Track)', '').replace(' (Preview)', '').toLowerCase();
      const key = `${cleanTitle}_${artist.toLowerCase()}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      
      return true;
    });

    res.json([...localTracks, ...uniqueExternal]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Endpoint to register/save an external track when played/liked
export const registerTrack = async (req, res) => {
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
};

// Get recommended tracks
export const getTrackRecommendations = async (req, res) => {
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
};

// Get unique genres
export const getTrackGenres = async (req, res) => {
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
};

// YouTube video search API (proxied via Backend to bypass client CORS and adblocker issues)
const searchYoutubeViaDDG = async (query) => {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:youtube.com')}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (response.ok) {
      const html = await response.text();
      const match = html.match(/uddg=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D([^&"%]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
  } catch (err) {
    console.warn("DuckDuckGo search resolver failed:", err.message);
  }
  return null;
};

// YouTube video search API (proxied via Backend to bypass client CORS and adblocker issues)
export const searchYoutubeVideo = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Missing query parameter 'q'" });
    }

    // 1. Try DuckDuckGo first (unblocked, keyless, works everywhere)
    console.log(`Backend resolving YT video ID via DuckDuckGo: ${q}`);
    const ddgVideoId = await searchYoutubeViaDDG(q);
    if (ddgVideoId) {
      console.log(`DuckDuckGo successfully resolved videoId: ${ddgVideoId}`);
      return res.json({ videoId: ddgVideoId });
    }

    // 2. Fallback to Invidious search
    const searchUrls = [
      `https://invidious.flokinet.to/api/v1/search?q=${encodeURIComponent(q)}`,
      `https://invidious.projectsegfau.im/api/v1/search?q=${encodeURIComponent(q)}`,
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

    // 3. Fallback to direct scrape
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
};

// Get track details
export const getTrackById = async (req, res) => {
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
};

export const streamTrackAudio = async (req, res) => {
  const { videoId } = req.params;
  const isDownload = req.query.download === 'true';
  const title = req.query.title || 'Song';
  const artist = req.query.artist || 'Artist';
  const fallbackUrl = req.query.fallbackUrl;

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Server streaming YouTube audio for videoId: ${videoId} (download: ${isDownload}, fallback: ${fallbackUrl})`);

  try {
    const ytDlp = await ensureYtDlpBinary();
    
    // Resolve the direct stream URL using yt-dlp
    const audioUrl = await ytDlp.execPromise([
      url,
      '-f', 'ba', // best audio
      '-g' // print URL only
    ]);

    const cleanAudioUrl = audioUrl.trim();
    if (!cleanAudioUrl || !cleanAudioUrl.startsWith('http')) {
      throw new Error("Failed to get audio URL from yt-dlp");
    }

    console.log(`Resolved stream URL via yt-dlp, proxying to client...`);

    // Fetch and proxy the stream to client
    const streamReq = https.get(cleanAudioUrl, (streamRes) => {
      if (streamRes.statusCode >= 400) {
        throw new Error(`Google Video responded with HTTP ${streamRes.statusCode}`);
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      if (isDownload) {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)} - ${encodeURIComponent(artist)}.mp3"`);
      }

      res.writeHead(streamRes.statusCode || 200);
      streamRes.pipe(res);
    });

    streamReq.on('error', (err) => {
      console.error(`Error requesting stream from Google Video:`, err.message);
      if (fallbackUrl && !res.headersSent) {
        return res.redirect(302, fallbackUrl);
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to pipe audio stream" });
      }
    });

  } catch (err) {
    console.error(`yt-dlp stream proxy failed for ${videoId}:`, err.message);
    if (fallbackUrl && !res.headersSent) {
      console.log(`Redirecting to fallback URL: ${fallbackUrl}`);
      return res.redirect(302, fallbackUrl);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to resolve stream" });
    }
  }
};


// JioSaavn Full-Length Audio Stream Proxy (MVC)
export const streamSaavn = async (req, res) => {
  try {
    const { enc, bitrate } = req.query;
    if (!enc) return res.status(400).json({ error: "Missing encrypted media URL" });

    const tokenUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(enc)}&bitrate=${bitrate || 160}&_format=json&_marker=0&ctx=web6dot0`;
    const tokenRes = await fetch(tokenUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.jiosaavn.com/'
      }
    });

    if (!tokenRes.ok) throw new Error("Failed to generate stream token");
    const tokenData = await tokenRes.json();
    if (!tokenData || !tokenData.auth_url) throw new Error("No stream URL generated");

    const audioUrl = tokenData.auth_url;

    // Stream with Range support for seamless seeking and buffering
    const range = req.headers.range;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.jiosaavn.com/'
    };
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const audioResponse = await fetch(audioUrl, { headers: fetchHeaders });
    
    res.status(audioResponse.status);
    res.setHeader('Content-Type', audioResponse.headers.get('content-type') || 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    if (audioResponse.headers.get('content-range')) {
      res.setHeader('Content-Range', audioResponse.headers.get('content-range'));
    }
    if (audioResponse.headers.get('content-length')) {
      res.setHeader('Content-Length', audioResponse.headers.get('content-length'));
    }

    if (audioResponse.body) {
      const reader = audioResponse.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            }).catch(err => controller.error(err));
          }
          push();
        }
      });
      const nodeStream = Readable.fromWeb(stream);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Saavn stream proxy error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream audio" });
    }
  }
};

// CORS Bypass Download Proxy (MVC)
export const downloadProxy = async (req, res) => {
  const { url, title, artist } = req.query;
  if (!url) return res.status(400).send("No download URL provided");
  
  console.log(`CORS Proxy fetching audio download: ${url}`);

  try {
    let targetUrl = url;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // If downloading a stream-saavn URL, resolve the auth_url
    if (url.includes('stream-saavn') && url.includes('enc=')) {
      const match = url.match(/[?&]enc=([^&]+)/);
      if (match && match[1]) {
        const enc = decodeURIComponent(match[1]);
        const tokenUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(enc)}&bitrate=320&_format=json&_marker=0&ctx=web6dot0`;
        const tokenRes = await fetch(tokenUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.jiosaavn.com/'
          }
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData && tokenData.auth_url) {
            targetUrl = tokenData.auth_url;
            fetchHeaders['Referer'] = 'https://www.jiosaavn.com/';
          }
        }
      }
    }

    const audioRes = await fetch(targetUrl, { headers: fetchHeaders });
    if (!audioRes.ok) throw new Error(`HTTP status ${audioRes.status}`);

    res.setHeader('Content-Type', audioRes.headers.get('content-type') || 'audio/mp4');
    if (audioRes.headers.get('content-length')) {
      res.setHeader('Content-Length', audioRes.headers.get('content-length'));
    }

    const safeTitle = encodeURIComponent(title || 'Song');
    const safeArtist = encodeURIComponent(artist || 'Artist');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle} - ${safeArtist}.mp3"`);

    res.status(audioRes.status);
    if (audioRes.body) {
      const reader = audioRes.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            }).catch(err => controller.error(err));
          }
          push();
        }
      });
      const nodeStream = Readable.fromWeb(stream);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error("CORS download proxy request failed:", err.message);
    if (!res.headersSent) {
      res.status(500).send("Failed to proxy download file.");
    }
  }
};
