'use client';

import React, { useEffect, useState } from 'react';
import { VideoPlayerProvider } from '../../context/VideoPlayerContext';
import VideoPlayer from '../../video/[id]/VideoPlayer';

interface VideoDetails {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
  duration?: number;
  fileSize?: number;
  segments?: number;
}

interface VideoPageProps {
  id: string;
}

function VideoPageComponent({ id }: VideoPageProps) {
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

export default VideoPageComponent;
