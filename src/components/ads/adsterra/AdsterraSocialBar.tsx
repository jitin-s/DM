import React, { useEffect } from 'react';
import { ADS_ENABLED, AD_CONFIG } from '../../../config/adsConfig';

/**
 * Adsterra Social Bar Component
 * Ensures the Social Bar script is present in the document.
 * Code:
 * <script data-cfasync="false" src="https://bauval.org/14/08f428f8ca2952fb932467bef2db4a47"></script>
 */
export const AdsterraSocialBar: React.FC = () => {
  useEffect(() => {
    if (!ADS_ENABLED || !AD_CONFIG.adsterra?.enabled) return;

    const scriptSrc = AD_CONFIG.adsterra.socialBarScript;
    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.setAttribute('data-cfasync', 'false');
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return null;
};

export default AdsterraSocialBar;
