import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { initializeVideoPlayback, destroyVideoPlayback } from '../helpers/commonfunction';

export function useHls(src: string, autoPlay: boolean = true) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);

  useEffect(() => {
    if (!videoRef.current || !src) return;

    // Initialize HLS playback
    const hls = initializeVideoPlayback(videoRef.current, src, autoPlay);
    setHlsInstance(hls);

    return () => {
      destroyVideoPlayback(videoRef.current);
      setHlsInstance(null);
    };
  }, [src, autoPlay]);

  return { videoRef, hlsInstance };
}
