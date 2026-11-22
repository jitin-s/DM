import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary: 'bg-[#F01428] hover:bg-[#ff2035] text-white shadow-lg shadow-[#F01428]/25 hover:shadow-[#F01428]/40 hover:scale-[1.02]',
    secondary: 'bg-[#1C1C26] hover:bg-[#252533] text-[#F4F4F7] border border-white/10 hover:border-white/20',
    outline: 'bg-transparent hover:bg-white/5 text-[#F4F4F7] border border-white/20 hover:border-[#F01428] hover:text-[#F01428]',
    ghost: 'bg-transparent hover:bg-white/10 text-[#9E9EB2] hover:text-white',
    danger: 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 font-bold',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
