import React from 'react';
import { Film, Search, Heart, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: 'search' | 'heart' | 'film' | 'alert';
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'film',
  title,
  description,
  actionText,
  actionLink,
  onAction,
}) => {
  const renderIcon = () => {
    switch (icon) {
      case 'search':
        return <Search className="w-10 h-10 text-[#F01428]" />;
      case 'heart':
        return <Heart className="w-10 h-10 text-[#F01428]" />;
      case 'alert':
        return <AlertCircle className="w-10 h-10 text-[#F01428]" />;
      default:
        return <Film className="w-10 h-10 text-[#F01428]" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-2xl bg-[#1C1C26] border border-white/10 flex items-center justify-center mb-5 shadow-xl shadow-black/40">
        {renderIcon()}
      </div>
      <h3 className="text-xl font-bold text-white mb-2 font-heading">{title}</h3>
      <p className="text-sm text-[#9E9EB2] mb-6 leading-relaxed">{description}</p>
      {actionText && actionLink && (
        <Link to={actionLink}>
          <Button variant="primary">{actionText}</Button>
        </Link>
      )}
      {actionText && onAction && !actionLink && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
