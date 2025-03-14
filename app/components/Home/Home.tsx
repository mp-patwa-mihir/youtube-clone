'use client';

import { useEffect, useState } from 'react';
import VideoCard from '../VideoCard/VideoCard';

interface Video {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
  thumbnail?: string;
}

export default function HomeComponent() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string>('');

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setVideos(data.videos);
    } catch (err) {
      setError('Failed to fetch videos');
      console.error('Error fetching videos:', err);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div
      className="video-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
      }}
    >
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          id={video.id}
          title={video.title}
          src={video.src}
          thumbnail={video.thumbnail}
          fetchVideos={fetchVideos}
        />
      ))}
    </div>
  );
}
