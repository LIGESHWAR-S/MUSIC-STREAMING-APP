import React, { useState } from 'react';
import { Play, Pause, Heart, MessageSquare, Plus, Check } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

const TrackCard = ({ track, allTracks, playlists, onAddToPlaylist, onCommentClick, likedList, onLikeToggle }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);

  const isCurrent = currentTrack && currentTrack._id === track._id;
  const isLiked = likedList.includes(track._id);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, allTracks);
    }
  };

  const handlePlaylistSelect = (e, playlistId) => {
    e.stopPropagation();
    onAddToPlaylist(playlistId, track);
    setShowPlaylistDropdown(false);
  };

  return (
    <div 
      className="glassmorphism-card p-4 rounded-2xl flex flex-col relative group cursor-pointer select-none"
      onClick={handlePlayClick}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 shadow-md bg-neutral-900">
        <img 
          src={track.coverUrl} 
          alt={track.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
          }}
        />
        {/* Play/Pause Hover Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button 
            onClick={handlePlayClick}
            className="w-12 h-12 bg-spotify-green text-black rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all duration-300 hover:scale-105 shadow-lg shadow-spotify-green/20 cursor-pointer"
          >
            {isCurrent && isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Track Metadata */}
      <div className="flex-1 min-h-[52px]">
        <h4 className={`text-sm font-semibold truncate ${isCurrent ? 'text-spotify-green' : 'text-white'}`}>
          {track.title}
        </h4>
        <p className="text-xs text-gray-400 truncate hover:text-white mt-1">
          {track.artist}
        </p>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle(track);
            }}
            className={`p-1 rounded-full transition-colors cursor-pointer hover:bg-white/5 ${
              isLiked ? 'text-spotify-green' : 'text-gray-400 hover:text-white'
            }`}
            title="Like"
          >
            <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick(track);
            }}
            className="p-1 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer hover:bg-white/5"
            title="Comments"
          >
            <MessageSquare size={15} />
          </button>
        </div>

        {/* Playlist Adder dropdown */}
        {playlists && playlists.length > 0 && (
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistDropdown(!showPlaylistDropdown);
              }}
              className="p-1 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-white/5 cursor-pointer"
              title="Add to Playlist"
            >
              <Plus size={16} />
            </button>

            {showPlaylistDropdown && (
              <div className="absolute bottom-8 right-0 bg-neutral-900 border border-white/10 rounded-xl p-1.5 w-48 shadow-xl shadow-black/50 z-30 flex flex-col gap-0.5">
                <p className="text-[10px] text-gray-500 font-semibold px-2 py-1 uppercase tracking-wider">
                  Add to Playlist
                </p>
                {playlists.map((pl) => {
                  const hasTrack = pl.tracks && pl.tracks.some(t => (t._id || t) === track._id);
                  return (
                    <button
                      key={pl._id}
                      onClick={(e) => handlePlaylistSelect(e, pl._id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center justify-between cursor-pointer"
                      disabled={hasTrack}
                    >
                      <span className="truncate">{pl.name}</span>
                      {hasTrack && <Check size={12} className="text-spotify-green shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackCard;
