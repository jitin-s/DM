import React, { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { AnimeCard } from '../components/cards/AnimeCard';
import { EmptyState } from '../components/ui/EmptyState';

export const WatchlistPage: React.FC = () => {
  const { watchlistItems, removeFromWatchlist, historyItems, removeFromHistory, clearHistory } = useWatchlist();
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history'>('watchlist');

  return (
    <div className="pt-24 sm:pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F01428] mb-1 font-display">
              <Bookmark className="w-3.5 h-3.5" /> Saved Anime
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-heading">
              My Watchlist
            </h1>
            <p className="text-sm text-[#9E9EB2] mt-1">
              Keep track of anime you want to watch and resume your streaming playback history.
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex bg-[#121218] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'watchlist'
                  ? 'bg-[#F01428] text-white shadow-md shadow-[#F01428]/30'
                  : 'text-[#9E9EB2] hover:text-white'
              }`}
            >
              Watchlist ({watchlistItems.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#F01428] text-white shadow-md shadow-[#F01428]/30'
                  : 'text-[#9E9EB2] hover:text-white'
              }`}
            >
              Watch History ({historyItems.length})
            </button>
          </div>
        </div>

        {/* Tab Content: Watchlist */}
        {activeTab === 'watchlist' && (
          <div>
            {watchlistItems.length === 0 ? (
              <EmptyState
                icon="heart"
                title="Your Watchlist is Empty"
                description="Save your favorite anime series and movies here so you can easily find them later."
                actionText="Discover Anime to Add"
                actionLink="/anime"
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
                {watchlistItems.map(anime => (
                  <div key={anime.id} className="relative group">
                    <AnimeCard anime={anime} />
                    <button
                      onClick={() => removeFromWatchlist(anime.id)}
                      title="Remove from Watchlist"
                      className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/80 hover:bg-[#F01428] text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Watch History */}
        {activeTab === 'history' && (
          <div>
            {historyItems.length === 0 ? (
              <EmptyState
                icon="film"
                title="No Watch History Yet"
                description="When you start streaming episodes on DevilMotion, your progress will automatically be recorded here."
                actionText="Start Watching"
                actionLink="/"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 hover:bg-[#F01428] text-xs text-red-200 hover:text-white transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All History</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
                  {historyItems.map(anime => (
                    <div key={anime.id} className="relative group">
                      <AnimeCard anime={anime} />
                      <button
                        onClick={() => removeFromHistory(anime.id)}
                        title="Remove from History"
                        className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/80 hover:bg-[#F01428] text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
