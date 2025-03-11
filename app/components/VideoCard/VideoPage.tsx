'use client';

import { VideoPlayerProvider } from '../../context/VideoPlayerContext';
import VideoPlayer from '../../video/[id]/VideoPlayer';
import { Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';

interface VideoPageProps {
  id: string;
}

const fetchVideo = async (id: string) => {
  const res = await fetch(`/api/videos/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch video: ${res.statusText}`);
  }
  return res.json();
};

function VideoPageComponent({ id }: VideoPageProps) {
  const {
    data: video,
    error,
    isLoading,
  } = useQuery({
    queryKey: [`video`, id],
    queryFn: () => fetchVideo(id),
  });

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <Spin spinning={isLoading && !video}>
      {video && (
        <main>
          <h1>Playing Video: {video?.title}</h1>
          <VideoPlayerProvider src={video?.src}>
            <VideoPlayer />
          </VideoPlayerProvider>
        </main>
      )}
    </Spin>
  );
}

export default VideoPageComponent;
