// app/components/VideoCard.tsx
'use client';

import Link from 'next/link';
import { debounce } from 'lodash-es';
import { useEffect, useRef } from 'react';
import { initializeVideoPlayback } from '../../helpers/commonfunction';

interface VideoCardProps {
  id: string;
  title: string;
  src: string; // URL for the video preview (could be an HLS preview)
  thumbnail: string; // URL for the thumbnail image
}

export default function VideoCard({ id, title, src, thumbnail }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Create the debounced play function once
  const debouncedPlay = useRef(
    debounce(() => {
      if (videoRef.current && src) {
        initializeVideoPlayback(videoRef.current, src);
      }
    }, 500),
  ).current;

  const handleMouseEnter = () => {
    if (src) {
      debouncedPlay();
    }
  };

  const handleMouseLeave = () => {
    debouncedPlay.cancel();

    if (videoRef.current) {
      // Cleanup HLS if it was initialized
      if (videoRef.current.hlsInstance) {
        videoRef.current.hlsInstance.destroy();
        delete videoRef.current.hlsInstance;
      }

      videoRef.current.pause();
      videoRef.current.src = ''; // Clear the source
      videoRef.current.load(); // Reset the video element
      videoRef.current.poster = thumbnail; // Reset to thumbnail
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      debouncedPlay.cancel();
      if (videoRef.current?.hlsInstance) {
        videoRef.current.hlsInstance.destroy();
      }
    };
  }, [debouncedPlay]);

  return (
    <Link href={`/video/${id}`}>
      <div
        className="video-card"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer' }}
      >
        <video
          ref={videoRef}
          poster={thumbnail}
          muted
          playsInline
          style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
        />
        <h3 style={{ marginTop: '8px', fontSize: '16px' }}>{title}</h3>
      </div>
    </Link>
  );
}
