import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AudioContext = createContext(null);

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

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isYouTubeMode, queue, currentQueueIndex, isRepeat, isShuffle]);

  // Play a specific track
  const playTrack = (track, currentQueue = []) => {
    // Revoke previous blob URL if any
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Automatically enable YouTube mode for external search tracks (Disabled - user opted to keep preview playback)
    const useYT = false;
    setIsYouTubeMode(useYT);
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);

    // Setup Queue
    if (currentQueue.length > 0) {
      setQueue(currentQueue);
      const index = currentQueue.findIndex(t => t._id === track._id);
      setCurrentQueueIndex(index !== -1 ? index : 0);
    } else {
      setQueue([track]);
      setCurrentQueueIndex(0);
    }

    if (useYT) {
      // Clear HTML5 audio to prevent playing previews
      audioRef.current.pause();
      audioRef.current.src = "";
      setDuration(track.duration || 180);
    } else {
      // Play via HTML5 Audio
      let sourceUrl = track.audioUrl;
      if (track.audioBlob) {
        blobUrlRef.current = URL.createObjectURL(track.audioBlob);
        sourceUrl = blobUrlRef.current;
      }
      
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
    setRepeatState(prev => {
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
