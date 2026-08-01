import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  isPrivate: { type: Boolean, default: false },
  likesCount: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.model('Playlist', playlistSchema);
