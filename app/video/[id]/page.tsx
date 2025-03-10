// app/video/[id]/page.tsx
'use client';
import { VideoPlayerProvider } from '../../context/VideoPlayerContext';
import VideoPlayer from './VideoPlayer';
import { useEffect, useState, use } from 'react';

interface VideoPageProps {
  params: { id: string } | Promise<{ id: string }>;
}

interface VideoDetails {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
  duration?: number;
  fileSize?: number;
  segments?: number;
}

export default function VideoPage({ params }: VideoPageProps) {
  // Unwrap params with React.use()
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { id } = resolvedParams;

  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${id}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setVideo(data);
      } catch (err) {
        setError('Failed to fetch video');
        console.error('Error fetching video:', err);
      }
    };

    fetchVideo();
  }, [id]);

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!video) {
    return <p>Loading...</p>;
  }

  return (
    <main>
      <h1>Playing Video: {video.title}</h1>
      <VideoPlayerProvider src={video.src}>
        <VideoPlayer />
      </VideoPlayerProvider>
    </main>
  );
}
