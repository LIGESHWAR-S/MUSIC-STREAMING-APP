import express from 'express';
import { 
  getAllPlaylists, 
  getPlaylistById, 
  createPlaylist, 
  updatePlaylist, 
  deletePlaylist, 
  addTrackToPlaylist, 
  removeTrackFromPlaylist 
} from '../controllers/playlistsController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get all playlists
router.get('/', getAllPlaylists);

// Get playlist by ID
router.get('/:id', getPlaylistById);

// Create a playlist
router.post('/', auth, createPlaylist);

// Update a playlist
router.put('/:id', auth, updatePlaylist);

// Delete a playlist
router.delete('/:id', auth, deletePlaylist);

// Add a track to playlist
router.post('/:id/tracks', auth, addTrackToPlaylist);

// Remove a track from playlist
router.delete('/:id/tracks/:trackId', auth, removeTrackFromPlaylist);

export default router;
