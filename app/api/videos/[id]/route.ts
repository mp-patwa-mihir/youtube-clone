import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// HLS directory path
const hlsDir: string = path.join(process.cwd(), 'public', 'hls');

interface VideoDetails {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
  duration?: number;
  fileSize?: number;
  segments?: number;
}

// Get individual video details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const videoId = params.id;

    // Check if the video directory exists
    const videoDir = path.join(hlsDir, videoId);
    if (!existsSync(videoDir)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if playlist.m3u8 exists
    const m3u8Path = path.join(videoDir, 'playlist.m3u8');
    if (!existsSync(m3u8Path)) {
      return NextResponse.json({ error: 'Invalid HLS video' }, { status: 400 });
    }

    // Get video details
    const files = await readdir(videoDir);

    // Count .ts segment files
    const segments = files.filter((file) => file.endsWith('.ts')).length;

    // Extract title from directory name
    let title = videoId;
    let timestamp: number | undefined;

    const timestampMatch = videoId.match(/^(\d+)-(.+)$/);
    if (timestampMatch) {
      timestamp = parseInt(timestampMatch[1], 10);
      title = timestampMatch[2]
        .replace(/-/g, ' ')
        .replace(/\.[^/.]+$/, '')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    // Try to get file stats for one of the segments to estimate size
    let fileSize: number | undefined;
    if (segments > 0) {
      const segmentFile = files.find((file) => file.endsWith('.ts'));
      if (segmentFile) {
        const segmentStats = await stat(path.join(videoDir, segmentFile));
        fileSize = segmentStats.size * segments; // Rough estimate
      }
    }

    const videoDetails: VideoDetails = {
      id: videoId,
      title: title,
      src: `/hls/${videoId}/playlist.m3u8`,
      createdAt: timestamp,
      segments: segments,
      fileSize: fileSize,
      // Note: We can't accurately determine duration without parsing the m3u8 file
      // or using ffprobe, which would require additional implementation
    };

    return NextResponse.json(videoDetails);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error fetching video details:', error);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Delete a video
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const videoId = params.id;

    // Check if the video directory exists
    const videoDir = path.join(hlsDir, videoId);
    if (!existsSync(videoDir)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete the directory and all its contents recursively
    await rm(videoDir, { recursive: true, force: true });

    // Check if there's an original video file (optional)
    const originalVideoDir = path.join(process.cwd(), 'uploads', 'videos');
    const possibleExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

    for (const ext of possibleExtensions) {
      const originalFilePath = path.join(originalVideoDir, `${videoId}${ext}`);
      if (existsSync(originalFilePath)) {
        await rm(originalFilePath);
        break;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Video ${videoId} deleted successfully`,
      id: videoId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error deleting video:', error);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
