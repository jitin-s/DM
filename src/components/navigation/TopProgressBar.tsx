import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const TopProgressBar: React.FC = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // When route changes, trigger instant progress bar
    setIsVisible(true);
    setProgress(25);

    const timer1 = setTimeout(() => {
      setProgress(65);
    }, 80);

    const timer2 = setTimeout(() => {
      setProgress(90);
    }, 180);

    const timer3 = setTimeout(() => {
      setProgress(100);
    }, 280);

    const timer4 = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 420);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [location.pathname, location.search]);

  if (!isVisible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-[#F01428] via-[#FF3B4E] to-[#FF8C00] shadow-[0_0_12px_rgba(240,20,40,0.8)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
};
