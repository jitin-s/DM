import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../navigation/Navbar';
import { Footer } from '../footer/Footer';
import { SearchModal } from '../search/SearchModal';
import { TopProgressBar } from '../navigation/TopProgressBar';
import { DemonPageLoader } from '../common/DemonPageLoader';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';

export const Layout: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const { isLoading: isNavLoading, loadingMessage, loadingSubMessage } = useNavigationLoading();

  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const currentPathRef = useRef<string>(location.pathname + location.search);
  const isFirstRender = useRef(true);

  // Trigger atmospheric demon realm loading page on route navigation
  useEffect(() => {
    const fullPath = location.pathname + location.search;

    // Skip the transition on the very first mount of the website
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (currentPathRef.current !== fullPath) {
      currentPathRef.current = fullPath;
      setIsPageTransitioning(true);

      const timer = setTimeout(() => {
        setIsPageTransitioning(false);
      }, 400); // 400ms smooth portal transition

      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen flex flex-col bg-[#08080A] text-[#F4F4F7]">
      <TopProgressBar />
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Atmospheric Demon Realm Loading Page on Navigation or Click */}
      {(isPageTransitioning || isNavLoading) && (
        <DemonPageLoader
          fullScreen={true}
          message={isNavLoading ? loadingMessage : undefined}
          subMessage={isNavLoading ? loadingSubMessage : undefined}
          destination={location.pathname + location.search}
        />
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
