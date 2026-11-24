import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bookmark, Menu, X, ChevronDown, Flame, TrendingUp, Star, PlayCircle, Film, Tv, Calendar, Tag, ExternalLink } from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';

interface NavbarProps {
  onOpenSearch: () => void;
}

const PRIMARY_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Anime', path: '/anime' },
  { name: 'TV Series', path: '/anime?format=TV' },
  { name: 'Movies', path: '/movies' },
  { name: 'Schedule', path: '/schedule' },
  { name: 'Genres', path: '/genres' },
];

const DISCOVERY_LINKS = [
  { name: 'Trending', path: '/anime?sort=trending', icon: Flame, color: 'text-orange-500' },
  { name: 'Popular', path: '/anime?sort=popularity', icon: TrendingUp, color: 'text-[#F01428]' },
  { name: 'Top Rated', path: '/anime?sort=rating', icon: Star, color: 'text-amber-400' },
  { name: 'Ongoing', path: '/anime?status=RELEASING', icon: PlayCircle, color: 'text-emerald-400' },
];

const ALL_MOBILE_LINKS = [
  { name: 'Home', path: '/', icon: Film },
  { name: 'All Anime', path: '/anime', icon: Film },
  { name: 'TV Series', path: '/anime?format=TV', icon: Tv },
  { name: 'Movies', path: '/movies', icon: Film },
  { name: 'Trending', path: '/anime?sort=trending', icon: Flame },
  { name: 'Popular', path: '/anime?sort=popularity', icon: TrendingUp },
  { name: 'Top Rated', path: '/anime?sort=rating', icon: Star },
  { name: 'Ongoing', path: '/anime?status=RELEASING', icon: PlayCircle },
  { name: 'Schedule', path: '/schedule', icon: Calendar },
  { name: 'Genres', path: '/genres', icon: Tag },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const discoverRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { watchlistIds } = useWatchlist();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (discoverRef.current && !discoverRef.current.contains(e.target as Node)) {
        setIsDiscoverOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDiscoverOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#08080A]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/50 py-3'
            : 'bg-gradient-to-b from-[#08080A]/90 via-[#08080A]/40 to-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link
              to="/"
              className="flex items-center gap-2 group transition-transform duration-200 active:scale-95"
            >
              {/* Actual Logo from project */}
              <div className="relative h-8 sm:h-9 flex items-center">
                <img
                  src="/logo_cropped.png"
                  alt="DEVILMOTION"
                  className="h-full w-auto max-w-[190px] sm:max-w-[220px] object-contain drop-shadow-[0_0_15px_rgba(240,20,40,0.35)] group-hover:drop-shadow-[0_0_22px_rgba(240,20,40,0.6)] transition-all duration-300"
                />
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {PRIMARY_LINKS.map(link => {
                const isActive = location.pathname === link.path && (!link.path.includes('?') || location.search === link.path.slice(link.path.indexOf('?')));
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`relative px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-white bg-white/[0.08]'
                        : 'text-[#9E9EB2] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#F01428] rounded-full shadow-[0_0_8px_#F01428]" />
                    )}
                  </Link>
                );
              })}

              {/* Discover Dropdown */}
              <div className="relative" ref={discoverRef}>
                <button
                  onClick={() => setIsDiscoverOpen(!isDiscoverOpen)}
                  className={`flex items-center gap-1 px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    isDiscoverOpen ? 'text-white bg-white/[0.08]' : 'text-[#9E9EB2] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Discover</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDiscoverOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDiscoverOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#121218] border border-white/10 rounded-xl shadow-2xl p-1.5 space-y-0.5 z-50 backdrop-blur-xl animate-fade-in">
                    {DISCOVERY_LINKS.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          onClick={() => setIsDiscoverOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#9E9EB2] hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          <Icon className={`w-4 h-4 ${item.color}`} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Link Ad - VIP Access */}
            <a
              href="https://uplcm.com/4/12340281"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#F01428]/20 to-amber-500/15 text-amber-300 hover:text-white hover:border-amber-400 transition-all shadow-sm shadow-amber-500/15 active:scale-95"
              title="Access VIP Stream Node"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>VIP Server</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </a>

            {/* Search Trigger Button */}
            <button
              onClick={onOpenSearch}
              aria-label="Open search"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#9E9EB2] bg-white/[0.05] hover:bg-white/[0.08] hover:text-white border border-white/10 rounded-lg transition-all duration-200 cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#F01428]" />
              <span className="hidden sm:inline-block text-xs">Search anime...</span>
              <kbd className="hidden lg:inline-block text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-[#9E9EB2]">
                ⌘K
              </kbd>
            </button>

            {/* Watchlist Icon with badge */}
            <Link
              to="/watchlist"
              aria-label="Watchlist"
              className="relative p-2 text-[#9E9EB2] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors border border-transparent hover:border-white/10"
            >
              <Bookmark className="w-5 h-5" />
              {watchlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F01428] text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-[#F01428]/50 animate-pulse">
                  {watchlistIds.length}
                </span>
              )}
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 text-[#9E9EB2] hover:text-white bg-white/[0.04] rounded-lg border border-white/10 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-[#F01428]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="fixed top-16 right-0 bottom-0 w-3/4 max-w-xs bg-[#0F0F13] border-l border-white/10 p-5 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <img src="/logo_cropped.png" alt="DevilMotion" className="h-6 w-auto" />
              </div>

              {/* Mobile Links */}
              <nav className="flex flex-col space-y-1">
                {ALL_MOBILE_LINKS.map(link => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path && (!link.path.includes('?') || location.search === link.path.slice(link.path.indexOf('?')));
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-[#F01428] text-white shadow-lg shadow-[#F01428]/30'
                          : 'text-[#9E9EB2] hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-white/10 space-y-1">
                <Link
                  to="/watchlist"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-[#9E9EB2] hover:text-white hover:bg-white/[0.05]"
                >
                  <span className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-[#F01428]" /> Watchlist
                  </span>
                  {watchlistIds.length > 0 && (
                    <span className="bg-[#F01428] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      {watchlistIds.length}
                    </span>
                  )}
                </Link>

                <Link
                  to="/search"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#9E9EB2] hover:text-white hover:bg-white/[0.05]"
                >
                  <Search className="w-4 h-4 text-[#F01428]" /> Search Catalog
                </Link>

                <a
                  href="https://uplcm.com/4/12340281"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-amber-300 bg-gradient-to-r from-amber-500/15 via-[#F01428]/15 to-amber-500/15 border border-amber-500/30"
                >
                  <span className="flex items-center gap-2.5">
                    <Flame className="w-4 h-4 text-amber-400" /> VIP Realm Server
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
