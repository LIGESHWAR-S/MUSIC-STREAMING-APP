import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  tracks: [{ type: String, ref: 'Track' }],
  isPrivate: { type: Boolean, default: false },
  likesCount: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.model('Playlist', playlistSchema);
