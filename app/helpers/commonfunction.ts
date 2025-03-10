// hooks/useHlsUtils.ts
import Hls from 'hls.js';

// Common function to initialize HLS video playback
export function initializeVideoPlayback(
  videoElement: HTMLVideoElement,
  src: string,
  autoPlay: boolean = true,
): Hls | undefined {
  if (!videoElement || !src) return undefined;

  // Clean up existing HLS instance if one exists
  if (videoElement.hlsInstance) {
    videoElement.hlsInstance.destroy();
    videoElement.hlsInstance = undefined;
  }

  let hlsInstance: Hls | undefined = undefined;

  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      // Adding some configuration to improve stability
      fragLoadingMaxRetry: 5,
      manifestLoadingMaxRetry: 5,
      levelLoadingMaxRetry: 5,
      fragLoadingRetryDelay: 1000,
    });

    // Set up event handlers before loading the source
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      // Delay play attempts to avoid AbortError
      if (autoPlay) {
        setTimeout(() => {
          const playPromise = videoElement.play();

          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error('Error auto-playing video:', error);
              // If autoplay fails due to browser policy, we could show a play button
              // or attempt to play with user interaction
            });
          }
        }, 100);
      }
    });

    // Handle errors gracefully
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('HLS network error', data);
            hlsInstance?.startLoad(); // Try to recover on network errors
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('HLS media error', data);
            hlsInstance?.recoverMediaError(); // Try to recover media errors
            break;
          default:
            console.error('HLS fatal error', data);
            if (hlsInstance) {
              hlsInstance.destroy();
            }
            break;
        }
      }
    });

    // Now load the source and attach media
    hlsInstance.loadSource(src);
    hlsInstance.attachMedia(videoElement);

    // Store the hls instance for reference
    videoElement.hlsInstance = hlsInstance;
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    // For native HLS support, wait for loadedmetadata event
    const playHandler = () => {
      if (autoPlay) {
        // Delay play to avoid race conditions
        setTimeout(() => {
          const playPromise = videoElement.play();

          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error('Error auto-playing video:', error);
            });
          }
        }, 100);
      }
    };

    // For native HLS support (Safari)
    videoElement.src = src;

    // Clear any previous event listeners
    videoElement.removeEventListener('loadedmetadata', playHandler);

    videoElement.addEventListener('loadedmetadata', playHandler, { once: true });
  }

  return hlsInstance;
}

// Function to properly clean up HLS resources
export function destroyVideoPlayback(videoElement: HTMLVideoElement): void {
  if (!videoElement) return;

  // Stop any ongoing playback
  try {
    videoElement.pause();
    videoElement.removeAttribute('src');
    videoElement.load();
  } catch (e) {
    console.error('Error while pausing video', e);
  }

  // Clean up HLS instance
  if (videoElement.hlsInstance) {
    try {
      videoElement.hlsInstance.destroy();
      videoElement.hlsInstance = undefined;
    } catch (e) {
      console.error('Error destroying HLS instance', e);
    }
  }
}

// Add type declaration for the hlsInstance property
declare global {
  interface HTMLVideoElement {
    hlsInstance?: Hls;
  }
}
