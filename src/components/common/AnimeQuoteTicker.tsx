import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, RefreshCw } from 'lucide-react';

interface AnimeQuote {
  quote: string;
  kanji: string;
  character: string;
  anime: string;
}

const REALM_QUOTES: AnimeQuote[] = [
  {
    quote: "Throughout Heaven and Earth, I alone am the honored one.",
    kanji: "天上天下唯我独尊",
    character: "Satoru Gojo",
    anime: "Jujutsu Kaisen",
  },
  {
    quote: "Set your heart ablaze. Overcome your limits.",
    kanji: "心を燃やせ。限界を超えろ",
    character: "Kyojuro Rengoku",
    anime: "Demon Slayer: Kimetsu no Yaiba",
  },
  {
    quote: "Arise. The shadow monarch answers to no mortal.",
    kanji: "起きろ。影の君主は誰にも屈しない",
    character: "Sung Jin-woo",
    anime: "Solo Leveling",
  },
  {
    quote: "If you don't fight, you can't win. Tatakae!",
    kanji: "戦わなければ勝てない。戦え！",
    character: "Eren Yeager",
    anime: "Attack on Titan",
  },
  {
    quote: "The only ones who should kill are those prepared to be killed.",
    kanji: "撃っていいのは撃たれる覚悟のある奴だけだ",
    character: "Lelouch vi Britannia",
    anime: "Code Geass",
  },
  {
    quote: "If miracles only happen once, what are they called the second time?",
    kanji: "奇跡が一度なら二度目は何と呼ばれる？",
    character: "Ichigo Kurosaki",
    anime: "Bleach: Thousand-Year Blood War",
  },
];

export const AnimeQuoteTicker: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % REALM_QUOTES.length);
        setFade(true);
      }, 350);
    }, 8500);

    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % REALM_QUOTES.length);
      setFade(true);
    }, 200);
  };

  const current = REALM_QUOTES[index];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-4 sm:-mt-8 mb-4 relative z-20">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12121A]/95 via-[#18131E]/95 to-[#12121A]/95 border border-[#F01428]/25 p-3.5 sm:p-4 shadow-xl shadow-black/60 backdrop-blur-md group">
        {/* Subtle background kanji watermark */}
        <div className="absolute right-6 -bottom-3 text-5xl sm:text-7xl font-black text-white/[0.03] select-none pointer-events-none font-sans tracking-widest uppercase">
          {current.kanji}
        </div>

        {/* Ambient demonic edge glow */}
        <div className="absolute -left-10 top-0 bottom-0 w-24 bg-[#F01428]/15 blur-xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quote Content */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-[#F01428]/15 border border-[#F01428]/40 text-[#F01428] shrink-0 shadow-sm shadow-[#F01428]/30">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>

            <div
              className={`transition-all duration-300 transform ${
                fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#FF4D61] flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Realm Decree
                </span>
                <span className="text-[10px] text-[#707085]">•</span>
                <span className="text-[10px] text-[#A0A0B5] font-medium">
                  {current.character} ({current.anime})
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white italic font-body">
                &ldquo;{current.quote}&rdquo;
              </p>
            </div>
          </div>

          {/* Quick cycle button */}
          <button
            onClick={handleNext}
            aria-label="Next Decree"
            title="Next Anime Decree"
            className="self-end md:self-center shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-[#F01428]/20 border border-white/10 hover:border-[#F01428]/40 text-xs font-semibold text-[#A0A0B5] hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3 h-3 text-[#FF4D61]" />
            <span className="text-[11px]">Shuffle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
