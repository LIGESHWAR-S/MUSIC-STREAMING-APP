import express from 'express';
import { 
  getTrackComments, 
  postTrackComment, 
  getPlaylistComments, 
  postPlaylistComment 
} from '../controllers/commentsController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get comments for track
router.get('/tracks/:id', getTrackComments);

// Post comment to track
router.post('/tracks/:id', auth, postTrackComment);

// Get comments for playlist
router.get('/playlists/:id', getPlaylistComments);

// Post comment to playlist
router.post('/playlists/:id', auth, postPlaylistComment);

export default router;
