import React from 'react';

interface TieEduLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const TieEduLogo: React.FC<TieEduLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = true
}) => {
  const width = size === 'sm' ? 100 : size === 'lg' ? 220 : 145;
  const height = Math.round(width / 1.55);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src="/logo.svg"
        alt="TiEedu — Learn ⌘ Evolve ⌘ Develop"
        style={{ width: `${width}px`, height: `${height}px` }}
        className="object-contain select-none transition-transform hover:scale-[1.02] max-h-10"
      />
    </div>
  );
};
