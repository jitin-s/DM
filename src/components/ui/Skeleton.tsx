import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="flex flex-col rounded-xl overflow-hidden bg-[#111116] border border-white/5 animate-pulse">
    <div className="aspect-[3/4] w-full bg-[#1C1C26] relative">
      <div className="absolute top-2 left-2 w-12 h-5 rounded bg-white/10" />
      <div className="absolute top-2 right-2 w-8 h-5 rounded bg-white/10" />
    </div>
    <div className="p-3 space-y-2">
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
      <div className="flex justify-between items-center pt-1">
        <div className="h-3 bg-white/5 rounded w-1/4" />
        <div className="h-3 bg-white/5 rounded w-1/4" />
      </div>
    </div>
  </div>
);

export const HeroSkeleton: React.FC = () => (
  <div className="w-full min-h-[75vh] md:min-h-[85vh] bg-[#08080A] flex items-end pb-16 pt-28 px-4 sm:px-8 border-b border-white/5 animate-pulse">
    <div className="max-w-3xl w-full space-y-4">
      <div className="flex gap-2">
        <div className="w-24 h-6 rounded bg-white/10" />
        <div className="w-16 h-6 rounded bg-white/5" />
        <div className="w-16 h-6 rounded bg-white/5" />
      </div>
      <div className="w-3/4 h-12 rounded bg-white/10" />
      <div className="w-full h-16 rounded bg-white/5" />
      <div className="flex gap-4 pt-2">
        <div className="w-36 h-12 rounded-lg bg-[#F01428]/30" />
        <div className="w-36 h-12 rounded-lg bg-white/10" />
      </div>
    </div>
  </div>
);
