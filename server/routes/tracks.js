import express from 'express';
import { 
  getAllTracks, 
  registerTrack, 
  getTrackRecommendations, 
  getTrackGenres, 
  searchYoutubeVideo, 
  getTrackById,
  streamTrackAudio,
  downloadProxy,
  streamSaavn
} from '../controllers/tracksController.js';

const router = express.Router();

// CORS Bypass Download Proxy Endpoint (MVC)
router.get('/download-proxy', downloadProxy);

// Full-length JioSaavn Audio Stream Proxy (MVC)
router.get('/stream-saavn', streamSaavn);

// Get all tracks (with local search + global JioSaavn / Audius / Jamendo search)
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
