// app/api/videos/route.ts
import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Define the video interface
interface VideoItem {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
}

// Configure the HLS directory path
const hlsDir: string = path.join(process.cwd(), 'public', 'hls');

export async function GET(): Promise<NextResponse> {
  try {
    // Check if the HLS directory exists
    if (!existsSync(hlsDir)) {
      return NextResponse.json({
        videos: [],
        message: 'No videos available yet',
      });
    }

    // Read all directories in the HLS folder
    // Each directory should contain a video's HLS files
    const directories = await readdir(hlsDir, { withFileTypes: true });

    // Filter to only get directories
    const videoDirs = directories.filter((dirent) => dirent.isDirectory());

    // Map each directory to a video object
    const videos: VideoItem[] = await Promise.all(
      videoDirs.map(async (dir): Promise<VideoItem> => {
        const dirName = dir.name;

        // Check if this directory contains an m3u8 file
        const m3u8Path = path.join(hlsDir, dirName, 'playlist.m3u8');
        const m3u8Exists = existsSync(m3u8Path);

        if (!m3u8Exists) {
          // Skip directories without m3u8 files
          return {
            id: dirName,
            title: 'Invalid video',
            src: '',
            createdAt: 0,
          };
        }

        // Extract timestamp and original filename
        // Assuming the directory name format is: timestamp-originalfilename
        let title = dirName;
        let timestamp: number | undefined;

        const timestampMatch = dirName.match(/^(\d+)-(.+)$/);
        if (timestampMatch) {
          timestamp = parseInt(timestampMatch[1], 10);
          // Format the title by replacing hyphens with spaces and making it Title Case
          title = timestampMatch[2]
            .replace(/-/g, ' ')
            .replace(/\.[^/.]+$/, '') // Remove extension if present
            .replace(/\b\w/g, (char) => char.toUpperCase()); // Title Case
        }

        return {
          id: dirName,
          title: title,
          src: `/hls/${dirName}/playlist.m3u8`,
          createdAt: timestamp,
        };
      }),
    );

    // Filter out invalid videos and sort by creation date (newest first)
    const validVideos = videos
      .filter((video) => video.src !== '')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      videos: validVideos,
      count: validVideos.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error listing videos:', error);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
