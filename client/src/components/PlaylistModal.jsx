import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const PlaylistModal = ({ isOpen, onClose, onSubmit, playlistToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    if (playlistToEdit) {
      setName(playlistToEdit.name || '');
      setDescription(playlistToEdit.description || '');
      setCoverUrl(playlistToEdit.coverUrl || '');
    } else {
      setName('');
      setDescription('');
      setCoverUrl('');
    }
  }, [playlistToEdit, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim()
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white font-outfit">
            {playlistToEdit ? "Edit Playlist Details" : "Create New Playlist"}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Playlist Name *
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Playlist"
              className="w-full px-4 py-3 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-spotify-green transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add an optional description"
              rows="3"
              className="w-full px-4 py-3 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white resize-none focus:outline-none focus:border-spotify-green transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Cover Image URL (Optional)
            </label>
            <input 
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... (must be direct URL)"
              className="w-full px-4 py-3 bg-neutral-800 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-spotify-green transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-spotify-green text-black hover:scale-102 transition-transform rounded-xl text-sm font-semibold cursor-pointer shadow-lg shadow-spotify-green/10"
            >
              {playlistToEdit ? "Save Changes" : "Create Playlist"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PlaylistModal;
