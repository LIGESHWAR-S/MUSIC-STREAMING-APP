import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String, required: true },
  genre: { type: String, required: true },
  duration: { type: Number, required: true }, // in seconds
  coverUrl: { type: String, required: true },
  audioUrl: { type: String, required: true },
  likesCount: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] } // IP addresses or custom userIds
}, { timestamps: true });

export default mongoose.model('Track', trackSchema);
