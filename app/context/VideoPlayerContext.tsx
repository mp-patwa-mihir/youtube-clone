'use client';
// context/VideoPlayerContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useHls } from '../hooks/useHls';

interface VideoPlayerContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export function VideoPlayerProvider({ src, children }: { src: string; children: ReactNode }) {
  const { videoRef } = useHls(src);

  return <VideoPlayerContext.Provider value={{ videoRef }}>{children}</VideoPlayerContext.Provider>;
}

export function useVideoPlayerContext() {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayerContext must be used within a VideoPlayerProvider');
  }
  return context;
}
