import express from 'express';
import Playlist from '../models/Playlist.js';
import { checkIsOffline } from '../config/db.js';
import { fallbackDb } from '../utils/dbFallback.js';

const router = express.Router();

// Get all playlists
router.get('/', async (req, res) => {
  try {
    if (checkIsOffline()) {
      const playlists = fallbackDb.getPlaylists();
      return res.json(playlists);
    }
    const playlists = await Playlist.find().populate('tracks');
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get playlist by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (checkIsOffline()) {
      const playlist = fallbackDb.getPlaylistById(id);
      if (!playlist) return res.status(404).json({ message: "Playlist not found" });
      return res.json(playlist);
    }
    const playlist = await Playlist.findById(id).populate('tracks');
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a playlist
router.post('/', async (req, res) => {
  try {
    const { name, description, coverUrl } = req.body;
    if (!name) return res.status(400).json({ message: "Playlist name is required" });

    if (checkIsOffline()) {
      const newPlaylist = fallbackDb.createPlaylist(name, description, coverUrl);
      return res.status(201).json(newPlaylist);
    }

    const playlist = new Playlist({
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
});

// Update a playlist
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, coverUrl } = req.body;

    if (checkIsOffline()) {
      const updatedPlaylist = fallbackDb.updatePlaylist(id, name, description, coverUrl);
      if (!updatedPlaylist) return res.status(404).json({ message: "Playlist not found" });
      return res.json(updatedPlaylist);
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    if (name !== undefined) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (coverUrl !== undefined) playlist.coverUrl = coverUrl;

    const savedPlaylist = await playlist.save();
    res.json(savedPlaylist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a playlist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (checkIsOffline()) {
      const deleted = fallbackDb.deletePlaylist(id);
      if (!deleted) return res.status(404).json({ message: "Playlist not found" });
      return res.json({ message: "Playlist deleted successfully" });
    }

    const playlist = await Playlist.findByIdAndDelete(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json({ message: "Playlist deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a track to playlist
router.post('/:id/tracks', async (req, res) => {
  try {
    const { id } = req.params;
    const { trackId } = req.body;

    if (!trackId) return res.status(400).json({ message: "Track ID is required" });

    if (checkIsOffline()) {
      const updated = fallbackDb.addTrackToPlaylist(id, trackId);
      if (!updated) return res.status(404).json({ message: "Playlist not found" });
      return res.json(updated);
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      await playlist.save();
    }
    const populated = await Playlist.findById(id).populate('tracks');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove a track from playlist
router.delete('/:id/tracks/:trackId', async (req, res) => {
  try {
    const { id, trackId } = req.params;

    if (checkIsOffline()) {
      const updated = fallbackDb.removeTrackFromPlaylist(id, trackId);
      if (!updated) return res.status(404).json({ message: "Playlist not found" });
      return res.json(updated);
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    playlist.tracks = playlist.tracks.filter(tid => tid.toString() !== trackId);
    await playlist.save();
    
    const populated = await Playlist.findById(id).populate('tracks');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
