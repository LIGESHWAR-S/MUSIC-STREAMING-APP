import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  trackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', required: false },
  playlistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Playlist', required: false },
  userName: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Comment', commentSchema);
