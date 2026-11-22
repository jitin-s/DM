import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Shield, Tv, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#050507] border-t border-white/[0.08] pt-16 pb-12 mt-20 relative overflow-hidden">
      {/* Decorative top red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#F01428]/50 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-24 bg-[#F01428]/10 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/[0.08]">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img
                src="/logo_cropped.png"
                alt="DevilMotion"
                className="h-8 w-auto drop-shadow-[0_0_15px_rgba(240,20,40,0.4)]"
              />
            </Link>
            <p className="text-sm text-[#9E9EB2] leading-relaxed max-w-sm">
              DevilMotion is a premier next-generation anime entertainment platform engineered for ultra-high-definition streaming, weekly schedule tracking, and community discovery.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#discord"
                aria-label="Discord"
                className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-[#F01428] text-[#9E9EB2] hover:text-white flex items-center justify-center transition-all duration-200 border border-white/5"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="#twitter"
                aria-label="X / Twitter"
                className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-[#F01428] text-[#9E9EB2] hover:text-white flex items-center justify-center transition-all duration-200 border border-white/5"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#reddit"
                aria-label="Reddit"
                className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-[#F01428] text-[#9E9EB2] hover:text-white flex items-center justify-center transition-all duration-200 border border-white/5"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href="#github"
                aria-label="GitHub"
                className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-[#F01428] text-[#9E9EB2] hover:text-white flex items-center justify-center transition-all duration-200 border border-white/5"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 font-heading flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-[#F01428]" /> Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9E9EB2]">
              <li>
                <Link to="/anime" className="hover:text-white transition-colors">
                  Anime Catalog
                </Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-white transition-colors">
                  Anime Movies
                </Link>
              </li>
              <li>
                <Link to="/genres" className="hover:text-white transition-colors">
                  Browse Genres
                </Link>
              </li>
              <li>
                <Link to="/schedule" className="hover:text-white transition-colors">
                  Release Schedule
                </Link>
              </li>
              <li>
                <Link to="/watchlist" className="hover:text-white transition-colors">
                  My Watchlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Top Genres */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 font-heading flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#F01428]" /> Popular Genres
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9E9EB2]">
              <li>
                <Link to="/genres?genre=Action" className="hover:text-white transition-colors">
                  Action & Supernatural
                </Link>
              </li>
              <li>
                <Link to="/genres?genre=Fantasy" className="hover:text-white transition-colors">
                  Isekai & Fantasy
                </Link>
              </li>
              <li>
                <Link to="/genres?genre=Sci-Fi" className="hover:text-white transition-colors">
                  Cyberpunk & Sci-Fi
                </Link>
              </li>
              <li>
                <Link to="/genres?genre=Romance" className="hover:text-white transition-colors">
                  Romance & Drama
                </Link>
              </li>
              <li>
                <Link to="/genres?genre=Sports" className="hover:text-white transition-colors">
                  Shonen & Sports
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Policy */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4 font-heading flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#F01428]" /> Trust & Legal
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9E9EB2]">
              <li>
                <span className="text-[#646478] cursor-default hover:text-white transition-colors">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="text-[#646478] cursor-default hover:text-white transition-colors">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-[#646478] cursor-default hover:text-white transition-colors">
                  DMCA Notice
                </span>
              </li>
              <li>
                <span className="text-[#646478] cursor-default hover:text-white transition-colors">
                  Contact Support
                </span>
              </li>
              <li>
                <span className="text-[#646478] cursor-default hover:text-white transition-colors">
                  API & Documentation
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#646478]">
          <p>© 2026 DevilMotion Entertainment. All rights reserved.</p>
          <p className="text-center md:text-right max-w-xl text-[11px] text-[#555566]">
            Disclaimer: DevilMotion does not host any media files on its servers. All video contents are linked through authorized third-party non-affiliated providers.
          </p>
        </div>
      </div>
    </footer>
  );
};

