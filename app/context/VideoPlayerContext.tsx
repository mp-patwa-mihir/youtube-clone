'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useHls } from '../hooks/useHls';
import Hls from 'hls.js';

interface VideoPlayerContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  hlsInstance: Hls | null;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export function VideoPlayerProvider({ src, children }: { src: string; children: ReactNode }) {
  const { videoRef, hlsInstance } = useHls(src);

  return (
    <VideoPlayerContext.Provider value={{ videoRef, hlsInstance }}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayerContext() {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayerContext must be used within a VideoPlayerProvider');
  }
  return context;
}
