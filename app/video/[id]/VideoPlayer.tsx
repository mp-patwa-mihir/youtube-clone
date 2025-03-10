// components/VideoPlayer.tsx
'use client';
import { useVideoPlayerContext } from '../../context/VideoPlayerContext';

export default function VideoPlayer() {
  const { videoRef } = useVideoPlayerContext();
  return (
    <video ref={videoRef} controls autoPlay muted style={{ width: '100%', maxWidth: '800px' }} />
  );
}
