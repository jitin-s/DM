import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bookmark, Menu, X } from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';

interface NavbarProps {
  onOpenSearch: () => void;
}

const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Anime', path: '/anime' },
  { name: 'Movies', path: '/movies' },
  { name: 'Genres', path: '/genres' },
  { name: 'Schedule', path: '/schedule' },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { watchlistIds } = useWatchlist();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
          <div className="flex items-center gap-8">
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
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {NAV_LINKS.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`relative px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
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
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
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
          <div className="fixed top-16 right-0 bottom-0 w-3/4 max-w-xs bg-[#0F0F13] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <img src="/logo_cropped.png" alt="DevilMotion" className="h-6 w-auto" />
              </div>

              {/* Mobile Links */}
              <nav className="flex flex-col space-y-2">
                {NAV_LINKS.map(link => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`px-3 py-2.5 rounded-xl text-base font-semibold transition-all ${
                        isActive
                          ? 'bg-[#F01428] text-white shadow-lg shadow-[#F01428]/30'
                          : 'text-[#9E9EB2] hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link
                  to="/watchlist"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#9E9EB2] hover:text-white hover:bg-white/[0.05]"
                >
                  <span className="flex items-center gap-2">
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
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#9E9EB2] hover:text-white hover:bg-white/[0.05]"
                >
                  <Search className="w-4 h-4 text-[#F01428]" /> Search Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
