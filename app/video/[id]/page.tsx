// app/video/[id]/page.tsx
import VideoPageComponent from '../../components/VideoCard/VideoPage';

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <VideoPageComponent id={id} />;
}
