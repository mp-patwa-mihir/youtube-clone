// app/components/VideoCard.tsx
'use client';

import Link from 'next/link';
import { debounce } from 'lodash-es';
import { useEffect, useRef } from 'react';
import { initializeVideoPlayback } from '../../helpers/commonfunction';
import { DeleteOutlined } from '@ant-design/icons';

interface VideoCardProps {
  id: string;
  title: string;
  src: string; // URL for the video preview (could be an HLS preview)
  thumbnail: string; // URL for the thumbnail image
  fetchVideos: () => void;
}

export default function VideoCard({ id, title, src, thumbnail, fetchVideos }: VideoCardProps) {
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
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <video
          ref={videoRef}
          poster={thumbnail}
          muted
          playsInline
          style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
        />
        <DeleteOutlined
          style={{
            color: 'red',
            width: '16px',
            height: '16px',
            position: 'absolute',
            top: '8px',
            right: '8px',
          }}
          onClick={(e) => {
            e.preventDefault();
            fetch(`/api/videos/${id}`, {
              method: 'DELETE',
            }).then((res) => {
              if (res.ok) {
                fetchVideos();
              }
            });
          }}
        />
        <h3 style={{ marginTop: '8px', fontSize: '16px' }}>{title}</h3>
      </div>
    </Link>
  );
}
