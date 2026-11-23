import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { Layout } from './components/layout/Layout';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { EmptyState } from './components/ui/EmptyState';
import { Loader2 } from 'lucide-react';

// Route-based Lazy Loading for Maximum Initial Page Load Speed
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const AnimeCatalogPage = lazy(() => import('./pages/AnimeCatalogPage').then(m => ({ default: m.AnimeCatalogPage })));
const AnimeDetailsPage = lazy(() => import('./pages/AnimeDetailsPage').then(m => ({ default: m.AnimeDetailsPage })));
const WatchPage = lazy(() => import('./pages/WatchPage').then(m => ({ default: m.WatchPage })));
const MoviesPage = lazy(() => import('./pages/MoviesPage').then(m => ({ default: m.MoviesPage })));
const GenresPage = lazy(() => import('./pages/GenresPage').then(m => ({ default: m.GenresPage })));
const SchedulePage = lazy(() => import('./pages/SchedulePage').then(m => ({ default: m.SchedulePage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then(m => ({ default: m.WatchlistPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="pt-40 pb-32 flex flex-col items-center justify-center text-center">
    <Loader2 className="w-9 h-9 text-[#F01428] animate-spin mb-3" />
    <span className="text-xs text-[#9E9EB2] font-semibold tracking-wide">Loading DevilMotion...</span>
  </div>
);

const NotFoundPage: React.FC = () => (
  <div className="pt-32 pb-20">
    <EmptyState
      icon="alert"
      title="404 — Page Lost in the Abyss"
      description="The page you are looking for does not exist or may have been banished to another dimension."
      actionText="Return to Home"
      actionLink="/"
    />
  </div>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WatchlistProvider>
          <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route
                index
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <HomePage />
                  </Suspense>
                }
              />
              <Route
                path="anime"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <AnimeCatalogPage />
                  </Suspense>
                }
              />
              <Route
                path="anime/:id"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <AnimeDetailsPage />
                  </Suspense>
                }
              />
              <Route
                path="watch/:id"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <WatchPage />
                  </Suspense>
                }
              />
              <Route
                path="movies"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <MoviesPage />
                  </Suspense>
                }
              />
              <Route
                path="genres"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <GenresPage />
                  </Suspense>
                }
              />
              <Route
                path="schedule"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <SchedulePage />
                  </Suspense>
                }
              />
              <Route
                path="search"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <SearchPage />
                  </Suspense>
                }
              />
              <Route
                path="watchlist"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <WatchlistPage />
                  </Suspense>
                }
              />
              <Route
                path="history"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <WatchlistPage />
                  </Suspense>
                }
              />
              <Route
                path="login"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <LoginPage />
                  </Suspense>
                }
              />
              <Route
                path="register"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <RegisterPage />
                  </Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="admin"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <AdminPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WatchlistProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
};

export default App;
