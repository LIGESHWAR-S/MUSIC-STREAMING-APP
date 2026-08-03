import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, ref: 'User', required: true },
  trackId: { type: String, ref: 'Track', required: false },
  playlistId: { type: String, ref: 'Playlist', required: false },
  userName: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Comment', commentSchema);
