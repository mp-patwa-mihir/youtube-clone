'use client';

import { useEffect, useState } from 'react';
import { useVideoPlayerContext } from '../../context/VideoPlayerContext';
import Hls from 'hls.js';

export default function VideoPlayer() {
  const { videoRef, hlsInstance } = useVideoPlayerContext();
  const [qualities, setQualities] = useState<{ index: number; label: string }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // Default: Auto
  const [isLoading, setIsLoading] = useState(false); // Track loading state

  useEffect(() => {
    if (!hlsInstance) return;

    // Get available quality levels
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      const levels = hlsInstance.levels.map((level, index) => ({
        index,
        label: `${level.height}p`,
      }));

      setQualities([{ index: -1, label: 'Auto' }, ...levels]); // Add "Auto" option
    });

    // Detect when quality is fully loaded
    hlsInstance.on(Hls.Events.LEVEL_LOADED, () => {
      setIsLoading(false); // Hide loading indicator
    });
  }, [hlsInstance]);

  // Handle quality change
  const handleQualityChange = (index: number) => {
    if (!videoRef.current || !hlsInstance) return;

    setSelectedQuality(index);
    setIsLoading(true); // Show loading while quality changes

    // Store current playback time
    const currentTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;

    // Switch quality
    hlsInstance.currentLevel = index;

    // Ensure smooth playback
    hlsInstance.once(Hls.Events.LEVEL_SWITCHED, () => {
      setIsLoading(false); // Hide loading indicator

      // Restore playback position and play
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current.play().catch((error) => {
            console.warn('Auto-play blocked after quality change:', error);
          });
        }
      }
    });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        style={{ width: '100%', maxWidth: '800px', borderRadius: '8px' }}
      />

      {/* Show loading indicator when changing quality */}
      {isLoading && <p style={{ color: 'red', fontWeight: 'bold' }}>Switching quality...</p>}

      <div style={{ marginTop: '10px' }}>
        <label style={{ fontWeight: 'bold' }}>Quality: </label>
        <select
          onChange={(e) => handleQualityChange(parseInt(e.target.value))}
          value={selectedQuality}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          {qualities.map((q) => (
            <option key={q.index} value={q.index}>
              {q.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
