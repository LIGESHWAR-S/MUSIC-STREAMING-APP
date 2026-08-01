import mongoose from 'mongoose';
import { readDb } from '../utils/dbFallback.js';

let isOffline = true;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️ No MONGODB_URI found in environment variables. Running in resilient local JSON database mode.");
    isOffline = true;
    // Initialise local JSON file
    readDb();
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Quick failure to fall back fast
    });
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);
    isOffline = false;
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn("⚠️ Falling back to resilient local JSON database mode.");
    isOffline = true;
    readDb();
    return false;
  }
};

export const checkIsOffline = () => {
  return isOffline || mongoose.connection.readyState !== 1;
};
