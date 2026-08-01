import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

const CommentSection = ({ isOpen, onClose, target, targetType = 'track', backendUrl }) => {
  const [comments, setComments] = useState([]);
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      fetchComments();
    }
  }, [isOpen, target]);

  const fetchComments = async () => {
    if (!target) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/comments/${targetType}s/${target._id}`);
      const data = await response.json();
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      // Fallback: Read comments from localStorage
      const localComments = JSON.parse(localStorage.getItem(`comments_${targetType}_${target._id}`) || '[]');
      setComments(localComments);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !target) return;

    let targetId = target._id;
    if (target.isExternal) {
      try {
        const regRes = await fetch(`${backendUrl}/api/tracks/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track: target })
        });
        const registered = await regRes.json();
        targetId = registered._id;
        target._id = registered._id;
        target.isExternal = false;
      } catch (err) {
        console.error("Failed to register external track for comment:", err);
        return;
      }
    }

    const newCommentPayload = {
      userName: userName.trim() || 'Anonymous Listener',
      content: content.trim()
    };

    try {
      const response = await fetch(`${backendUrl}/api/comments/${targetType}s/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommentPayload)
      });
      
      if (response.ok) {
        const savedComment = await response.json();
        setComments(prev => [savedComment, ...prev]);
        setContent('');
      } else {
        throw new Error("API post failed");
      }
    } catch (error) {
      console.warn("API comment post failed, writing to local storage fallback:", error);
      // Fallback
      const fallbackComment = {
        _id: 'comment_local_' + Math.random().toString(36).substr(2, 9),
        userName: newCommentPayload.userName,
        content: newCommentPayload.content,
        createdAt: new Date().toISOString()
      };
      const updatedComments = [fallbackComment, ...comments];
      setComments(updatedComments);
      localStorage.setItem(`comments_${targetType}_${targetId}`, JSON.stringify(updatedComments));
      setContent('');
    }
  };

  // Format date nicely
  const formatDate = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Just now';
    }
  };

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 glassmorphism border-l border-white/5 z-40 flex flex-col text-white shadow-2xl animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MessageSquare size={18} className="text-spotify-green" />
          <h3 className="font-bold text-base font-outfit">
            Comments
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Target Details summary */}
      <div className="px-6 py-4 bg-white/3 flex items-center gap-3 border-b border-white/5 shrink-0">
        <img 
          src={target.coverUrl} 
          alt={target.title || target.name} 
          className="w-10 h-10 rounded object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&h=400&fit=crop';
          }}
        />
        <div className="overflow-hidden">
          <p className="text-xs font-semibold truncate">
            {target.title || target.name}
          </p>
          <p className="text-[10px] text-gray-400 truncate">
            {target.artist || target.description || 'Playlist'}
          </p>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-500">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageSquare size={32} className="text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">No comments yet</p>
            <p className="text-[10px] text-gray-500 mt-1">Be the first to share your thoughts on this track!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="bg-white/3 border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-spotify-green truncate max-w-[150px]">
                  {comment.userName}
                </span>
                <span className="text-[9px] text-gray-500 font-mono">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed break-words">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Form Submission */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-white/5 bg-neutral-900/50 flex flex-col gap-3 shrink-0">
        <input 
          type="text"
          placeholder="Your Name (optional)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          maxLength={30}
          className="w-full px-4 py-2.5 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
        />
        <div className="relative">
          <input 
            type="text"
            required
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={200}
            className="w-full pl-4 pr-12 py-3 bg-neutral-800 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-spotify-green transition-colors"
          />
          <button 
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-spotify-green text-black rounded-lg hover:scale-105 transition-transform cursor-pointer"
          >
            <Send size={14} fill="currentColor" />
          </button>
        </div>
      </form>

    </div>
  );
};

export default CommentSection;
