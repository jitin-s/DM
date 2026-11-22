import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'red' | 'dark' | 'glass' | 'green' | 'amber' | 'blue';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'dark',
  size = 'sm',
  className = '',
}) => {
  const variants = {
    red: 'bg-[#F01428] text-white font-bold shadow-sm shadow-[#F01428]/40',
    dark: 'bg-[#15151C]/90 text-[#9E9EB2] border border-white/10 font-medium',
    glass: 'bg-black/60 backdrop-blur-md text-white border border-white/15 font-semibold',
    green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium',
    amber: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium',
    blue: 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded',
    sm: 'text-xs px-2.5 py-1 rounded-md',
    md: 'text-sm px-3 py-1.5 rounded-lg',
  };

  return (
    <span className={`inline-flex items-center gap-1 leading-none ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
