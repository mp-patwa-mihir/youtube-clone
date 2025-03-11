import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Define the video interface
interface VideoItem {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
  fileSize?: number;
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

    // Read all directories inside the HLS folder
    const directories = await readdir(hlsDir, { withFileTypes: true });

    // Filter to only get directories
    const videoDirs = directories.filter((dirent) => dirent.isDirectory());

    // Map each directory to a video object
    const videos: VideoItem[] = await Promise.all(
      videoDirs.map(async (dir): Promise<VideoItem> => {
        const dirName = dir.name;

        // Path to the master.m3u8 file
        const masterPlaylistPath = path.join(hlsDir, dirName, 'master.m3u8');
        if (!existsSync(masterPlaylistPath)) {
          return {
            id: dirName,
            title: 'Invalid video',
            src: '',
            createdAt: 0,
            fileSize: 0,
          };
        }

        // Extract timestamp and original filename
        let title = dirName;
        let timestamp: number | undefined;

        const timestampMatch = dirName.match(/^(\d+)-(.+)$/);
        if (timestampMatch) {
          timestamp = parseInt(timestampMatch[1], 10);
          title = timestampMatch[2]
            .replace(/-/g, ' ')
            .replace(/\.[^/.]+$/, '') // Remove extension if present
            .replace(/\b\w/g, (char) => char.toUpperCase()); // Title Case
        }

        // Get the total size of HLS files in the directory
        let totalSize = 0;
        try {
          const files = await readdir(path.join(hlsDir, dirName));
          for (const file of files) {
            const filePath = path.join(hlsDir, dirName, file);
            const fileStats = await stat(filePath);
            totalSize += fileStats.size;
          }
        } catch (err) {
          console.warn(`Failed to get size for ${dirName}:`, err);
        }

        return {
          id: dirName,
          title: title,
          src: `/hls/${dirName}/master.m3u8`, // Use master.m3u8 for adaptive streaming
          createdAt: timestamp,
          fileSize: totalSize, // Size in bytes
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
    console.error('Error listing videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
