import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '..', 'data', 'local_db.json');

// Ensure database directory exists
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initial seed data if file is empty
const defaultSeedTracks = [
  {
    _id: "track_1",
    title: "Midnight Drive",
    artist: "Neon Horizon",
    album: "Synthwave Dreams",
    genre: "Synthwave",
    duration: 372,
    coverUrl: "https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    likesCount: 142,
    likedBy: []
  },
  {
    _id: "track_2",
    title: "Ocean Breeze",
    artist: "Lofi Chillout",
    album: "Summer Vibes",
    genre: "Chill / Lofi",
    duration: 423,
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    likesCount: 98,
    likedBy: []
  },
  {
    _id: "track_3",
    title: "Cyberpunk Alley",
    artist: "Glitched Out",
    album: "Neo Tokyo",
    genre: "Cyberpunk",
    duration: 302,
    coverUrl: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    likesCount: 256,
    likedBy: []
  },
  {
    _id: "track_4",
    title: "Acoustic Sunset",
    artist: "Emma Lindley",
    album: "Simple Strings",
    genre: "Acoustic",
    duration: 502,
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    likesCount: 75,
    likedBy: []
  },
  {
    _id: "track_5",
    title: "Electro Energy",
    artist: "Beat Banger",
    album: "Club Nights",
    genre: "Electronic",
    duration: 365,
    coverUrl: "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    likesCount: 184,
    likedBy: []
  },
  {
    _id: "track_6",
    title: "Morning Coffee",
    artist: "Jazz Cafe Trio",
    album: "Smooth Roasts",
    genre: "Jazz",
    duration: 412,
    coverUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    likesCount: 110,
    likedBy: []
  },
  {
    _id: "track_7",
    title: "Epic Journey",
    artist: "Orchestral Dimensions",
    album: "Cinematic Horizons",
    genre: "Cinematic",
    duration: 388,
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    likesCount: 304,
    likedBy: []
  },
  {
    _id: "track_8",
    title: "Urban Beats",
    artist: "MC Rhythm",
    album: "Concrete Jungle",
    genre: "Hip Hop",
    duration: 444,
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    likesCount: 222,
    likedBy: []
  }
];

const defaultSeedPlaylists = [
  {
    _id: "playlist_1",
    name: "Coding Chill",
    description: "Relaxing beats to keep your mind focused and in the zone.",
    coverUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&h=400&fit=crop",
    tracks: ["track_2", "track_6", "track_4"],
    isPrivate: false,
    likesCount: 34,
    likedBy: [],
    createdAt: new Date().toISOString()
  },
  {
    _id: "playlist_2",
    name: "Night Drive Vibes",
    description: "Late night synthwave and electronic tunes for highway driving.",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=400&h=400&fit=crop",
    tracks: ["track_1", "track_3", "track_5"],
    isPrivate: false,
    likesCount: 89,
    likedBy: [],
    createdAt: new Date().toISOString()
  }
];

const defaultSeedComments = [
  {
    _id: "comment_1",
    trackId: "track_1",
    userName: "SynthLover99",
    content: "Absolute masterpiece! That bassline hits so hard in the second half.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    _id: "comment_2",
    trackId: "track_1",
    userName: "DevCoder",
    content: "Perfect track for writing React context code. Loving this loop!",
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    _id: "comment_3",
    trackId: "track_2",
    userName: "LofiGirlFan",
    content: "This makes me feel like I am studying on a rainy Sunday afternoon.",
    createdAt: new Date().toISOString()
  }
];

// Read from JSON file
export function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDb = {
        tracks: defaultSeedTracks,
        playlists: defaultSeedPlaylists,
        comments: defaultSeedComments
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading JSON local database:", err);
    return { tracks: [], playlists: [], comments: [] };
  }
}

// Write to JSON file
export function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing to JSON local database:", err);
  }
}

// DB Fallback Helper Functions
export const fallbackDb = {
  // TRACKS
  getTracks: () => {
    const db = readDb();
    return db.tracks;
  },
  getTrackById: (id) => {
    const db = readDb();
    return db.tracks.find(t => t._id === id) || null;
  },
  likeTrack: (trackId, userId) => {
    const db = readDb();
    const track = db.tracks.find(t => t._id === trackId);
    if (!track) return null;

    if (!track.likedBy) track.likedBy = [];
    
    const index = track.likedBy.indexOf(userId);
    if (index === -1) {
      track.likedBy.push(userId);
      track.likesCount = (track.likesCount || 0) + 1;
    } else {
      track.likedBy.splice(index, 1);
      track.likesCount = Math.max(0, (track.likesCount || 0) - 1);
    }
    
    writeDb(db);
    return track;
  },

  // PLAYLISTS
  getPlaylists: () => {
    const db = readDb();
    return db.playlists;
  },
  getPlaylistById: (id) => {
    const db = readDb();
    const playlist = db.playlists.find(p => p._id === id);
    if (!playlist) return null;
    
    // Resolve tracks metadata
    const populatedPlaylist = { ...playlist };
    populatedPlaylist.tracks = playlist.tracks.map(tId => db.tracks.find(t => t._id === tId)).filter(Boolean);
    return populatedPlaylist;
  },
  createPlaylist: (name, description, coverUrl) => {
    const db = readDb();
    const newPlaylist = {
      _id: 'playlist_' + Math.random().toString(36).substr(2, 9),
      name,
      description: description || '',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop',
      tracks: [],
      isPrivate: false,
      likesCount: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };
    db.playlists.push(newPlaylist);
    writeDb(db);
    return newPlaylist;
  },
  updatePlaylist: (id, name, description, coverUrl) => {
    const db = readDb();
    const index = db.playlists.findIndex(p => p._id === id);
    if (index === -1) return null;
    
    db.playlists[index] = {
      ...db.playlists[index],
      name: name !== undefined ? name : db.playlists[index].name,
      description: description !== undefined ? description : db.playlists[index].description,
      coverUrl: coverUrl !== undefined ? coverUrl : db.playlists[index].coverUrl,
    };
    
    writeDb(db);
    return db.playlists[index];
  },
  deletePlaylist: (id) => {
    const db = readDb();
    const index = db.playlists.findIndex(p => p._id === id);
    if (index === -1) return false;
    
    db.playlists.splice(index, 1);
    writeDb(db);
    return true;
  },
  addTrackToPlaylist: (playlistId, trackId) => {
    const db = readDb();
    const playlist = db.playlists.find(p => p._id === playlistId);
    if (!playlist) return null;
    
    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      writeDb(db);
    }
    return playlist;
  },
  removeTrackFromPlaylist: (playlistId, trackId) => {
    const db = readDb();
    const playlist = db.playlists.find(p => p._id === playlistId);
    if (!playlist) return null;
    
    playlist.tracks = playlist.tracks.filter(id => id !== trackId);
    writeDb(db);
    return playlist;
  },

  // COMMENTS
  getComments: (targetId, targetType = 'track') => {
    const db = readDb();
    const field = targetType === 'track' ? 'trackId' : 'playlistId';
    return db.comments
      .filter(c => c[field] === targetId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  addComment: (targetId, targetType = 'track', userName, content) => {
    const db = readDb();
    const newComment = {
      _id: 'comment_' + Math.random().toString(36).substr(2, 9),
      trackId: targetType === 'track' ? targetId : undefined,
      playlistId: targetType === 'playlist' ? targetId : undefined,
      userName: userName || 'Anonymous User',
      content,
      createdAt: new Date().toISOString()
    };
    db.comments.push(newComment);
    writeDb(db);
    return newComment;
  }
};
