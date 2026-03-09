import { Folder, Image as ImageIcon } from 'lucide-react';
import { Album } from '@/types/photo';

interface AlbumSidebarProps {
  albums: Album[];
  currentAlbumId: string | null;
  onDropOnAlbum: (e: React.DragEvent, albumId: string) => void;
  onAlbumClick: (albumId: string) => void;
}

export default function AlbumSidebar({ albums, currentAlbumId, onDropOnAlbum, onAlbumClick }: AlbumSidebarProps) {
  // Note: La vérification d'authentification est faite par le parent (Home.tsx ou PhotoClass.tsx)
  // ou par le hook useAuth dans le composant parent qui passe la fonction onAlbumClick.
  // Ici on se contente d'afficher et de relayer le clic.
  return (
    <div className="w-64 bg-white border-l flex flex-col shrink-0">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Folder className="w-4 h-4" />
          Classer vers...
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {albums.map(album => (
          <div
            key={album.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
              onDropOnAlbum(e, album.id);
            }}
            onClick={() => onAlbumClick(album.id)}
            className="p-3 rounded-lg border border-transparent hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0">
              {album.coverUrl ? (
                <img src={album.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">{album.title}</p>
              <p className="text-xs text-gray-500">{album.count} photos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
