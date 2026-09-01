import Playlist from '../models/Playlist.js';
import { checkIsOffline } from '../config/db.js';
import { fallbackDb } from '../utils/dbFallback.js';

// Get all playlists
export const getAllPlaylists = async (req, res) => {
  try {
    if (checkIsOffline()) {
      const playlists = fallbackDb.getPlaylists();
      return res.json(playlists);
    }
    const playlists = await Playlist.find().populate('tracks').populate('userId', 'username');
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get playlist by ID
export const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    if (checkIsOffline()) {
      const playlist = fallbackDb.getPlaylistById(id);
      if (!playlist) return res.status(404).json({ message: "Playlist not found" });
      return res.json(playlist);
    }
    const playlist = await Playlist.findById(id).populate('tracks').populate('userId', 'username');
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a playlist
export const createPlaylist = async (req, res) => {
  try {
    const { name, description, coverUrl } = req.body;
    if (!name) return res.status(400).json({ message: "Playlist name is required" });

    const userId = req.user.id;

    if (checkIsOffline()) {
      const newPlaylist = fallbackDb.createPlaylist(userId, name, description, coverUrl);
      return res.status(201).json(newPlaylist);
    }

    const playlist = new Playlist({
      userId,
      name,
      description,
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop',
      tracks: []
    });
    const savedPlaylist = await playlist.save();
    res.status(201).json(savedPlaylist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a playlist
export const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, coverUrl } = req.body;
    const userId = req.user.id;

    if (checkIsOffline()) {
      const playlists = fallbackDb.getPlaylists();
      const localPlaylist = playlists.find(p => p._id === id);
      if (!localPlaylist) return res.status(404).json({ message: "Playlist not found" });
      
      // Verify owner
      if (localPlaylist.userId && localPlaylist.userId !== userId) {
        return res.status(403).json({ message: "You do not have permission to edit this playlist." });
      }

      const updatedPlaylist = fallbackDb.updatePlaylist(id, name, description, coverUrl);
      return res.json(updatedPlaylist);
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    // Verify owner
    if (playlist.userId && playlist.userId !== userId) {
      return res.status(403).json({ message: "You do not have permission to edit this playlist." });
    }

    if (name !== undefined) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (coverUrl !== undefined) playlist.coverUrl = coverUrl;

    const savedPlaylist = await playlist.save();
    res.json(savedPlaylist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a playlist
export const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (checkIsOffline()) {
      const playlists = fallbackDb.getPlaylists();
      const localPlaylist = playlists.find(p => p._id === id);
      if (!localPlaylist) return res.status(404).json({ message: "Playlist not found" });

      if (localPlaylist.userId && localPlaylist.userId !== userId) {
        return res.status(403).json({ message: "You do not have permission to delete this playlist." });
      }

      const deleted = fallbackDb.deletePlaylist(id);
      if (!deleted) return res.status(404).json({ message: "Playlist not found" });
      return res.json({ message: "Playlist deleted successfully" });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    if (playlist.userId && playlist.userId !== userId) {
      return res.status(403).json({ message: "You do not have permission to delete this playlist." });
    }

    await Playlist.findByIdAndDelete(id);
    res.json({ message: "Playlist deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a track to playlist
export const addTrackToPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackId } = req.body;
    const userId = req.user.id;

    if (!trackId) return res.status(400).json({ message: "Track ID is required" });

    if (checkIsOffline()) {
      const playlists = fallbackDb.getPlaylists();
      const localPlaylist = playlists.find(p => p._id === id);
      if (!localPlaylist) return res.status(404).json({ message: "Playlist not found" });

      if (localPlaylist.userId && localPlaylist.userId !== userId) {
        return res.status(403).json({ message: "You do not have permission to add tracks to this playlist." });
      }

      const updated = fallbackDb.addTrackToPlaylist(id, trackId);
      return res.json(updated);
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    if (playlist.userId && playlist.userId !== userId) {
      return res.status(403).json({ message: "You do not have permission to add tracks to this playlist." });
    }

    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      await playlist.save();
    }
    const populated = await Playlist.findById(id).populate('tracks');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove a track from playlist
export const removeTrackFromPlaylist = async (req, res) => {
  try {
    const { id, trackId } = req.params;
    const userId = req.user.id;

    if (checkIsOffline()) {
      const playlists = fallbackDb.getPlaylists();
      const localPlaylist = playlists.find(p => p._id === id);
      if (!localPlaylist) return res.status(404).json({ message: "Playlist not found" });

      if (localPlaylist.userId && localPlaylist.userId !== userId) {
        return res.status(403).json({ message: "You do not have permission to remove tracks from this playlist." });
      }

      const updated = fallbackDb.removeTrackFromPlaylist(id, trackId);
      return res.json(updated);
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    if (playlist.userId && playlist.userId !== userId) {
      return res.status(403).json({ message: "You do not have permission to remove tracks from this playlist." });
    }

    playlist.tracks = playlist.tracks.filter(tid => tid.toString() !== trackId);
    await playlist.save();
    
    const populated = await Playlist.findById(id).populate('tracks');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
