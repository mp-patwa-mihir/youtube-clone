import Hls from 'hls.js';

// Store HLS instances separately to avoid modifying `videoElement`
const hlsInstances = new Map<HTMLVideoElement, Hls>();

/**
 * Initializes HLS playback for a video element.
 * @param videoElement The HTMLVideoElement where the video will be played.
 * @param src The HLS video source (master.m3u8 URL).
 * @param autoPlay Whether to autoplay the video (default: true).
 * @returns The initialized Hls.js instance (if applicable).
 */
export function initializeVideoPlayback(
  videoElement: HTMLVideoElement,
  src: string,
  autoPlay: boolean = true,
): Hls | undefined {
  if (!videoElement || !src) return undefined;

  // Clean up existing HLS instance
  destroyVideoPlayback(videoElement);

  let hlsInstance: Hls | undefined = undefined;

  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      fragLoadingMaxRetry: 5,
      manifestLoadingMaxRetry: 5,
      levelLoadingMaxRetry: 5,
      fragLoadingRetryDelay: 1000,
    });

    // Attach event handlers before loading the source
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      if (autoPlay) {
        setTimeout(() => {
          videoElement.play().catch((error) => {
            console.warn('Auto-play blocked:', error);
          });
        }, 100);
      }
    });

    // Improved error handling
    let errorCount = 0;
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('HLS network error', data);
            hlsInstance?.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('HLS media error', data);
            if (errorCount < 3) {
              hlsInstance?.recoverMediaError();
            } else {
              console.error('Too many errors, reloading...');
              destroyVideoPlayback(videoElement);
              initializeVideoPlayback(videoElement, src, autoPlay);
            }
            errorCount++;
            break;
          default:
            console.error('HLS fatal error', data);
            destroyVideoPlayback(videoElement);
            break;
        }
      }
    });

    // Load the source and attach to media
    hlsInstance.loadSource(src);
    hlsInstance.attachMedia(videoElement);

    // Store the instance for cleanup
    hlsInstances.set(videoElement, hlsInstance);
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari)
    videoElement.src = src;
    videoElement.addEventListener(
      'canplay',
      () => {
        if (autoPlay) {
          videoElement.play().catch((error) => {
            console.warn('Auto-play blocked:', error);
          });
        }
      },
      { once: true },
    );
  }

  return hlsInstance;
}

/**
 * Cleans up HLS playback and removes event listeners.
 * @param videoElement The HTMLVideoElement to clean up.
 */
export function destroyVideoPlayback(videoElement: HTMLVideoElement): void {
  if (!videoElement) return;

  try {
    videoElement.pause();
    videoElement.removeAttribute('src');
    videoElement.load();
  } catch (e) {
    console.error('Error while pausing video', e);
  }

  // Remove HLS instance if it exists
  const hlsInstance = hlsInstances.get(videoElement);
  if (hlsInstance) {
    try {
      hlsInstance.destroy();
    } catch (e) {
      console.error('Error destroying HLS instance', e);
    }
    hlsInstances.delete(videoElement);
  }
}
