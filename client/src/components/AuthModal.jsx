import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, backendUrl, isMandatory = false }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Save user details
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onAuthSuccess(data.token, data.user);
      setUsername('');
      setPassword('');
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300`}>
      {/* Modal Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl glassmorphism border border-white/10 shadow-2xl p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-300">
        
        {/* Close Button (Hidden if login is mandatory to access app) */}
        {!isMandatory && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        )}

        {/* Brand Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <div className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center text-black font-black text-2xl shadow-xl shadow-spotify-green/25 animate-pulse">
              ♬
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-outfit">
            {isLogin ? 'Sign In to BeatStream' : 'Join BeatStream'}
          </h2>
          <p className="text-sm text-gray-400">
            {isLogin 
              ? 'Log in to access your dashboard, stream music & downloads' 
              : 'Create a free account to unlock high quality music streaming'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-xs text-red-300 font-semibold animate-in shake duration-300 text-center">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Username</label>
            <div className="relative flex items-center">
              <User size={18} className="absolute left-4 text-gray-500" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 hover:border-white/20 focus:border-spotify-green focus:ring-1 focus:ring-spotify-green rounded-2xl text-sm text-white placeholder-gray-500 outline-none transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 hover:border-white/20 focus:border-spotify-green focus:ring-1 focus:ring-spotify-green rounded-2xl text-sm text-white placeholder-gray-500 outline-none transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-spotify-green hover:bg-spotify-green-hover text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-spotify-green/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
            )}
          </button>
        </form>

        {/* Toggle Switch */}
        <div className="text-center text-sm text-gray-400">
          <span>{isLogin ? "Don't have an account? " : 'Already have an account? '}</span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-spotify-green hover:underline font-bold transition-all cursor-pointer"
            disabled={isLoading}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>

      </div>
    </div>
  );
}
