'use client';

import Link from 'next/link';
import { debounce } from 'lodash-es';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { DeleteOutlined } from '@ant-design/icons';

interface VideoCardProps {
  id: string;
  title: string;
  src: string; // HLS video URL
  thumbnail: string; // Thumbnail image URL
  fetchVideos: () => void;
}

export default function VideoCard({ id, title, src, thumbnail, fetchVideos }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  // Debounce video playback to prevent excessive calls
  const debouncedPlay = useRef(
    debounce(() => {
      if (videoRef.current && src) {
        if (Hls.isSupported()) {
          hlsInstanceRef.current = new Hls();
          hlsInstanceRef.current.loadSource(src);
          hlsInstanceRef.current.attachMedia(videoRef.current);
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = src;
        }
        videoRef.current.play().catch(() => {}); // Handle autoplay restrictions
      }
    }, 300),
  ).current;

  // Play video on hover
  const handleMouseEnter = () => {
    if (src) {
      debouncedPlay();
    }
  };

  // Stop video and clean up HLS instance
  const handleMouseLeave = () => {
    debouncedPlay.cancel();

    if (videoRef.current) {
      hlsInstanceRef.current?.destroy();
      hlsInstanceRef.current = null;
      videoRef.current.pause();
      videoRef.current.src = ''; // Clear source
      videoRef.current.load(); // Reset player
      videoRef.current.poster = thumbnail; // Reset to thumbnail
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      debouncedPlay.cancel();
      hlsInstanceRef.current?.destroy();
    };
  }, [debouncedPlay]);

  return (
    <Link href={`/video/${id}`} passHref>
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
          style={{
            width: '100%',
            maxWidth: '300px',
            minWidth: '300px',
            height: '100%',
            minHeight: '170px',
            maxHeight: '170px',
            borderRadius: '8px',
            objectFit: 'cover',
          }}
        />
        <DeleteOutlined
          style={{
            color: 'red',
            fontSize: '16px',
            position: 'absolute',
            top: '8px',
            right: '8px',
          }}
          onClick={async (e) => {
            e.preventDefault();
            const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
            if (res.ok) fetchVideos();
          }}
        />
        <h3 style={{ marginTop: '8px', fontSize: '16px' }}>{title}</h3>
      </div>
    </Link>
  );
}
