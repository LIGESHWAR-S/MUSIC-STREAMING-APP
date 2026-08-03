import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
