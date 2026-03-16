import UniversalAlbumPage from '@/pages/UniversalAlbumPage';
import { PhotoClassProps } from '@/types/photo';

export default function ClassPapiers(props: PhotoClassProps) {
  return <UniversalAlbumPage {...props} mode="document" />;
}
