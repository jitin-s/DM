import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';

export const HilltopAdBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptInjectedRef = useRef(false);

  useEffect(() => {
    if (isDismissed) return;

    // Load HilltopAds script into container
    if (!scriptInjectedRef.current && containerRef.current) {
      scriptInjectedRef.current = true;
      try {
        const s = document.createElement('script');
        s.src = "//untimely-hello.com/bbXiV.sod/GPlP0GY/W/cv/Aesm/9DuRZeUrlzkLPFTJcp2/NBTyU/3tMADdUotWNszjYM1HNoTecrwaOdQa";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        containerRef.current.appendChild(s);
      } catch (err) {
        console.warn('HilltopAds initialization notice:', err);
      }
    }

    // Universal Watchdog: Monitor DOM for any HilltopAds banner element and ensure it has an explicit working Cut/Close button
    const observer = new MutationObserver(() => {
      // Find any iframe or container created by untimely-hello or phoroglopsu
      const adElements = document.querySelectorAll(
        'iframe[src*="untimely-hello"], iframe[src*="phoroglopsu"], div[class*="bannerAd"], div[class*="wrap"]'
      );

      adElements.forEach(el => {
        const parent = (el.closest('div') || el.parentElement) as HTMLElement | null;
        if (!parent) return;

        // Ensure it doesn't cover top navbar (must stay below z-40 navbar and modals)
        if (window.getComputedStyle(parent).position === 'fixed' || window.getComputedStyle(parent).position === 'absolute') {
          parent.style.zIndex = '35';
        }

        // Check if an explicit close button is already attached
        if (!parent.querySelector('.devilmotion-ad-close-btn')) {
          const closeBtn = document.createElement('button');
          closeBtn.className = 'devilmotion-ad-close-btn';
          closeBtn.innerHTML = '✕ Close Ad';
          closeBtn.setAttribute('aria-label', 'Close advertisement');
          closeBtn.style.cssText = `
            position: absolute;
            top: -26px;
            right: 8px;
            background: #F01428;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 10px;
            border-radius: 6px 6px 0 0;
            border: 1px solid rgba(255,255,255,0.2);
            border-bottom: none;
            cursor: pointer;
            z-index: 999999;
            box-shadow: 0 -2px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: sans-serif;
          `;

          closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            parent.style.display = 'none';
            parent.remove();
            setIsDismissed(true);
          };

          parent.style.position = parent.style.position || 'relative';
          parent.appendChild(closeBtn);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [isDismissed]);

  const handleManualClose = () => {
    setIsDismissed(true);
    // Remove all ad nodes from body if any exist
    const adNodes = document.querySelectorAll('iframe[src*="untimely-hello"], iframe[src*="phoroglopsu"], .devilmotion-ad-close-btn');
    adNodes.forEach(node => {
      const container = node.closest('div');
      if (container && container !== document.body) {
        container.style.display = 'none';
        container.remove();
      } else {
        (node as HTMLElement).style.display = 'none';
        node.remove();
      }
    });
  };

  if (isDismissed) return null;

  return (
    <div
      id="devilmotion-hilltop-bottom-ad"
      className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center justify-center pointer-events-none select-none"
    >
      <div className="relative pointer-events-auto bg-[#08080A]/95 border-t border-white/10 shadow-2xl backdrop-blur-md max-w-3xl w-full px-2 pt-2 pb-1 flex flex-col items-center rounded-t-xl transition-all">
        {/* Prominent Red Cut / Close Button */}
        <button
          onClick={handleManualClose}
          className="absolute -top-7 right-4 bg-[#F01428] hover:bg-[#D01020] text-white text-[11px] font-extrabold px-3 py-1 rounded-t-lg flex items-center gap-1.5 shadow-lg border-t border-x border-white/20 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Close / Cut Advertisement"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Cut Ad</span>
        </button>

        {/* Ad Content Mount */}
        <div
          ref={containerRef}
          className="w-full flex items-center justify-center min-h-[50px] overflow-hidden"
        />

        {/* Subtle Sponsor Label */}
        <span className="text-[9px] text-[#646478] tracking-widest uppercase mt-0.5 font-mono">
          Advertisement • DevilMotion Partner
        </span>
      </div>
    </div>
  );
};
