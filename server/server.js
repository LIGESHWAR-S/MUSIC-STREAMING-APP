import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

// Route Imports
import trackRoutes from './routes/tracks.js';
import playlistRoutes from './routes/playlists.js';
import likeRoutes from './routes/likes.js';
import commentRoutes from './routes/comments.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database Connection
connectDB().then((isConnected) => {
  if (isConnected) {
    console.log("✅ Server initialized with MongoDB Atlas Connection.");
  } else {
    console.log("✅ Server initialized in resilient local mode using JSON database.");
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api/tracks', trackRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/auth', authRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Express Error Handler:", err.stack);
  res.status(500).json({ message: "An unexpected server error occurred." });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
