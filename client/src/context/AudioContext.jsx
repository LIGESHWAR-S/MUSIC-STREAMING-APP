import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AudioContext = createContext(null);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

export const AudioProvider = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [progress, setProgress] = useState(0); // in seconds
  const [duration, setDuration] = useState(0); // in seconds
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState('none'); // 'none' | 'one' | 'all'
  const [queue, setQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isYouTubeMode, setIsYouTubeMode] = useState(false);

  const audioRef = useRef(new Audio());
  const blobUrlRef = useRef(null);
  const fallbackUrlRef = useRef(null);

  // Synchronise volume for HTML5 audio
  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle playing state for HTML5 audio
  useEffect(() => {
    if (isYouTubeMode) {
      audioRef.current.pause();
      return;
    }

    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.error("Playback failed in useEffect:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isYouTubeMode, currentTrack]);

  // Simulated progress timer for YouTube (external) tracks
  useEffect(() => {
    let interval = null;
    if (isPlaying && isYouTubeMode) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= duration) {
            handleNextTrack(true); // Natural end
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isYouTubeMode, duration, queue, currentQueueIndex, isRepeat, isShuffle]);

  // HTML5 Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (!isYouTubeMode) {
        setProgress(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isYouTubeMode) {
        setDuration(audio.duration || 0);
      }
    };

    const handleEnded = () => {
      if (!isYouTubeMode) {
        handleNextTrack(true);
      }
    };

    const handleAudioError = (e) => {
      if (isYouTubeMode) return;
      const err = audio.error;
      
      // Graceful fallback to 30-second preview locally if the YouTube stream fails (e.g. residential IP block)
      if (fallbackUrlRef.current && audio.src.includes('/stream/')) {
        const preview = fallbackUrlRef.current;
        fallbackUrlRef.current = null; // Clear to prevent infinite fallback loop
        
        console.warn("YouTube stream failed to load (possibly blocked locally). Falling back to iTunes preview URL...");
        
        // Remove stream properties so it plays preview
        const fallbackTrack = {
          ...currentTrack,
          audioUrl: preview,
          duration: 30 // Reset duration to 30 seconds
        };
        
        setCurrentTrack(fallbackTrack);
        audio.src = preview;
        audio.load();
        audio.play().catch(playErr => {
          console.error("Fallback preview playback failed:", playErr);
        });
        return;
      }

      let message = "An error occurred during audio loading/playback.";
      if (err) {
        switch (err.code) {
          case err.MEDIA_ERR_ABORTED:
            message = "Audio playback was aborted by the user or system.";
            break;
          case err.MEDIA_ERR_NETWORK:
            message = "A network error caused the audio download to fail.";
            break;
          case err.MEDIA_ERR_DECODE:
            message = "The audio decode failed (file is corrupted or format unsupported).";
            break;
          case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = "Audio stream link not supported or has expired/broken.";
            break;
        }
      }
      console.warn("Audio Element playback error:", message, e);
      alert(`Playback Error: "${currentTrack ? currentTrack.title : 'Track'}"\nReason: ${message}`);
      setIsPlaying(false);
      
      // Auto-advance to next track in the queue after a brief delay
      setTimeout(() => {
        handleNextTrack(false);
      }, 1000);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleAudioError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleAudioError);
    };
  }, [isYouTubeMode, queue, currentQueueIndex, isRepeat, isShuffle, currentTrack]);

  // Play a specific track
  const playTrack = async (track, currentQueue = []) => {
    // Revoke previous blob URL if any
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    let trackToPlay = { ...track };

    // Setup Queue
    let finalQueue = currentQueue.length > 0 ? currentQueue : [trackToPlay];
    setQueue(finalQueue);
    const index = finalQueue.findIndex(t => t._id === track._id);
    setCurrentQueueIndex(index !== -1 ? index : 0);

    // Set initial track metadata so UI updates instantly
    setCurrentTrack(trackToPlay);
    setIsPlaying(true);
    setProgress(0);

    // Check if it's an external track that needs its YouTube direct stream resolved
    const needsStream = trackToPlay.isExternal && 
                        trackToPlay.audioUrl && 
                        !trackToPlay.audioUrl.includes('/stream/') && 
                        !trackToPlay.audioUrl.includes('soundhelix') && 
                        !trackToPlay.audioUrl.includes('jamendo');

    if (needsStream) {
      // Store preview URL synchronously in ref to bypass any React state race conditions in error handlers
      fallbackUrlRef.current = trackToPlay.audioUrl;

      // S1. Synchronously load and play the iTunes preview URL instantly!
      // This locks the user gesture onto the audio element so unmuted playback is permanently enabled!
      audioRef.current.src = trackToPlay.audioUrl;
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.warn("Synchronous preview autoplay deferred:", err.message);
      });

      try {
        const cleanArtist = (trackToPlay.artist || '').split(/,|\s+&\s+|\s+and\s+/i)[0].trim();
        const cleanTitle = (trackToPlay.title || '')
          .replace(/\(Preview\)/gi, '')
          .replace(/\[Preview\]/gi, '')
          .replace(/- Preview/gi, '')
          .trim();
        const query = `${cleanArtist} ${cleanTitle} audio`;
        
        const res = await fetch(`${BACKEND_URL}/api/tracks/yt-search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.videoId) {
            const streamUrl = `${BACKEND_URL}/api/tracks/stream/${data.videoId}`;
            
            // Save preview fallback URL
            trackToPlay.previewUrl = trackToPlay.audioUrl;
            trackToPlay.audioUrl = streamUrl;
            trackToPlay.duration = 240; // Est. 4 mins
            
            // Sync the original track ref
            track.previewUrl = track.audioUrl;
            track.audioUrl = streamUrl;
            track.duration = 240;

            const currentProgress = audioRef.current.currentTime;

            // S2. Swap source to the full stream (browser permits it because of the locked gesture!)
            audioRef.current.src = streamUrl;
            audioRef.current.load();
            
            if (currentProgress > 0 && currentProgress < 20) {
              audioRef.current.currentTime = currentProgress;
            }

            audioRef.current.play().catch(err => {
              console.warn("Asynchronous stream play failed, returning to preview:", err.message);
              audioRef.current.src = trackToPlay.previewUrl;
              audioRef.current.load();
              audioRef.current.play().catch(() => {});
            });

            // Re-update current track with resolved stream
            setCurrentTrack(trackToPlay);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to resolve full song stream URL:", err);
        return;
      }
      return;
    }

    // Play regular tracks (seeded/downloaded/jamendo) via HTML5 Audio
    fallbackUrlRef.current = null;
    setIsYouTubeMode(false);
    
    let sourceUrl = trackToPlay.audioUrl;
    if (trackToPlay.audioBlob) {
      blobUrlRef.current = URL.createObjectURL(trackToPlay.audioBlob);
      sourceUrl = blobUrlRef.current;
    }
    
    // Set source and play only if we have a valid URL
    if (sourceUrl) {
      audioRef.current.src = sourceUrl;
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.warn("HTML5 audio autoplay deferred:", err.message);
      });
    }
  };

  const togglePlay = () => {
    if (!currentTrack && queue.length > 0) {
      playTrack(queue[0], queue);
    } else if (currentTrack) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextTrack = (isNaturalEnd = false) => {
    if (queue.length === 0) return;

    if (isNaturalEnd && isRepeat === 'one') {
      if (isYouTubeMode) {
        setProgress(0);
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    let nextIndex = currentQueueIndex + 1;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (isRepeat === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        setProgress(0);
        return;
      }
    }

    setCurrentQueueIndex(nextIndex);
    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      playTrack(nextTrack, queue);
    }
  };

  const handlePrevTrack = () => {
    if (queue.length === 0) return;

    if (isYouTubeMode) {
      if (progress > 3) {
        setProgress(0);
        return;
      }
    } else {
      if (audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        setProgress(0);
        return;
      }
    }

    let prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
      if (isRepeat === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    setCurrentQueueIndex(prevIndex);
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      playTrack(prevTrack, queue);
    }
  };

  const seekTo = (seconds) => {
    if (currentTrack) {
      if (isYouTubeMode) {
        setProgress(seconds);
      } else {
        audioRef.current.currentTime = seconds;
        setProgress(seconds);
      }
    }
  };

  const setVolume = (value) => {
    const vol = parseFloat(value);
    setVolumeState(vol);
    if (vol > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const toggleRepeat = () => {
    setIsRepeat(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  };

  const addToQueue = (track) => {
    if (!queue.find(t => t._id === track._id)) {
      setQueue(prev => [...prev, track]);
    }
  };

  const toggleYouTubeMode = (active) => {
    setIsYouTubeMode(active);
    if (active) {
      audioRef.current.pause();
      // Set duration of YouTube video to track duration
      setDuration(currentTrack.duration || 180);
      setProgress(0);
    } else {
      // Switch back to HTML5 preview
      let sourceUrl = currentTrack.audioUrl;
      if (currentTrack.audioBlob) {
        blobUrlRef.current = URL.createObjectURL(currentTrack.audioBlob);
        sourceUrl = blobUrlRef.current;
      }
      audioRef.current.src = sourceUrl;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  };

  return (
    <AudioContext.Provider value={{
      isPlaying,
      currentTrack,
      progress,
      duration,
      volume,
      isMuted,
      isShuffle,
      isRepeat,
      queue,
      currentQueueIndex,
      isYouTubeMode,
      playTrack,
      togglePlay,
      nextTrack: () => handleNextTrack(false),
      prevTrack: handlePrevTrack,
      seekTo,
      setVolume,
      toggleMute,
      toggleShuffle,
      toggleRepeat,
      addToQueue,
      toggleYouTubeMode
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
