import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// HLS directory path
const hlsDir: string = path.join(process.cwd(), 'public', 'hls');
const uploadDir: string = path.join(process.cwd(), 'public', 'uploads'); // Corrected path

interface VideoDetails {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
  duration?: number;
  fileSize?: number;
  segments?: number;
  thumbnail?: string;
}

// Get video details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const videoId = params.id;
    const videoDir = path.join(hlsDir, videoId);

    if (!existsSync(videoDir)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Ensure master.m3u8 exists
    const masterPlaylistPath = path.join(videoDir, 'master.m3u8');
    if (!existsSync(masterPlaylistPath)) {
      return NextResponse.json({ error: 'Invalid HLS video' }, { status: 400 });
    }

    // Read all files in the directory
    const files = await readdir(videoDir);
    const segments = files.filter((file) => file.endsWith('.ts')).length; // Count segments

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

    // Calculate file size (sum of all segment files)
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(videoDir, file);
      const fileStats = await stat(filePath);
      totalSize += fileStats.size;
    }

    // 📌 Include Thumbnail URL
    const thumbnailPath = path.join(videoDir, 'thumbnail.jpg');
    const thumbnailUrl = existsSync(thumbnailPath) ? `/hls/${videoId}/thumbnail.jpg` : '';

    const videoDetails: VideoDetails = {
      id: videoId,
      title,
      src: `/hls/${videoId}/master.m3u8`,
      thumbnail: thumbnailUrl, // Include thumbnail URL
      createdAt: timestamp,
      segments,
      fileSize: totalSize,
    };

    return NextResponse.json(videoDetails);
  } catch (error) {
    console.error('Error fetching video details:', error);
    return NextResponse.json({ error: 'Failed to fetch video details' }, { status: 500 });
  }
}

// Delete a video
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const videoId = params.id;
    const videoDir = path.join(hlsDir, videoId);

    if (!existsSync(videoDir)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete the HLS directory (including thumbnail)
    await rm(videoDir, { recursive: true, force: true });

    // Delete the original uploaded video
    const uploadedFiles = await readdir(uploadDir);
    for (const file of uploadedFiles) {
      if (file.startsWith(videoId)) {
        await rm(path.join(uploadDir, file));
        break;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Video ${videoId} deleted successfully`,
      id: videoId,
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
