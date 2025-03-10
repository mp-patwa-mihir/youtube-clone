// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Configure the upload directory
const uploadDir: string = path.join(process.cwd(), 'public', 'uploads');
const hlsDir: string = path.join(process.cwd(), 'public', 'hls');

// Response type
interface UploadResponse {
  success?: boolean;
  url?: string;
  message?: string;
  error?: string;
  conversionStatus?: string;
}

// Ensure directories exist
async function ensureDirectories(): Promise<void> {
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  if (!existsSync(hlsDir)) {
    await mkdir(hlsDir, { recursive: true });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    await ensureDirectories();

    // Handle the multipart form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Get file buffer
    const buffer = Buffer.from(await videoFile.arrayBuffer());

    // Generate unique filename
    const timestamp = Date.now();
    const originalFilename = videoFile.name.replace(/\s+/g, '-');
    const uniqueFilename = `${timestamp}-${originalFilename}`;
    const videoPath = path.join(uploadDir, uniqueFilename);

    // Create output directory for HLS files
    const outputDirName = uniqueFilename.replace(/\.[^/.]+$/, ''); // Remove extension
    const outputDir = path.join(hlsDir, outputDirName);
    await mkdir(outputDir, { recursive: true });

    // Write the uploaded file to disk
    await writeFile(videoPath, buffer);

    // Convert to HLS (.m3u8) using FFmpeg
    const outputPath = path.join(outputDir, 'playlist.m3u8');

    // Return a promise for the FFmpeg conversion
    const conversionResult = await new Promise<boolean>((resolve, reject) => {
      // FFmpeg command to convert video to HLS format
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        videoPath, // Input file
        '-profile:v',
        'baseline', // Baseline profile for broader compatibility
        '-level',
        '3.0', // Level for compatibility
        '-start_number',
        '0', // Start segment numbering from 0
        '-hls_time',
        '10', // 10 second segments
        '-hls_list_size',
        '0', // Include all segments in the playlist
        '-f',
        'hls', // HLS format
        outputPath, // Output path
      ]);

      let errorMessage = '';

      ffmpeg.stderr.on('data', (data: Buffer) => {
        // FFmpeg logs to stderr by default, even for non-errors
        errorMessage += data.toString();
      });

      ffmpeg.on('close', (code: number) => {
        if (code !== 0) {
          console.error('FFmpeg process exited with code', code);
          reject(new Error(`FFmpeg exited with code ${code}: ${errorMessage}`));
        } else {
          resolve(true);
        }
      });
    });

    // Construct the URL for the client
    const publicHlsUrl = `/hls/${outputDirName}/playlist.m3u8`;

    // Use the conversionResult to provide status information
    return NextResponse.json({
      success: true,
      url: publicHlsUrl,
      message: 'Video converted to HLS format successfully',
      conversionStatus: conversionResult
        ? 'Completed successfully'
        : 'Conversion process ran but status unknown',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process video';
    console.error('Error processing upload:', error);

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
        conversionStatus: 'Failed',
      },
      { status: 500 },
    );
  }
}

// Configure NextJS to allow larger uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};
