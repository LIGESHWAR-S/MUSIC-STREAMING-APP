import Comment from '../models/Comment.js';
import { checkIsOffline } from '../config/db.js';
import { fallbackDb } from '../utils/dbFallback.js';

// Get comments for track
export const getTrackComments = async (req, res) => {
  try {
    const { id } = req.params;
    if (checkIsOffline()) {
      const comments = fallbackDb.getComments(id, 'track');
      return res.json(comments);
    }
    const comments = await Comment.find({ trackId: id }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Post comment to track
export const postTrackComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const userId = req.user.id;
    const userName = req.user.username;

    if (checkIsOffline()) {
      const newComment = fallbackDb.addComment(id, 'track', userId, userName, content);
      return res.status(201).json(newComment);
    }

    const comment = new Comment({
      userId,
      trackId: id,
      userName,
      content
    });
    const savedComment = await comment.save();
    res.status(201).json(savedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get comments for playlist
export const getPlaylistComments = async (req, res) => {
  try {
    const { id } = req.params;
    if (checkIsOffline()) {
      const comments = fallbackDb.getComments(id, 'playlist');
      return res.json(comments);
    }
    const comments = await Comment.find({ playlistId: id }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Post comment to playlist
export const postPlaylistComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const userId = req.user.id;
    const userName = req.user.username;

    if (checkIsOffline()) {
      const newComment = fallbackDb.addComment(id, 'playlist', userId, userName, content);
      return res.status(201).json(newComment);
    }

    const comment = new Comment({
      userId,
      playlistId: id,
      userName,
      content
    });
    const savedComment = await comment.save();
    res.status(201).json(savedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
