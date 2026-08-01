import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Track from '../models/Track.js';
import Playlist from '../models/Playlist.js';
import Comment from '../models/Comment.js';
import { readDb } from '../utils/dbFallback.js';

dotenv.config();

const defaultSeedTracks = [
  {
    title: "Midnight Drive",
    artist: "Neon Horizon",
    album: "Synthwave Dreams",
    genre: "Synthwave",
    duration: 372,
    coverUrl: "https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    likesCount: 142
  },
  {
    title: "Ocean Breeze",
    artist: "Lofi Chillout",
    album: "Summer Vibes",
    genre: "Chill / Lofi",
    duration: 423,
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    likesCount: 98
  },
  {
    title: "Cyberpunk Alley",
    artist: "Glitched Out",
    album: "Neo Tokyo",
    genre: "Cyberpunk",
    duration: 302,
    coverUrl: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    likesCount: 256
  },
  {
    title: "Acoustic Sunset",
    artist: "Emma Lindley",
    album: "Simple Strings",
    genre: "Acoustic",
    duration: 502,
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    likesCount: 75
  },
  {
    title: "Electro Energy",
    artist: "Beat Banger",
    album: "Club Nights",
    genre: "Electronic",
    duration: 365,
    coverUrl: "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    likesCount: 184
  },
  {
    title: "Morning Coffee",
    artist: "Jazz Cafe Trio",
    album: "Smooth Roasts",
    genre: "Jazz",
    duration: 412,
    coverUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    likesCount: 110
  },
  {
    title: "Epic Journey",
    artist: "Orchestral Dimensions",
    album: "Cinematic Horizons",
    genre: "Cinematic",
    duration: 388,
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    likesCount: 304
  },
  {
    title: "Urban Beats",
    artist: "MC Rhythm",
    album: "Concrete Jungle",
    genre: "Hip Hop",
    duration: 444,
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    likesCount: 222
  }
];

const seed = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI set. Local JSON file database seeded/checked.");
    readDb();
    process.exit(0);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for seeding...");

    await Track.deleteMany({});
    await Playlist.deleteMany({});
    await Comment.deleteMany({});
    console.log("Cleared existing DB data.");

    const seededTracks = await Track.insertMany(defaultSeedTracks);
    console.log(`Seeded ${seededTracks.length} tracks.`);

    const samplePlaylists = [
      {
        name: "Coding Chill",
        description: "Relaxing beats to keep your mind focused and in the zone.",
        coverUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&h=400&fit=crop",
        tracks: [seededTracks[1]._id, seededTracks[5]._id, seededTracks[3]._id],
        isPrivate: false,
        likesCount: 34
      },
      {
        name: "Night Drive Vibes",
        description: "Late night synthwave and electronic tunes for highway driving.",
        coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=400&h=400&fit=crop",
        tracks: [seededTracks[0]._id, seededTracks[2]._id, seededTracks[4]._id],
        isPrivate: false,
        likesCount: 89
      }
    ];

    const seededPlaylists = await Playlist.insertMany(samplePlaylists);
    console.log(`Seeded ${seededPlaylists.length} playlists.`);

    const sampleComments = [
      {
        trackId: seededTracks[0]._id,
        userName: "SynthLover99",
        content: "Absolute masterpiece! That bassline hits so hard in the second half."
      },
      {
        trackId: seededTracks[0]._id,
        userName: "DevCoder",
        content: "Perfect track for writing React context code. Loving this loop!"
      },
      {
        trackId: seededTracks[1]._id,
        userName: "LofiGirlFan",
        content: "This makes me feel like I am studying on a rainy Sunday afternoon."
      }
    ];

    await Comment.insertMany(sampleComments);
    console.log("Seeded default comments.");

    console.log("Database seeded successfully! 🌱");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seed();
