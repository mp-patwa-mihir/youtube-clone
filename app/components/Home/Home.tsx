'use client';

import { useEffect, useState } from 'react';
import VideoCard from '../VideoCard/VideoCard';

interface Video {
  id: string;
  title: string;
  src: string;
  createdAt?: number;
}

export default function HomeComponent() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
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
          thumbnail={`https://dummyimage.com/328x173.13/0000ff/fff`} // Keeping dummy thumbnail for now
        />
      ))}
    </div>
  );
}
