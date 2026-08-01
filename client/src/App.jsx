import React, { useState, useEffect } from 'react';
import { AudioProvider, useAudio } from './context/AudioContext';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import TrackCard from './components/TrackCard';
import PlaylistModal from './components/PlaylistModal';
import CommentSection from './components/CommentSection';
import AddSongModal from './components/AddSongModal';
import { 
  Play, Heart, Download, Search, RefreshCw, Trash2, 
  WifiOff, ArrowRight, Music, HeartHandshake, ListMusic
} from 'lucide-react';
import { getDownloadedTracks, saveTrack } from './utils/db';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://music-streaming-app.onrender.com'
);

function AppContent() {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();

  // Navigation and Views
  const [activeTab, setActiveTab] = useState('home');
  const [tracks, setTracks] = useState([]);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genres, setGenres] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modals & Drawers
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState(null);
  const [activeCommentTarget, setActiveCommentTarget] = useState(null);
  const [commentTargetType, setCommentTargetType] = useState('track');
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);

  // Network State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [apiError, setApiError] = useState(null);
  
  // Likes list
  const [likedList, setLikedList] = useState([]);

  // Sync online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchInitialData();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setActiveTab('downloads');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
    loadLikedTracks();
    loadDownloadedTracks();

    // Check query params for shared track links
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    if (trackId) {
      fetchTrackAndPlay(trackId);
    }
  }, []);

  // Watch tab switches to reload downloads
  useEffect(() => {
    if (activeTab === 'downloads') {
      loadDownloadedTracks();
    }
  }, [activeTab]);

  // Handle Search Input (fetch results from unified server API with iTunes search integration)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        performSearch();
      } else {
        fetchInitialData();
      }
    }, 400); // Debounce search requests

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGenre]);

  const loadLikedTracks = () => {
    const liked = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    setLikedList(liked);
  };

  const loadDownloadedTracks = async () => {
    try {
      const offlineTracks = await getDownloadedTracks();
      setDownloadedTracks(offlineTracks);
    } catch (err) {
      console.error("Error reading downloaded tracks:", err);
    }
  };

  const fetchInitialData = async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      setActiveTab('downloads');
      return;
    }

    try {
      // Fetch all tracks (seeded catalog)
      const tracksRes = await fetch(`${BACKEND_URL}/api/tracks`);
      if (!tracksRes.ok) throw new Error(`HTTP status ${tracksRes.status} on tracks`);
      const tracksData = await tracksRes.json();
      setTracks(tracksData);

      // Fetch recommendations
      const recsRes = await fetch(`${BACKEND_URL}/api/tracks/recommendations`);
      if (!recsRes.ok) throw new Error(`HTTP status ${recsRes.status} on recommendations`);
      const recsData = await recsRes.json();
      setRecommendedTracks(recsData);

      // Fetch genres
      const genresRes = await fetch(`${BACKEND_URL}/api/tracks/genres`);
      if (!genresRes.ok) throw new Error(`HTTP status ${genresRes.status} on genres`);
      const genresData = await genresRes.json();
      setGenres(genresData);

      // Fetch playlists
      const playlistsRes = await fetch(`${BACKEND_URL}/api/playlists`);
      if (!playlistsRes.ok) throw new Error(`HTTP status ${playlistsRes.status} on playlists`);
      const playlistsData = await playlistsRes.json();
      setPlaylists(playlistsData);
      
      setApiError(null);
    } catch (err) {
      console.warn("Could not fetch data from server, running offline/local layout mode.");
      setApiError(err.message || String(err));
      setIsOffline(true);
      setActiveTab('downloads');
    }
  };

  const performSearch = async () => {
    if (!navigator.onLine) return;
    setIsSearching(true);
    try {
      let url = `${BACKEND_URL}/api/tracks?q=${encodeURIComponent(searchQuery)}`;
      if (selectedGenre) {
        url += `&genre=${encodeURIComponent(selectedGenre)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setTracks(data || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchTrackAndPlay = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tracks/${id}`);
      if (response.ok) {
        const track = await response.json();
        playTrack(track, [track]);
      }
    } catch (err) {
      console.error("Shared track link loading error:", err);
    }
  };

  // Playlists Operations
  const handlePlaylistSubmit = async (data) => {
    if (playlistToEdit) {
      // Edit
      try {
        const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistToEdit._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          const updated = await res.json();
          setPlaylists(prev => prev.map(p => p._id === updated._id ? updated : p));
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Create
      try {
        const res = await fetch(`${BACKEND_URL}/api/playlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          const created = await res.json();
          setPlaylists(prev => [...prev, created]);
          setActiveTab(`playlist_${created._id}`);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setPlaylistToEdit(null);
  };

  const handleCustomSongUpload = async (songData) => {
    try {
      let blob = null;
      let finalAudioUrl = songData.audioUrl || '';
      
      if (songData.audioFile) {
        blob = songData.audioFile;
      } else if (songData.audioUrl) {
        try {
          const res = await fetch(songData.audioUrl);
          if (res.ok) {
            blob = await res.blob();
          }
        } catch (e) {
          console.warn("Could not cache link audio to Blob, saving as stream url only:", e);
        }
      }

      const newTrack = {
        _id: 'custom_' + Math.random().toString(36).substr(2, 9),
        title: songData.title,
        artist: songData.artist,
        album: songData.album,
        genre: songData.genre,
        coverUrl: songData.coverUrl,
        audioUrl: finalAudioUrl,
        duration: 240,
        likesCount: 0,
        isCustom: true
      };

      await saveTrack(newTrack, blob);
      
      alert(`"${songData.title}" successfully added to your device library!`);
      loadDownloadedTracks();
      setActiveTab('downloads');
    } catch (error) {
      console.error("Error saving custom song:", error);
      alert("Failed to save custom song to browser database.");
    }
  };

  const handleDeletePlaylist = async (id) => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p._id !== id));
        setActiveTab('home');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTrackToPlaylist = async (playlistId, track) => {
    let trackToUse = track;
    
    // Register external tracks on the server first
    if (track.isExternal) {
      try {
        const registerRes = await fetch(`${BACKEND_URL}/api/tracks/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track })
        });
        trackToUse = await registerRes.json();
      } catch (err) {
        console.error("Failed to register external track:", err);
        return;
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: trackToUse._id })
      });
      if (res.ok) {
        const updatedPlaylist = await res.json();
        setPlaylists(prev => prev.map(p => p._id === updatedPlaylist._id ? updatedPlaylist : p));
        alert(`Added "${track.title}" to playlist!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTrackFromPlaylist = async (playlistId, trackId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updatedPlaylist = await res.json();
        setPlaylists(prev => prev.map(p => p._id === updatedPlaylist._id ? updatedPlaylist : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Likes Operations (modified to support registration of external tracks)
  const handleLikeToggle = async (track) => {
    let trackToUse = track;

    // Register external track on the server first
    if (track.isExternal) {
      try {
        const registerRes = await fetch(`${BACKEND_URL}/api/tracks/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track })
        });
        trackToUse = await registerRes.json();
        track.isExternal = false;
        track._id = trackToUse._id;
      } catch (err) {
        console.error("Failed to register external track for like:", err);
        return;
      }
    }

    const trackId = trackToUse._id;
    const updated = likedList.includes(trackId)
      ? likedList.filter(id => id !== trackId)
      : [...likedList, trackId];
    
    setLikedList(updated);
    localStorage.setItem('likedTracks', JSON.stringify(updated));

    // Try posting to backend
    if (navigator.onLine) {
      try {
        await fetch(`${BACKEND_URL}/api/likes/tracks/${trackId}`, { method: 'POST' });
        // Sync tracks lists
        if (searchQuery.trim().length > 1) {
          performSearch();
        } else {
          fetchInitialData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Get active playlist metadata
  const getActivePlaylist = () => {
    if (!activeTab.startsWith('playlist_')) return null;
    const plId = activeTab.replace('playlist_', '');
    return playlists.find(p => p._id === plId) || null;
  };

  const activePlaylist = getActivePlaylist();

  return (
    <div className="min-h-screen text-white pb-28 font-outfit select-none">
      
      {/* SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        playlists={playlists}
        onCreatePlaylistClick={() => {
          setPlaylistToEdit(null);
          setIsPlaylistModalOpen(true);
        }}
        onAddSongClick={() => setIsAddSongModalOpen(true)}
      />

      {/* MAIN CONTAINER */}
      <main className="ml-64 p-8 min-h-screen">
        
        {/* Offline Banner */}
        {isOffline && (
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 rounded-2xl flex flex-col gap-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 text-sm">
                <WifiOff size={18} />
                <span>Offline Mode: Showing downloaded music only. Connect to the internet to search millions of songs.</span>
              </div>
              <button 
                onClick={() => {
                  setIsOffline(!navigator.onLine);
                  setApiError(null);
                  fetchInitialData();
                }}
                className="px-4 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
            {apiError && (
              <div className="p-3 bg-red-950/25 border border-red-500/20 rounded-xl text-xs text-red-300 font-mono space-y-1 mt-1 text-left w-full">
                <p className="font-bold text-red-400">⚠️ Live API Connection Diagnostic:</p>
                <p>Target Server URL: <span className="underline">{BACKEND_URL}</span></p>
                <p>Error Message: {apiError}</p>
                <p className="text-[10px] text-gray-400 mt-1 font-sans">💡 Troubleshooting: If the Target URL is 'localhost', make sure you added the VITE_BACKEND_URL environment variable in Netlify and triggered a 'Clear cache & deploy' build.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW: HOME */}
        {activeTab === 'home' && !isOffline && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Hero / Recommendation */}
            <div className="relative rounded-3xl overflow-hidden glassmorphism p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5 shadow-2xl">
              <div className="space-y-4 max-w-lg">
                <span className="px-3 py-1 bg-spotify-green/10 text-spotify-green text-xs font-bold rounded-full uppercase tracking-wider">
                  Featured Album
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                  Neon Dreams & Synth Beats
                </h1>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Start your day with high-energy electronic rhythms, chill lofi, and smooth ambient background soundscapes. Hand-seeded for the best coding atmosphere.
                </p>
                <button 
                  onClick={() => {
                    if (tracks.length > 0) playTrack(tracks[0], tracks);
                  }}
                  className="px-6 py-3 bg-spotify-green text-black hover:scale-102 transition-transform rounded-full font-bold text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-spotify-green/10"
                >
                  <Play size={16} fill="currentColor" /> Play Now
                </button>
              </div>
              
              <div className="relative group shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=400&h=400&fit=crop" 
                  alt="cover"
                  className="w-48 h-48 md:w-64 md:h-64 rounded-2xl object-cover shadow-2xl border border-white/10 group-hover:rotate-1 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
                  }}
                />
              </div>
            </div>

            {/* Personalized Recommendations */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Recommended for You
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {recommendedTracks.map(track => (
                  <TrackCard 
                    key={track._id} 
                    track={track} 
                    allTracks={recommendedTracks} 
                    playlists={playlists}
                    onAddToPlaylist={handleAddTrackToPlaylist}
                    onCommentClick={(t) => {
                      setActiveCommentTarget(t);
                      setCommentTargetType('track');
                    }}
                    likedList={likedList}
                    onLikeToggle={handleLikeToggle}
                  />
                ))}
              </div>
            </div>

            {/* Genres Browse */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Browse Genres
              </h3>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => {
                    setSelectedGenre('');
                    setActiveTab('search');
                  }}
                  className="px-5 py-3 glassmorphism-card text-xs font-semibold rounded-2xl hover:text-white cursor-pointer"
                >
                  All Genres
                </button>
                {genres.map(g => (
                  <button 
                    key={g}
                    onClick={() => {
                      setSelectedGenre(g);
                      setActiveTab('search');
                    }}
                    className="px-5 py-3 glassmorphism-card text-xs font-semibold rounded-2xl hover:text-white cursor-pointer capitalize"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Recently Played / All Tracks list */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white tracking-tight">
                All Tracks
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tracks.slice(0, 12).map(track => (
                  <TrackCard 
                    key={track._id} 
                    track={track} 
                    allTracks={tracks} 
                    playlists={playlists}
                    onAddToPlaylist={handleAddTrackToPlaylist}
                    onCommentClick={(t) => {
                      setActiveCommentTarget(t);
                      setCommentTargetType('track');
                    }}
                    likedList={likedList}
                    onLikeToggle={handleLikeToggle}
                  />
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW: SEARCH */}
        {activeTab === 'search' && !isOffline && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight font-outfit">
                Search Music
              </h2>
              <p className="text-xs text-gray-400 mt-1">Search millions of songs globally (e.g. Taylor Swift, Hans Zimmer, Coldplay...)</p>
            </div>
            
            {/* Search Bar & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search songs, artists, albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-900 border border-white/5 rounded-2xl text-sm focus:outline-none focus:border-spotify-green transition-colors"
                />
              </div>
              <div className="w-full md:w-48 shrink-0">
                <select 
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-4 py-3.5 bg-neutral-900 border border-white/5 rounded-2xl text-sm focus:outline-none focus:border-spotify-green transition-colors text-gray-300 capitalize"
                >
                  <option value="">All Genres</option>
                  {genres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Grid */}
            <div>
              {isSearching ? (
                <div className="text-center py-20 text-gray-400 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin" size={16} />
                  Searching global database...
                </div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-20 text-gray-500 italic text-sm">
                  {searchQuery ? "No tracks found matching your query." : "Type a query above to explore millions of tracks..."}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {tracks.map(track => (
                    <TrackCard 
                      key={track._id} 
                      track={track} 
                      allTracks={tracks} 
                      playlists={playlists}
                      onAddToPlaylist={handleAddTrackToPlaylist}
                      onCommentClick={(t) => {
                        setActiveCommentTarget(t);
                        setCommentTargetType('track');
                      }}
                      likedList={likedList}
                      onLikeToggle={handleLikeToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: LIKED SONGS */}
        {activeTab === 'liked' && !isOffline && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-700 to-indigo-900 rounded-3xl flex items-center justify-center text-white shadow-lg">
                <Heart size={40} fill="currentColor" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Playlist
                </span>
                <h2 className="text-3xl font-extrabold text-white mt-1">
                  Liked Songs
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Your absolute favorites, all in one place.
                </p>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Liked Tracks list */}
            <div>
              {tracks.filter(t => likedList.includes(t._id)).length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center">
                  <HeartHandshake size={36} className="text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 italic">No liked tracks yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Click the heart icon on any song to save it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {tracks.filter(t => likedList.includes(t._id)).map(track => (
                    <TrackCard 
                      key={track._id} 
                      track={track} 
                      allTracks={tracks.filter(t => likedList.includes(t._id))} 
                      playlists={playlists}
                      onAddToPlaylist={handleAddTrackToPlaylist}
                      onCommentClick={(t) => {
                        setActiveCommentTarget(t);
                        setCommentTargetType('track');
                      }}
                      likedList={likedList}
                      onLikeToggle={handleLikeToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: DOWNLOADS (OFFLINE LIST) */}
        {activeTab === 'downloads' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-teal-700 to-green-950 rounded-3xl flex items-center justify-center text-white shadow-lg">
                <Download size={40} />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Library
                </span>
                <h2 className="text-3xl font-extrabold text-white mt-1">
                  Downloaded Music
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Saved locally on your device. Ready for offline streaming anytime.
                </p>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Offline list */}
            <div>
              {downloadedTracks.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center">
                  <Download size={36} className="text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 italic">No downloaded tracks yet.</p>
                  <p className="text-xs text-gray-600 mt-1">Click the download button on the music player to save songs for offline listening.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {downloadedTracks.map(track => (
                    <TrackCard 
                      key={track._id} 
                      track={track} 
                      allTracks={downloadedTracks} 
                      playlists={[]}
                      onAddToPlaylist={() => {}}
                      onCommentClick={(t) => {
                        setActiveCommentTarget(t);
                        setCommentTargetType('track');
                      }}
                      likedList={likedList}
                      onLikeToggle={handleLikeToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: PLAYLIST DETAIL */}
        {activePlaylist && !isOffline && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <img 
                src={activePlaylist.coverUrl} 
                alt={activePlaylist.name} 
                className="w-32 h-32 rounded-3xl object-cover shadow-2xl border border-white/5 shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
                }}
              />
              <div className="space-y-2 flex-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Playlist
                </span>
                <h2 className="text-3xl font-extrabold text-white">
                  {activePlaylist.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {activePlaylist.description || 'No description provided.'}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-500">
                  <span>Created by You</span>
                  <span>•</span>
                  <span>{activePlaylist.tracks ? activePlaylist.tracks.length : 0} songs</span>
                </div>
              </div>

              {/* Delete / Edit actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setPlaylistToEdit(activePlaylist);
                    setIsPlaylistModalOpen(true);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs rounded-xl font-medium cursor-pointer"
                >
                  Edit Details
                </button>
                <button 
                  onClick={() => handleDeletePlaylist(activePlaylist._id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl cursor-pointer hover:text-red-300 transition-colors"
                  title="Delete Playlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Track rows */}
            <div className="space-y-2">
              {!activePlaylist.tracks || activePlaylist.tracks.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center">
                  <ListMusic size={36} className="text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 italic">This playlist is empty.</p>
                  <p className="text-xs text-gray-600 mt-1">Browse all tracks and click "+" on cards to add music.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activePlaylist.tracks.map((track, index) => {
                    const isPlayingTrack = currentTrack && currentTrack._id === track._id;
                    return (
                      <div 
                        key={track._id}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group"
                        onClick={() => playTrack(track, activePlaylist.tracks)}
                      >
                        <div className="flex items-center gap-4 min-w-[200px] overflow-hidden">
                          <span className="text-xs text-gray-500 w-4 text-center group-hover:hidden">
                            {index + 1}
                          </span>
                          <button 
                            className="w-4 items-center justify-center hidden group-hover:flex text-spotify-green cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPlayingTrack) togglePlay();
                              else playTrack(track, activePlaylist.tracks);
                            }}
                          >
                            <Play size={12} fill="currentColor" />
                          </button>
                          
                          <img 
                             src={track.coverUrl} 
                             className="w-10 h-10 rounded object-cover" 
                             onError={(e) => {
                               e.target.onerror = null;
                               e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
                             }}
                           />
                          
                          <div className="overflow-hidden">
                            <p className={`text-xs font-semibold truncate ${isPlayingTrack ? 'text-spotify-green' : 'text-white'}`}>
                              {track.title}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">
                              {track.artist}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-400 hidden md:block max-w-[150px] truncate">
                          {track.album}
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500 font-mono">
                            {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTrackFromPlaylist(activePlaylist._id, track._id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Remove from Playlist"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* STICKY BOTTOM PLAYER */}
      <Player 
        onCommentClick={(target) => {
          setActiveCommentTarget(target);
          setCommentTargetType('track');
        }}
        backendUrl={BACKEND_URL}
      />

      {/* COMMENTS PANEL DRAWER */}
      <CommentSection 
        isOpen={activeCommentTarget !== null}
        onClose={() => setActiveCommentTarget(null)}
        target={activeCommentTarget}
        targetType={commentTargetType}
        backendUrl={BACKEND_URL}
      />

      {/* PLAYLIST CREATION MODAL */}
      <PlaylistModal 
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setPlaylistToEdit(null);
        }}
        onSubmit={handlePlaylistSubmit}
        playlistToEdit={playlistToEdit}
      />

      {/* CUSTOM SONG UPLOAD MODAL */}
      <AddSongModal 
        isOpen={isAddSongModalOpen}
        onClose={() => setIsAddSongModalOpen(false)}
        onUpload={handleCustomSongUpload}
      />

    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <AppContent />
    </AudioProvider>
  );
}
