# BeatStream - Music Streaming Web Application

BeatStream is a premium, modern music streaming web application built with the MERN stack and styled with Tailwind CSS v4. It features personalized recommendations, full audio playback controls, playlist management, IndexedDB-powered offline downloads, real-time comments, likes, and social sharing.

## Key Features

1. **Music Viewing & Personalized Recommendations:**
   - Browsing grid with distinct genres and cards.
   - Recommended tracks computed from top trending user selections.
2. **Advanced Live Search:**
   - Real-time filtering by track name, artist, album, and genre categories.
3. **Interactive Playback Controls:**
   - Core controls: Play, pause, volume slider, mute, seeking, and queue listings.
   - Play modes: Shuffle, repeat (repeat one track, repeat entire queue, no repeat).
4. **Resilient Local Mode & MongoDB Fallback:**
   - If no MongoDB Atlas connection is configured, the server automatically switches to a local JSON file-based database. This allows immediate testing locally out of the box.
5. **IndexedDB Offline Downloading (Premium UX):**
   - Click "Download" on any song to save the audio file directly into the browser's IndexedDB storage.
   - Full offline detection: When the browser is offline, the app switches to offline mode, displaying a warning banner and rendering only your downloaded library for continuous playback.
6. **User Interactions:**
   - Toggle likes for tracks or playlists (uses anonymous IP identification to bypass registration hassle).
   - Real-time comment drawers for sharing reviews on any song.
7. **Social Sharing Integration:**
   - Share tracks to Twitter/X, Facebook, WhatsApp, or copy direct track links. Shared links automatically trigger autoplays on load!

---

## Technical Stack

- **Frontend:** React (Vite SPA template), Tailwind CSS v4, Lucide React Icons.
- **Backend:** Node.js, Express, Mongoose.
- **Database:** MongoDB (or local fallback JSON).
- **Offline Storage:** Browser IndexedDB API.

---

## Local Setup

### 1. Run the Backend Server
```bash
cd server
npm install
npm run seed  # Seed the initial tracks database
npm run start # Start on http://localhost:5000
```

### 2. Run the Frontend Client
```bash
cd client
npm install
npm run dev   # Start Vite server
```

Open your browser at the local Vite address (usually `http://localhost:5173`).

---

## Configuration & Environment Variables

Create a `.env` file in the `/server` folder if you wish to connect to a real MongoDB Atlas cluster:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/beatstream
```
If `MONGODB_URI` is left blank, the app will fall back to using local file-based database storage at `server/data/local_db.json`.

---

## Deployment

### Frontend (Netlify)
1. Commit the `client` directory to a repository.
2. Import the project into Netlify.
3. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
   - **Base directory:** `client`
4. Netlify will use the `netlify.toml` file to configure routes.

### Backend (Render)
1. Import the project into Render as a **Web Service**.
2. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Root Directory:** `server`
3. Add environment variables:
   - `MONGODB_URI` -> Your MongoDB Atlas Connection String
