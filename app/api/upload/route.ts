import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Upload & HLS directories
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const hlsDir = path.join(process.cwd(), 'public', 'hls');

// Multi-quality resolutions
const resolutions = [
  { name: '120p', width: 160, height: 120, bitrate: '200k' },
  { name: '320p', width: 480, height: 320, bitrate: '500k' },
  { name: '480p', width: 854, height: 480, bitrate: '1000k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
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

    // Convert to HLS with multiple qualities
    await convertToHLS(videoPath, outputDir);

    // Return URL to the generated master playlist
    return NextResponse.json({
      success: true,
      url: `/hls/${outputDirName}/master.m3u8`,
      message: 'Video converted to HLS in multiple qualities successfully',
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: 'Failed to process video', success: false }, { status: 500 });
  }
}

async function convertToHLS(videoPath: string, outputDir: string) {
  await Promise.all(
    resolutions.map(
      ({ name, width, height, bitrate }) =>
        new Promise((resolve, reject) => {
          const outputM3U8 = path.join(outputDir, `${name}.m3u8`);
          const ffmpeg = spawn('ffmpeg', [
            '-i',
            videoPath,
            '-vf',
            `scale=${width}:${height}`, // Scale video
            '-b:v',
            bitrate, // Set bitrate
            '-preset',
            'ultrafast', // Fastest encoding
            '-crf',
            '23', // Quality adjustment
            '-start_number',
            '0',
            '-hls_time',
            '10',
            '-hls_list_size',
            '0',
            '-threads',
            '4', // Limit CPU usage
            '-bufsize',
            '256k', // Reduce RAM usage
            '-f',
            'hls', // Output as HLS
            outputM3U8,
          ]);

          ffmpeg.on('close', (code) => {
            if (code !== 0) reject(new Error(`FFmpeg failed with code ${code}`));
            else resolve(true);
          });
        }),
    ),
  );

  // Create master playlist
  const masterPlaylist = resolutions
    .map(
      ({ name, width, height }) =>
        `#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=${width}x${height}\n${name}.m3u8`,
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
