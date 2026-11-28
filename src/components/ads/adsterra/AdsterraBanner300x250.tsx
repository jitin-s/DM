import React from 'react';
import { ADS_ENABLED, AD_CONFIG } from '../../../config/adsConfig';

interface AdsterraBanner300x250Props {
  className?: string;
  label?: string;
}

/**
 * Adsterra 300x250 Medium Rectangle Banner.
 * Encapsulated in an isolated srcDoc iframe to ensure document.write()
 * runs safely within the frame without affecting the React Single Page App DOM.
 */
export const AdsterraBanner300x250: React.FC<AdsterraBanner300x250Props> = ({
  className = '',
  label = 'Sponsored Portal',
}) => {
  if (!ADS_ENABLED || !AD_CONFIG.adsterra?.enabled) return null;

  const { key, script, width, height } = AD_CONFIG.adsterra.banner300x250;

  const iframeContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
    }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '${key}',
      'format' : 'iframe',
      'height' : ${height},
      'width' : ${width},
      'params' : {}
    };
  </script>
  <script type="text/javascript" data-cfasync="false" src="${script}"></script>
</body>
</html>`;

  return (
    <div
      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121218]/90 border border-white/[0.08] shadow-lg shadow-black/40 overflow-hidden group transition-all duration-300 hover:border-white/20 ${className}`}
    >
      <div className="flex items-center justify-between w-[300px] pb-2 px-1 text-[10px] text-[#8E8EA8] uppercase tracking-wider font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F01428] animate-pulse" />
          {label}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#9E9EB2] font-mono">
          Adsterra 300x250
        </span>
      </div>
      <div className="w-[300px] h-[250px] relative bg-black/40 rounded-xl overflow-hidden flex items-center justify-center border border-white/5">
        <iframe
          title="DevilMotion Sponsored Banner"
          srcDoc={iframeContent}
          width={width}
          height={height}
          frameBorder="0"
          scrolling="no"
          className="border-0 overflow-hidden w-[300px] h-[250px]"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        />
      </div>
    </div>
  );
};

export default AdsterraBanner300x250;
