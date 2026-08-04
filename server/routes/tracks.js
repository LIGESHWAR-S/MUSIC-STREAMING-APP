import express from 'express';
import { 
  getAllTracks, 
  registerTrack, 
  getTrackRecommendations, 
  getTrackGenres, 
  searchYoutubeVideo, 
  getTrackById,
  streamTrackAudio
} from '../controllers/tracksController.js';

const router = express.Router();

// Get all tracks (with local search + global iTunes API search)
router.get('/', getAllTracks);

// Endpoint to register/save an external track when played/liked
router.post('/register', registerTrack);

// Get recommended tracks
router.get('/recommendations', getTrackRecommendations);

// Get unique genres
router.get('/genres', getTrackGenres);

// YouTube video search API
router.get('/yt-search', searchYoutubeVideo);

// YouTube audio stream proxy endpoint
router.get('/stream/:videoId', streamTrackAudio);

// YouTube audio download endpoint (alias or query parameter based)
router.get('/download/:videoId', streamTrackAudio);

// Get track details
router.get('/:id', getTrackById);

export default router;
