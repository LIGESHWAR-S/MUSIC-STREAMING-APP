import Track from '../models/Track.js';
import Playlist from '../models/Playlist.js';
import { checkIsOffline } from '../config/db.js';
import { fallbackDb } from '../utils/dbFallback.js';

// Toggle like for track
export const toggleTrackLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (checkIsOffline()) {
      const track = fallbackDb.likeTrack(id, userId);
      if (!track) return res.status(404).json({ message: "Track not found" });
      return res.json({ likesCount: track.likesCount, liked: track.likedBy.includes(userId) });
    }

    const track = await Track.findById(id);
    if (!track) return res.status(404).json({ message: "Track not found" });

    const index = track.likedBy.indexOf(userId);
    let liked = false;
    if (index === -1) {
      track.likedBy.push(userId);
      track.likesCount += 1;
      liked = true;
    } else {
      track.likedBy.splice(index, 1);
      track.likesCount = Math.max(0, track.likesCount - 1);
    }
    await track.save();
    res.json({ likesCount: track.likesCount, liked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle like for playlist
export const togglePlaylistLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (checkIsOffline()) {
      const db = fallbackDb.getPlaylists();
      // Simple custom implementation for playlist liking
      const playlist = db.find(p => p._id === id);
      if (!playlist) return res.status(404).json({ message: "Playlist not found" });
      
      if (!playlist.likedBy) playlist.likedBy = [];
      const index = playlist.likedBy.indexOf(userId);
      let liked = false;
      if (index === -1) {
        playlist.likedBy.push(userId);
        playlist.likesCount = (playlist.likesCount || 0) + 1;
        liked = true;
      } else {
        playlist.likedBy.splice(index, 1);
        playlist.likesCount = Math.max(0, (playlist.likesCount || 0) - 1);
      }
      fallbackDb.updatePlaylist(id); // trigger write to file by updating
      return res.json({ likesCount: playlist.likesCount, liked });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    const index = playlist.likedBy.indexOf(userId);
    let liked = false;
    if (index === -1) {
      playlist.likedBy.push(userId);
      playlist.likesCount += 1;
      liked = true;
    } else {
      playlist.likedBy.splice(index, 1);
      playlist.likesCount = Math.max(0, playlist.likesCount - 1);
    }
    await playlist.save();
    res.json({ likesCount: playlist.likesCount, liked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
