// hooks/useHls.ts
import { useRef, useEffect } from 'react';
import { initializeVideoPlayback } from '../helpers/commonfunction';

export function useHls(src: string, autoPlay: boolean = true) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Only initialize HLS if we have both a video element and a source
    if (!videoRef.current || !src) return;

    // Initialize HLS playback
    const hlsInstance = initializeVideoPlayback(videoRef.current, src, autoPlay);

    // Cleanup function
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      // Ensure any stored reference is also cleared
      if (videoRef.current?.hlsInstance) {
        delete videoRef.current.hlsInstance;
      }
    };
  }, [src, autoPlay]);

  return { videoRef };
}
