import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, 
  Volume2, VolumeX, Heart, Download, MessageSquare, Share2, 
  ListMusic, Check, Loader, X
} from 'lucide-react';
import { isTrackDownloaded, downloadTrackFile, deleteTrack } from '../utils/db';

const Player = ({ onCommentClick, backendUrl }) => {
  const {
    isPlaying,
    currentTrack,
    progress,
    duration,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    queue,
    isYouTubeMode,
    toggleYouTubeMode
  } = useAudio();

  const iframeRef = useRef(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [ytVideoId, setYtVideoId] = useState(null);
  const [isLoadingYt, setIsLoadingYt] = useState(false);
  const [showMvDrawer, setShowMvDrawer] = useState(true);

  useEffect(() => {
    if (isYouTubeMode) {
      setShowMvDrawer(true);
    }
  }, [currentTrack, isYouTubeMode]);

  // Sync YouTube playback state commands (interval-based to ensure iframe is ready)
  useEffect(() => {
    if (!currentTrack || !isYouTubeMode || !iframeRef.current) return;

    const iframe = iframeRef.current;
    
    let count = 0;
    const interval = setInterval(() => {
      try {
        const msg = isPlaying ? 'playVideo' : 'pauseVideo';
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: msg, args: '' }),
          '*'
        );
        if (!isMuted) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
            '*'
          );
        }
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [isMuted ? 0 : volume * 100] }),
          '*'
        );
      } catch (err) {
        console.warn("YouTube iframe sync error:", err);
      }
      
      count++;
      if (count >= 8) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, volume, isMuted, currentTrack, isYouTubeMode, isLoadingYt]);

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
    if (currentTrack && isYouTubeMode && iframeRef.current) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [val, true] }),
          '*'
        );
      } catch (err) {
        console.warn(err);
      }
    }
  };
  const [downloadState, setDownloadState] = useState('idle'); // 'idle' | 'downloading' | 'downloaded'
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);

  useEffect(() => {
    if (!currentTrack || !isYouTubeMode) {
      setYtVideoId(null);
      return;
    }

    setIsLoadingYt(true);
    
    // Clean up query: take first artist and remove "(Preview)" tags to get the full original version
    const cleanArtist = currentTrack.artist.split(/,|\s+&\s+|\s+and\s+/i)[0].trim();
    const cleanTitle = currentTrack.title
      .replace(/\(Preview\)/gi, '')
      .replace(/\[Preview\]/gi, '')
      .replace(/- Preview/gi, '')
      .trim();
    const query = `${cleanArtist} ${cleanTitle} audio`;
    
    fetch(`${backendUrl}/api/tracks/yt-search?q=${encodeURIComponent(query)}`)
      .then(res => {
        if (!res.ok) throw new Error("Backend search failed");
        return res.json();
      })
      .then(data => {
        if (data && data.videoId) {
          setYtVideoId(data.videoId);
        } else {
          setYtVideoId(null);
        }
        setIsLoadingYt(false);
      })
      .catch(err => {
        console.warn("Backend YouTube search failed, using query fallback:", err.message);
        setYtVideoId(null);
        setIsLoadingYt(false);
      });
  }, [currentTrack, isYouTubeMode, backendUrl]);

  // Synchronise like state when track changes
  useEffect(() => {
    if (!currentTrack) return;
    
    // Set initial likes count
    setLikesCount(currentTrack.likesCount || 0);

    // Fetch track status (if offline, skip API check)
    if (navigator.onLine && !currentTrack.audioBlob) {
      fetch(`${backendUrl}/api/tracks/${currentTrack._id}`)
        .then(res => res.json())
        .then(data => {
          setLikesCount(data.likesCount || 0);
          // Check if liked by local user (using IP as simple storage or just local state)
          // For simplicity, we can also store liked status in localStorage
          const likedList = JSON.parse(localStorage.getItem('likedTracks') || '[]');
          setIsLiked(likedList.includes(currentTrack._id));
        })
        .catch(err => console.error("Error loading track status:", err));
    } else {
      const likedList = JSON.parse(localStorage.getItem('likedTracks') || '[]');
      setIsLiked(likedList.includes(currentTrack._id));
    }

    // Check download status
    checkDownloadStatus();
  }, [currentTrack]);

  const checkDownloadStatus = async () => {
    if (!currentTrack) return;
    const downloaded = await isTrackDownloaded(currentTrack._id);
    setDownloadState(downloaded ? 'downloaded' : 'idle');
  };

  const handleLikeToggle = async () => {
    if (!currentTrack) return;

    const localToken = localStorage.getItem('token');
    if (!localToken) {
      alert("Please log in to like tracks.");
      return;
    }

    let trackToUse = currentTrack;
    if (currentTrack.isExternal) {
      try {
        const regRes = await fetch(`${backendUrl}/api/tracks/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track: currentTrack })
        });
        trackToUse = await regRes.json();
        currentTrack._id = trackToUse._id;
        currentTrack.isExternal = false;
      } catch (err) {
        console.error("Failed to register external track for like:", err);
        return;
      }
    }

    // Toggle local state
    const likedList = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    let updatedList;
    if (isLiked) {
      updatedList = likedList.filter(id => id !== trackToUse._id);
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      updatedList = [...likedList, trackToUse._id];
      setLikesCount(prev => prev + 1);
    }
    localStorage.setItem('likedTracks', JSON.stringify(updatedList));
    setIsLiked(!isLiked);

    // Update backend (if online)
    if (navigator.onLine && !trackToUse.audioBlob) {
      try {
        const response = await fetch(`${backendUrl}/api/likes/tracks/${trackToUse._id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localToken}`
          }
        });
        const data = await response.json();
        setLikesCount(data.likesCount);
      } catch (err) {
        console.error("Error liking track on server:", err);
      }
    }
  };

  const handleDownloadToggle = async () => {
    if (!currentTrack) return;

    if (downloadState === 'downloaded') {
      // Delete download
      await deleteTrack(currentTrack._id);
      setDownloadState('idle');
    } else {
      // Start download
      try {
        setDownloadState('downloading');
        await downloadTrackFile(currentTrack);
        setDownloadState('downloaded');
      } catch (error) {
        setDownloadState('idle');
        alert("Failed to download audio file. Please check your connection.");
      }
    }
  };

  const copyShareLink = () => {
    if (!currentTrack) return;
    const shareUrl = `${window.location.origin}?track=${currentTrack._id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert("Share link copied to clipboard!");
        setShowShareMenu(false);
      });
  };

  const shareToPlatform = (platform) => {
    if (!currentTrack) return;
    const shareUrl = encodeURIComponent(`${window.location.origin}?track=${currentTrack._id}`);
    const text = encodeURIComponent(`Listening to "${currentTrack.title}" by ${currentTrack.artist} on BeatStream! ♬`);
    
    let url = '';
    if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
    } else if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${text}%20${shareUrl}`;
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const getEmbedUrl = () => {
    const origin = window.location.origin;
    if (ytVideoId) {
      return `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3&origin=${origin}`;
    }
    const q = `${currentTrack.artist} ${currentTrack.title}`;
    return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q)}&autoplay=1&enablejsapi=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3&origin=${origin}`;
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* Background YouTube stream resolver iframe (fully invisible to the user) */}
      {isYouTubeMode && (
        <div className="pointer-events-none opacity-0 fixed -top-40 -left-40 w-[2px] h-[2px] overflow-hidden z-0">
          <iframe
            ref={iframeRef}
            src={getEmbedUrl()}
            className="w-full h-full border-none"
            title="YouTube Video Player"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 h-24 glassmorphism border-t border-white/5 flex items-center justify-between px-6 text-white z-20 select-none">
      
      {/* LEFT: Track Info & Actions */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        <img 
          src={currentTrack.coverUrl} 
          alt={currentTrack.title} 
          className="w-14 h-14 rounded-lg object-cover shadow-md shadow-black/40 shrink-0"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
          }}
        />
        <div className="overflow-hidden">
          <h4 className="text-sm font-semibold truncate text-white hover:underline cursor-pointer">
            {currentTrack.title}
          </h4>
          <p className="text-xs text-gray-400 truncate hover:text-white cursor-pointer">
            {currentTrack.artist}
          </p>
        </div>

        <div className="flex items-center gap-2.5 ml-4 shrink-0">

          <button 
            onClick={handleLikeToggle}
            className={`p-1.5 rounded-full transition-colors cursor-pointer hover:bg-white/5 ${
              isLiked ? 'text-spotify-green' : 'text-gray-400 hover:text-white'
            }`}
            title="Like Track"
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
          
          <button 
            onClick={() => onCommentClick(currentTrack)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            title="Comments"
          >
            <MessageSquare size={18} />
          </button>



          {/* Social Share Button */}
          <div className="relative">
            <button 
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              title="Share Track"
            >
              <Share2 size={18} />
            </button>

            {showShareMenu && (
              <div className="absolute bottom-12 left-0 bg-neutral-900 border border-white/10 rounded-xl p-2 w-48 shadow-xl shadow-black/50 flex flex-col gap-1 z-30">
                <button 
                  onClick={() => shareToPlatform('twitter')}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer text-left"
                >
                  Share on X / Twitter
                </button>
                <button 
                  onClick={() => shareToPlatform('facebook')}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer text-left"
                >
                  Share on Facebook
                </button>
                <button 
                  onClick={() => shareToPlatform('whatsapp')}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer text-left"
                >
                  Share on WhatsApp
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button 
                  onClick={copyShareLink}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer text-left"
                >
                  Copy Track Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: Playback Controls & Progress Bar */}
      <div className="flex flex-col items-center gap-1.5 w-2/5 max-w-[600px]">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button 
            onClick={toggleShuffle}
            className={`p-1 transition-colors cursor-pointer ${
              isShuffle ? 'text-spotify-green' : 'text-gray-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>
          
          <button 
            onClick={prevTrack}
            className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Previous"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-md"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" className="ml-0" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-1" />
            )}
          </button>
          
          <button 
            onClick={nextTrack}
            className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Next"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
          
          <button 
            onClick={toggleRepeat}
            className={`p-1 transition-colors cursor-pointer relative ${
              isRepeat !== 'none' ? 'text-spotify-green' : 'text-gray-400 hover:text-white'
            }`}
            title={`Repeat: ${isRepeat}`}
          >
            <Repeat size={16} />
            {isRepeat === 'one' && (
              <span className="absolute -top-1 -right-1 bg-spotify-green text-[8px] text-black font-extrabold w-3 h-3 rounded-full flex items-center justify-center scale-90">
                1
              </span>
            )}
          </button>
        </div>

        {/* Seekbar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] text-gray-400 w-8 text-right font-mono">
            {formatTime(progress)}
          </span>
          <div className="relative flex-1 group">
            <input 
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-spotify-green transition-all"
            />
            {/* Custom filled track representation if required, standard range does fine */}
          </div>
          <span className="text-[10px] text-gray-400 w-8 text-left font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT: Volume & Utilities */}
      <div className="flex items-center justify-end gap-4 w-1/4 min-w-[200px]">
        {/* Offline Download Button */}
        <button 
          onClick={handleDownloadToggle}
          className={`p-2 rounded-full transition-colors cursor-pointer hover:bg-white/5 ${
            downloadState === 'downloaded' 
              ? 'text-spotify-green bg-spotify-green/10' 
              : downloadState === 'downloading'
              ? 'text-yellow-500'
              : 'text-gray-400 hover:text-white'
          }`}
          title={
            downloadState === 'downloaded' 
              ? "Downloaded (Click to delete)" 
              : downloadState === 'downloading'
              ? "Downloading..."
              : "Download for Offline Listening"
          }
          disabled={downloadState === 'downloading'}
        >
          {downloadState === 'downloaded' ? (
            <Check size={18} className="stroke-[3px]" />
          ) : downloadState === 'downloading' ? (
            <Loader size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
        </button>

        {/* Queue Drawer Button */}
        <div className="relative">
          <button 
            onClick={() => setShowQueueDrawer(!showQueueDrawer)}
            className={`p-2 rounded-full transition-colors cursor-pointer hover:bg-white/5 ${
              showQueueDrawer ? 'text-spotify-green bg-white/5' : 'text-gray-400 hover:text-white'
            }`}
            title="Queue"
          >
            <ListMusic size={18} />
          </button>

          {showQueueDrawer && (
            <div className="absolute bottom-12 right-0 bg-neutral-900 border border-white/10 rounded-xl p-4 w-72 shadow-xl shadow-black/50 flex flex-col gap-2 z-30 max-h-[300px] overflow-y-auto">
              <h5 className="font-semibold text-xs text-gray-400 uppercase tracking-wider mb-2">
                Play Queue ({queue.length} songs)
              </h5>
              <div className="space-y-2">
                {queue.map((track, idx) => (
                  <div 
                    key={`${track._id}_idx_${idx}`} 
                    onClick={() => playTrack(track, queue)}
                    className={`flex items-center gap-3 p-1.5 rounded-lg cursor-pointer transition-colors ${
                      track._id === currentTrack._id 
                        ? 'bg-spotify-green/10 text-spotify-green' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <img 
                      src={track.coverUrl} 
                      className="w-8 h-8 rounded object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
                      }}
                    />
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-medium truncate">{track.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2 group/vol">
          <button 
            onClick={toggleMute}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input 
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-spotify-green transition-all"
          />
        </div>
      </div>
    </div>
    </>
  );
};

export default Player;
