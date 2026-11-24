import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationLoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  loadingSubMessage: string;
  triggerLoading: (message?: string, subMessage?: string) => void;
  dismissLoading: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isLoading: false,
  loadingMessage: '',
  loadingSubMessage: '',
  triggerLoading: () => {},
  dismissLoading: () => {},
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

export const NavigationLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Opening Demon Realm Portal...');
  const [loadingSubMessage, setLoadingSubMessage] = useState('Channeling DevilMotion high-speed streaming node...');
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const dismissLoading = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const triggerLoading = useCallback((message?: string, subMessage?: string) => {
    if (message) setLoadingMessage(message);
    else setLoadingMessage('Opening Demon Realm Portal...');

    if (subMessage) setLoadingSubMessage(subMessage);
    else setLoadingSubMessage('Channeling DevilMotion high-speed streaming node...');

    setIsLoading(true);

    // Watchdog: auto dismiss after 4.5s in case of slow or blocked requests
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    watchdogTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 4500);
  }, []);

  // When location changes, allow page components to dismiss when they finish, or after 800ms
  useEffect(() => {
    const timer = setTimeout(() => {
      dismissLoading();
    }, 900);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search, dismissLoading]);

  return (
    <NavigationLoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        loadingSubMessage,
        triggerLoading,
        dismissLoading,
      }}
    >
      {children}
    </NavigationLoadingContext.Provider>
  );
};
