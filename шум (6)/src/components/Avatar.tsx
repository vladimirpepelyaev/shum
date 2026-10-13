import React from 'react';

interface AvatarProps {
  name?: string;
  avatarUrl?: string | null;
  emoji?: string | null;
  hasEyes?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'U',
  avatarUrl,
  emoji,
  hasEyes = false,
  size = 'md',
  showOnline = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-3xl',
  };

  const emojiSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  };

  const eyeSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  return (
    <div className={`relative inline-block select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-[#18181b] border border-neutral-700/80 flex items-center justify-center overflow-hidden shadow-inner shrink-0`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : emoji ? (
          <span className={`${emojiSizes[size]} select-none leading-none flex items-center justify-center [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji',sans-serif]`}>
            {emoji}
          </span>
        ) : hasEyes ? (
          <div className="w-full h-full bg-[#0f0f11] flex items-center justify-center space-x-1">
            <div
              className={`${eyeSizes[size]} bg-white rounded-full flex items-center justify-center`}
            >
              <div className="w-1/2 h-1/2 bg-black rounded-full translate-x-[1px] translate-y-[0.5px]" />
            </div>
            <div
              className={`${eyeSizes[size]} bg-white rounded-full flex items-center justify-center`}
            >
              <div className="w-1/2 h-1/2 bg-black rounded-full translate-x-[1px] translate-y-[0.5px]" />
            </div>
          </div>
        ) : (
          <span className="font-semibold text-neutral-300">
            {name ? name.charAt(0).toUpperCase() : '👤'}
          </span>
        )}
      </div>

      {showOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full" />
      )}
    </div>
  );
};
