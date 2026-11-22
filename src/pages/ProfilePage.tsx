import React, { useState, useEffect } from 'react';
import { User, ShieldAlert, Bookmark, Clock, Film, LogOut, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { AnimeCard } from '../components/cards/AnimeCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { watchlistItems, historyIds } = useWatchlist();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'watchlist' | 'settings'>('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-[#121218] border border-white/[0.08] p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F01428]/10 blur-[100px] pointer-events-none rounded-full" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-[#F01428] via-[#8B0018] to-black p-1 shadow-xl shadow-[#F01428]/30">
              <div className="w-full h-full rounded-[14px] bg-[#15151C] flex items-center justify-center overflow-hidden">
                <User className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {user.name}
                </h1>
                <Badge variant={isAdmin ? 'red' : 'green'} size="sm">
                  {isAdmin ? 'ADMINISTRATOR' : 'MEMBER'}
                </Badge>
              </div>
              <p className="text-xs text-[#9E9EB2]">{user.email}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-[#9E9EB2] bg-white/5 px-3 py-1 rounded-lg">
                  <Bookmark className="w-3.5 h-3.5 text-[#F01428]" />
                  <span><strong>{watchlistItems.length}</strong> Watchlist Titles</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#9E9EB2] bg-white/5 px-3 py-1 rounded-lg">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span><strong>{historyIds.length}</strong> Watched History</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="primary" size="sm" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={<LogOut className="w-3.5 h-3.5" />}
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Saved Watchlist */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-[#F01428] rounded-full" />
              <h2 className="text-xl font-bold text-white font-heading">
                My Cloud Watchlist ({watchlistItems.length})
              </h2>
            </div>
            <Link to="/watchlist" className="text-xs text-[#F01428] hover:underline font-semibold flex items-center gap-1">
              View full list <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {watchlistItems.length === 0 ? (
            <p className="text-sm text-[#646478]">No anime in your watchlist yet. Browse trending titles to add some!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {watchlistItems.slice(0, 6).map(anime => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
