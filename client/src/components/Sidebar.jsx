import React from 'react';
import { Home, Search, Music, Heart, Download, Plus, LogOut, User as UserIcon } from 'lucide-react';

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  playlists, 
  onCreatePlaylistClick, 
  onAddSongClick,
  user,
  onLoginClick,
  onLogoutClick
}) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'liked', label: 'Liked Songs', icon: Heart },
    { id: 'downloads', label: 'Downloads', icon: Download },
  ];

  return (
    <aside className="w-64 glassmorphism border-r border-white/5 h-screen flex flex-col fixed left-0 top-0 text-gray-300 z-10 select-none">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 bg-spotify-green rounded-full flex items-center justify-center text-black font-extrabold text-lg shadow-lg shadow-spotify-green/20">
          ♬
        </div>
        <span className="font-bold text-xl tracking-tight text-white font-outfit">
          BeatStream
        </span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-spotify-green text-black font-semibold shadow-lg shadow-spotify-green/10'
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}

        {/* Upload Custom Song Button */}
        <button
          onClick={onAddSongClick}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-dashed border-white/10 hover:border-spotify-green hover:text-spotify-green transition-all duration-300 text-gray-400 mt-4 cursor-pointer"
        >
          <Plus size={16} />
          Add Custom Song
        </button>

        {/* Playlists Header */}
        <div className="pt-8 pb-3 px-4 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
            Playlists
          </span>
          <button
            onClick={onCreatePlaylistClick}
            className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Create Playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Playlist List */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
          {playlists.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-500 italic">
              No playlists created yet.
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist._id}
                onClick={() => setActiveTab(`playlist_${playlist._id}`)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-left truncate transition-colors cursor-pointer ${
                  activeTab === `playlist_${playlist._id}`
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Music size={14} className="shrink-0" />
                <span className="truncate">{playlist.name}</span>
              </button>
            ))
          )}
        </div>
      </nav>

      {/* User Section Footer */}
      <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-2">
        {user ? (
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-spotify-green/10 flex items-center justify-center text-spotify-green shrink-0">
                <UserIcon size={16} />
              </div>
              <span className="text-sm font-semibold text-white truncate max-w-[120px]" title={user.username}>
                {user.username}
              </span>
            </div>
            <button
              onClick={onLogoutClick}
              className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <UserIcon size={14} />
            <span>Log In / Sign Up</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
