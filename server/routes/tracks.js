import express from 'express';
import { 
  getAllTracks, 
  registerTrack, 
  getTrackRecommendations, 
  getTrackGenres, 
  searchYoutubeVideo, 
  getTrackById 
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

// Get track details
router.get('/:id', getTrackById);

export default router;
