import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Upload & HLS directories
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const hlsDir = path.join(process.cwd(), 'public', 'hls');

// Quality levels (only specifying height)
const qualityLevels = [
  { name: '144p', height: 144, bitrate: '200k' },
  { name: '240p', height: 240, bitrate: '500k' },
  { name: '360p', height: 360, bitrate: '1000k' },
  { name: '480p', height: 480, bitrate: '2000k' },
  { name: '720p', height: 720, bitrate: '3000k' },
  { name: '1080p', height: 1080, bitrate: '5000k' },
];

// Ensure directories exist
async function ensureDirectories(): Promise<void> {
  if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
  if (!existsSync(hlsDir)) await mkdir(hlsDir, { recursive: true });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureDirectories();

    // Handle file upload
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    if (!videoFile) return NextResponse.json({ error: 'No video file provided' }, { status: 400 });

    // Generate unique filename
    const timestamp = Date.now();
    const originalFilename = videoFile.name.replace(/\s+/g, '-');
    const uniqueFilename = `${timestamp}-${originalFilename}`;
    const videoPath = path.join(uploadDir, uniqueFilename);

    // HLS output directory
    const outputDirName = uniqueFilename.replace(/\.[^/.]+$/, ''); // Remove extension
    const outputDir = path.join(hlsDir, outputDirName);
    await mkdir(outputDir, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    await writeFile(videoPath, buffer);

    // Get video metadata (dimensions)
    const videoInfo = await getVideoMetadata(videoPath);

    // Convert to HLS with multiple qualities while maintaining aspect ratio
    await convertToHLS(videoPath, outputDir, videoInfo);

    // Return URL to the generated master playlist
    return NextResponse.json({
      success: true,
      url: `/hls/${outputDirName}/master.m3u8`,
      message: 'Video converted to HLS in multiple qualities successfully',
      videoInfo: videoInfo,
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: 'Failed to process video', success: false }, { status: 500 });
  }
}

// Function to get video metadata using FFprobe
async function getVideoMetadata(
  videoPath: string,
): Promise<{ width: number; height: number; aspectRatio: number; displayAspectRatio: string }> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,display_aspect_ratio,sample_aspect_ratio',
      '-of',
      'json',
      videoPath,
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed with code ${code}`));
        return;
      }

      try {
        const data = JSON.parse(output);
        const stream = data.streams[0];
        const width = parseInt(stream.width);
        const height = parseInt(stream.height);

        // Calculate the exact pixel aspect ratio
        const pixelAspectRatio = width / height;

        // Parse display aspect ratio if available
        let displayAspectRatio = stream.display_aspect_ratio || '';

        // If display_aspect_ratio is not available, use the calculated pixel ratio
        if (!displayAspectRatio || displayAspectRatio === 'N/A') {
          // Calculate the greatest common divisor (GCD)
          const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
          const divisor = gcd(width, height);

          // Format as "16:9" style
          displayAspectRatio = `${width / divisor}:${height / divisor}`;
        }

        resolve({
          width,
          height,
          aspectRatio: pixelAspectRatio,
          displayAspectRatio,
        });
      } catch (err) {
        reject(new Error(`Failed to parse FFprobe output: ${err.message}`));
      }
    });
  });
}

async function convertToHLS(
  videoPath: string,
  outputDir: string,
  videoInfo: { width: number; height: number; aspectRatio: number; displayAspectRatio: string },
) {
  // Calculate precise dimensions for each quality level
  const resolutions = qualityLevels.map((level) => {
    // Calculate width based on the original aspect ratio
    const exactWidth = level.height * videoInfo.aspectRatio;

    // Round to nearest even number (required by h.264)
    const width = Math.round(exactWidth / 2) * 2;

    // Calculate actual bandwidth based on resolution and bitrate
    // YouTube typically scales bandwidth with resolution
    const bitrateValue = parseInt(level.bitrate.replace('k', '')) * 1000;

    return {
      ...level,
      width,
      exactWidth,
      resolution: `${width}x${level.height}`,
      bandwidth: bitrateValue,
    };
  });

  // Log calculated resolutions for debugging
  console.log('Original video:', videoInfo);
  console.log('Calculated resolutions:', resolutions);

  await Promise.all(
    resolutions.map(
      ({ name, width, height, bitrate }) =>
        new Promise((resolve, reject) => {
          const outputM3U8 = path.join(outputDir, `${name}.m3u8`);

          // Use exact scaling with no padding to match YouTube's approach
          const ffmpeg = spawn('ffmpeg', [
            '-i',
            videoPath,
            '-vf',
            `scale=${width}:${height}`,
            '-c:v',
            'libx264',
            '-b:v',
            bitrate,
            '-preset',
            'faster',
            '-crf',
            '23',
            '-sc_threshold',
            '0',
            '-g',
            '48',
            '-keyint_min',
            '48',
            '-hls_time',
            '4',
            '-hls_playlist_type',
            'vod',
            '-hls_segment_filename',
            path.join(outputDir, `${name}_%03d.ts`),
            outputM3U8,
          ]);

          ffmpeg.stderr.on('data', (data) => {
            // Uncomment for debugging
            console.log(`FFmpeg stderr: ${data}`);
          });

          ffmpeg.on('close', (code) => {
            if (code !== 0) reject(new Error(`FFmpeg failed with code ${code}`));
            else resolve(true);
          });
        }),
    ),
  );

  // Generate Thumbnail (1st Frame)
  const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
  await new Promise((resolve, reject) => {
    const ffmpegThumbnail = spawn('ffmpeg', [
      '-i',
      videoPath,
      '-ss',
      '00:00:01',
      '-vframes',
      '1',
      '-vf',
      'scale=320:-1',
      '-q:v',
      '2',
      thumbnailPath,
    ]);

    ffmpegThumbnail.on('close', (code) => {
      if (code !== 0) reject(new Error(`FFmpeg thumbnail failed with code ${code}`));
      else resolve(true);
    });
  });

  // Create Master Playlist with accurate bandwidth values
  const masterPlaylist = resolutions
    .map(
      ({ name, width, height, bandwidth }) =>
        `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height}\n${name}.m3u8`,
    )
    .join('\n');

  await writeFile(path.join(outputDir, 'master.m3u8'), `#EXTM3U\n${masterPlaylist}`);
}

// Configure Next.js to allow large uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};
