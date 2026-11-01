import React, { useState } from 'react';
import { Play } from 'lucide-react';

/**
 * Video in a feed card (any drop type can carry one). YouTube shows its
 * thumbnail with a play button and loads the privacy-enhanced player only on
 * tap, so a scrolled-past video costs nothing; .mp4 plays in a native player.
 */
const youtubeId = (url: string): string | null => {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
};

export const DropVideo: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  const [playing, setPlaying] = useState(false);
  const yt = youtubeId(url);

  if (!yt) {
    return <video className="absolute inset-0 h-full w-full object-cover" src={url} controls playsInline preload="metadata" aria-label={title} />;
  }
  if (playing) {
    return (
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play video: ${title}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail, external host */}
      <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <span className="absolute left-1/2 top-[40%] z-[3] grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white shadow-[var(--shadow-pop)] transition-transform group-hover:scale-105">
        <Play className="ml-1 h-9 w-9" fill="currentColor" aria-hidden />
      </span>
    </button>
  );
};
