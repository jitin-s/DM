import React, { useEffect, useRef } from 'react';
import { ADS_ENABLED, AD_CONFIG } from '../../../config/adsConfig';

interface AdsterraNativeBannerProps {
  className?: string;
  title?: string;
}

/**
 * Adsterra Native Banner Component
 * Renders the native banner container and dynamically loads the Adsterra script.
 * Code:
 * <script async fetchpriority="high" data-cfasync="false" src="https://bauval.org/21/16be909fc62f62037ec1196397278a57"></script>
 * <div id="container-16be909fc62f62037ec1196397278a57"></div>
 */
export const AdsterraNativeBanner: React.FC<AdsterraNativeBannerProps> = ({
  className = '',
  title = 'Sponsored Recommendations',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ADS_ENABLED || !AD_CONFIG.adsterra?.enabled) return;

    const { script: scriptSrc, containerId } = AD_CONFIG.adsterra.nativeBanner;

    // Check if container exists in DOM
    const targetContainer = document.getElementById(containerId);
    if (!targetContainer) return;

    // Remove any previously appended script tag to allow clean re-execution on page navigation
    const oldScript = document.getElementById(`adsterra-native-script-${containerId}`);
    if (oldScript) {
      oldScript.remove();
    }

    const script = document.createElement('script');
    script.id = `adsterra-native-script-${containerId}`;
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute('fetchpriority', 'high');
    script.setAttribute('data-cfasync', 'false');

    // Append script to container parent or document body
    if (containerRef.current) {
      containerRef.current.appendChild(script);
    } else {
      document.body.appendChild(script);
    }

    return () => {
      const scriptToRemove = document.getElementById(`adsterra-native-script-${containerId}`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  if (!ADS_ENABLED || !AD_CONFIG.adsterra?.enabled) return null;

  const { containerId } = AD_CONFIG.adsterra.nativeBanner;

  return (
    <div
      ref={containerRef}
      className={`w-full my-6 p-4 rounded-2xl bg-[#121218]/80 border border-white/[0.08] shadow-xl overflow-hidden group transition-all duration-300 hover:border-white/15 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F01428] animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-heading">
            {title}
          </span>
        </div>
        <span className="text-[10px] text-[#9E9EB2] bg-white/5 px-2 py-0.5 rounded font-mono">
          Adsterra Native
        </span>
      </div>

      <div className="min-h-[140px] flex items-center justify-center w-full overflow-hidden">
        {/* Adsterra Native Banner Target Container */}
        <div id={containerId} className="w-full" />
      </div>
    </div>
  );
};

export default AdsterraNativeBanner;
