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
  thumbnail?: string;
}

// Configure the HLS directory path
const hlsDir: string = path.join(process.cwd(), 'public', 'hls');

export async function GET(): Promise<NextResponse> {
  try {
    if (!existsSync(hlsDir)) {
      return NextResponse.json({ videos: [], message: 'No videos available yet' });
    }

    const directories = await readdir(hlsDir, { withFileTypes: true });
    const videoDirs = directories.filter((dirent) => dirent.isDirectory());

    const videos: VideoItem[] = await Promise.all(
      videoDirs.map(async (dir): Promise<VideoItem> => {
        const dirName = dir.name;
        const masterPlaylistPath = path.join(hlsDir, dirName, 'master.m3u8');
        const thumbnailPath = path.join(hlsDir, dirName, 'thumbnail.jpg');

        if (!existsSync(masterPlaylistPath)) {
          return {
            id: dirName,
            title: 'Invalid video',
            src: '',
            createdAt: 0,
            fileSize: 0,
            thumbnail: '',
          };
        }

        let title = dirName;
        let timestamp: number | undefined;
        const timestampMatch = dirName.match(/^(\d+)-(.+)$/);
        if (timestampMatch) {
          timestamp = parseInt(timestampMatch[1], 10);
          title = timestampMatch[2]
            .replace(/-/g, ' ')
            .replace(/\.[^/.]+$/, '')
            .replace(/\b\w/g, (char) => char.toUpperCase());
        }

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
          title,
          src: `/hls/${dirName}/master.m3u8`,
          thumbnail: existsSync(thumbnailPath) ? `/hls/${dirName}/thumbnail.jpg` : '',
          createdAt: timestamp,
          fileSize: totalSize,
        };
      }),
    );

    const validVideos = videos
      .filter((video) => video.src !== '')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ videos: validVideos, count: validVideos.length });
  } catch (error: unknown) {
    console.error('Error listing videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
