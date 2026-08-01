import React, { useState } from 'react';
import { X, Upload, Music } from 'lucide-react';

const AddSongModal = ({ isOpen, onClose, onUpload }) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'link'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      alert("Title and Artist are required.");
      return;
    }

    if (uploadMode === 'file' && !audioFile) {
      alert("Please select a local audio file.");
      return;
    }

    if (uploadMode === 'link' && !audioUrl.trim()) {
      alert("Please provide a direct audio URL.");
      return;
    }

    onUpload({
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim() || 'Single',
      genre: genre.trim() || 'Custom',
      coverUrl: coverUrl.trim() || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&h=400&fit=crop',
      audioFile,
      audioUrl: uploadMode === 'link' ? audioUrl.trim() : null
    });

    // Reset Form
    setTitle('');
    setArtist('');
    setAlbum('');
    setGenre('');
    setCoverUrl('');
    setAudioFile(null);
    setAudioUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white font-outfit">
            Add Your Own Full Song
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex px-6 pt-4 gap-4">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              uploadMode === 'file'
                ? 'bg-spotify-green/10 border-spotify-green text-spotify-green shadow-md'
                : 'border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Upload Local MP3
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('link')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              uploadMode === 'link'
                ? 'bg-spotify-green/10 border-spotify-green text-spotify-green shadow-md'
                : 'border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Paste MP3 Link
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Song Title *
              </label>
              <input 
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song Title"
                className="w-full px-3 py-2 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Artist Name *
              </label>
              <input 
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Artist"
                className="w-full px-3 py-2 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Album (Optional)
              </label>
              <input 
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="Album"
                className="w-full px-3 py-2 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Genre
              </label>
              <input 
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Genre"
                className="w-full px-3 py-2 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Cover Image URL (Optional)
            </label>
            <input 
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
            />
          </div>

          {uploadMode === 'file' ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Select Audio File (.mp3) *
              </label>
              <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-4 bg-neutral-800 cursor-pointer hover:border-spotify-green transition-colors">
                <Upload size={20} className="text-gray-400 mb-1" />
                <span className="text-[10px] text-gray-300">
                  {audioFile ? audioFile.name : "Choose local MP3 file"}
                </span>
                <input 
                  type="file"
                  accept="audio/mp3, audio/mpeg"
                  onChange={(e) => setAudioFile(e.target.files[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Direct Audio MP3 URL *
              </label>
              <input 
                type="url"
                required
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/song.mp3"
                className="w-full px-3 py-2 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 bg-spotify-green text-black hover:scale-102 transition-transform rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-spotify-green/10 flex items-center gap-1.5"
            >
              <Music size={14} /> Add Song
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AddSongModal;
