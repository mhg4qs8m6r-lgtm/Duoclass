import UniversalAlbumPage from '@/pages/UniversalAlbumPage';
import { PhotoClassProps } from '@/types/photo';

export default function PhotoClass(props: PhotoClassProps) {
  return <UniversalAlbumPage {...props} mode="photo" />;
}
