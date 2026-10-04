'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function UserAvatar({ src, name, size = 48, className = '' }) {
  const [failedSrc, setFailedSrc] = useState('');
  const initials = (name || 'HiddenGems')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className={`user-avatar ${className}`.trim()}
      style={{ width: size, height: size, '--avatar-size': `${size}px` }}
      aria-hidden="true"
    >
      {src && failedSrc !== src ? (
        <Image src={src} alt="" width={size} height={size} unoptimized className="user-avatar__image" onError={() => setFailedSrc(src)} />
      ) : (
        <span className="user-avatar__initials">{initials}</span>
      )}
    </span>
  );
}
