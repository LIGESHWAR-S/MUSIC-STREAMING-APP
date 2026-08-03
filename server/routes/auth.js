import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { checkIsOffline } from '../config/db.js';
import { fallbackDb } from '../utils/dbFallback.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'beatstream_jwt_secret_token_key';

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Please enter all fields." });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters long." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let newUserPayload;

    if (checkIsOffline()) {
      const existingUser = fallbackDb.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists." });
      }

      const created = fallbackDb.createUser(username, passwordHash);
      if (!created) {
        return res.status(500).json({ message: "Failed to create user." });
      }
      newUserPayload = created;
    } else {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists." });
      }

      const createdUser = new User({
        username,
        password: passwordHash
      });
      newUserPayload = await createdUser.save();
    }

    const token = jwt.sign(
      { id: newUserPayload._id, username: newUserPayload.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: newUserPayload._id,
        username: newUserPayload.username
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login a user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Please enter all fields." });
    }

    let user;

    if (checkIsOffline()) {
      user = fallbackDb.getUserByUsername(username);
    } else {
      user = await User.findOne({ username });
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    let user;
    if (checkIsOffline()) {
      user = fallbackDb.getUserById(req.user.id);
    } else {
      user = await User.findById(req.user.id).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      id: user._id,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
