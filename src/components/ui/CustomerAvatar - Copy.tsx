import React from 'react';

interface CustomerAvatarProps {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-24 h-24 text-2xl',
};

const sizeStyles = {
  sm: { fontSize: '0.875rem' },
  md: { fontSize: '1rem' },
  lg: { fontSize: '1.25rem' },
  xl: { fontSize: '1.5rem' },
};

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  firstName,
  lastName,
  photoUrl,
  size = 'md',
  className = '',
  onClick,
  clickable = false,
}) => {
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  const baseClasses = `rounded-2xl flex items-center justify-center overflow-hidden ${sizeClasses[size]} ${className}`;
  const interactiveClasses = (clickable || onClick) && photoUrl
    ? 'cursor-pointer hover:ring-4 hover:ring-cyan-300 transition-all hover:scale-105'
    : '';

  const handleClick = () => {
    if ((clickable || onClick) && photoUrl) {
      onClick?.();
    }
  };

  if (photoUrl) {
    return (
      <div
        className={`${baseClasses} ${interactiveClasses}`}
        onClick={handleClick}
        role={clickable || onClick ? 'button' : undefined}
        tabIndex={clickable || onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && (clickable || onClick)) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <img
          src={photoUrl}
          alt={`${firstName} ${lastName}`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} bg-gradient-to-br from-cyan-400 to-cyan-600 text-white font-semibold shadow-md`}
      style={{ fontSize: sizeStyles[size].fontSize }}
    >
      {initials}
    </div>
  );
};
