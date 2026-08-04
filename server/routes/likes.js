import express from 'express';
import { toggleTrackLike, togglePlaylistLike } from '../controllers/likesController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Toggle like for track
router.post('/tracks/:id', auth, toggleTrackLike);

// Toggle like for playlist
router.post('/playlists/:id', auth, togglePlaylistLike);

export default router;
