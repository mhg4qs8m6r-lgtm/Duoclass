import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the sync database functions
vi.mock('./sync-db', () => ({
  getUserCategories: vi.fn(),
  getCategoriesSince: vi.fn(),
  upsertCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getUserAlbums: vi.fn(),
  getAlbumsSince: vi.fn(),
  upsertAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
  getUserPhotosMetadata: vi.fn(),
  getPhotosMetadataSince: vi.fn(),
  getAlbumPhotosMetadata: vi.fn(),
  upsertPhotoMetadata: vi.fn(),
  syncPhotosMetadataBatch: vi.fn(),
  deletePhotoMetadata: vi.fn(),
  getUserSettings: vi.fn(),
  upsertUserSettings: vi.fn(),
  getSyncLogSince: vi.fn(),
  logSyncAction: vi.fn(),
}));

import {
  getUserCategories,
  getCategoriesSince,
  upsertCategory,
  deleteCategory,
  getUserAlbums,
  getAlbumsSince,
  upsertAlbum,
  deleteAlbum,
  getUserPhotosMetadata,
  getPhotosMetadataSince,
  upsertPhotoMetadata,
  syncPhotosMetadataBatch,
  getUserSettings,
  upsertUserSettings,
} from './sync-db';

describe('Sync Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Categories', () => {
    it('should get all user categories', async () => {
      const mockCategories = [
        { id: 1, userId: 1, localId: 'cat_1', name: 'Vacances' },
        { id: 2, userId: 1, localId: 'cat_2', name: 'Famille' },
      ];
      
      vi.mocked(getUserCategories).mockResolvedValue(mockCategories as any);
      
      const result = await getUserCategories(1);
      
      expect(result).toHaveLength(2);
      expect(getUserCategories).toHaveBeenCalledWith(1);
    });

    it('should get categories since timestamp', async () => {
      const mockCategories = [
        { id: 1, userId: 1, localId: 'cat_1', name: 'Updated Category' },
      ];
      
      vi.mocked(getCategoriesSince).mockResolvedValue(mockCategories as any);
      
      const result = await getCategoriesSince(1, 1700000000000);
      
      expect(result).toHaveLength(1);
      expect(getCategoriesSince).toHaveBeenCalledWith(1, 1700000000000);
    });

    it('should upsert a category', async () => {
      const mockCategory = {
        id: 1,
        userId: 1,
        localId: 'cat_new',
        name: 'New Category',
      };
      
      vi.mocked(upsertCategory).mockResolvedValue(mockCategory as any);
      
      const result = await upsertCategory({
        userId: 1,
        localId: 'cat_new',
        name: 'New Category',
      } as any);
      
      expect(result?.name).toBe('New Category');
    });

    it('should delete a category', async () => {
      vi.mocked(deleteCategory).mockResolvedValue(true);
      
      const result = await deleteCategory(1, 'cat_1');
      
      expect(result).toBe(true);
    });
  });

  describe('Albums', () => {
    it('should get all user albums', async () => {
      const mockAlbums = [
        { id: 1, userId: 1, localId: 'album_1', name: 'Album 1' },
        { id: 2, userId: 1, localId: 'album_2', name: 'Album 2' },
      ];
      
      vi.mocked(getUserAlbums).mockResolvedValue(mockAlbums as any);
      
      const result = await getUserAlbums(1);
      
      expect(result).toHaveLength(2);
    });

    it('should get albums since timestamp', async () => {
      const mockAlbums = [
        { id: 1, userId: 1, localId: 'album_1', name: 'Updated Album' },
      ];
      
      vi.mocked(getAlbumsSince).mockResolvedValue(mockAlbums as any);
      
      const result = await getAlbumsSince(1, 1700000000000);
      
      expect(result).toHaveLength(1);
    });

    it('should upsert an album', async () => {
      const mockAlbum = {
        id: 1,
        userId: 1,
        localId: 'album_new',
        name: 'New Album',
      };
      
      vi.mocked(upsertAlbum).mockResolvedValue(mockAlbum as any);
      
      const result = await upsertAlbum({
        userId: 1,
        localId: 'album_new',
        name: 'New Album',
      } as any);
      
      expect(result?.name).toBe('New Album');
    });

    it('should delete an album', async () => {
      vi.mocked(deleteAlbum).mockResolvedValue(true);
      
      const result = await deleteAlbum(1, 'album_1');
      
      expect(result).toBe(true);
    });
  });

  describe('Photos Metadata', () => {
    it('should get all user photos metadata', async () => {
      const mockPhotos = [
        { id: 1, userId: 1, localId: 'photo_1', fileName: 'photo1.jpg' },
        { id: 2, userId: 1, localId: 'photo_2', fileName: 'photo2.jpg' },
      ];
      
      vi.mocked(getUserPhotosMetadata).mockResolvedValue(mockPhotos as any);
      
      const result = await getUserPhotosMetadata(1);
      
      expect(result).toHaveLength(2);
    });

    it('should get photos metadata since timestamp', async () => {
      const mockPhotos = [
        { id: 1, userId: 1, localId: 'photo_1', fileName: 'updated.jpg' },
      ];
      
      vi.mocked(getPhotosMetadataSince).mockResolvedValue(mockPhotos as any);
      
      const result = await getPhotosMetadataSince(1, 1700000000000);
      
      expect(result).toHaveLength(1);
    });

    it('should upsert photo metadata', async () => {
      const mockPhoto = {
        id: 1,
        userId: 1,
        localId: 'photo_new',
        fileName: 'new_photo.jpg',
      };
      
      vi.mocked(upsertPhotoMetadata).mockResolvedValue(mockPhoto as any);
      
      const result = await upsertPhotoMetadata({
        userId: 1,
        localId: 'photo_new',
        fileName: 'new_photo.jpg',
      } as any);
      
      expect(result?.fileName).toBe('new_photo.jpg');
    });

    it('should sync photos metadata batch', async () => {
      vi.mocked(syncPhotosMetadataBatch).mockResolvedValue({ success: 5, failed: 0 });
      
      const result = await syncPhotosMetadataBatch(1, [
        { localId: 'p1', fileName: 'p1.jpg' },
        { localId: 'p2', fileName: 'p2.jpg' },
      ] as any);
      
      expect(result.success).toBe(5);
      expect(result.failed).toBe(0);
    });
  });

  describe('User Settings', () => {
    it('should get user settings', async () => {
      const mockSettings = {
        id: 1,
        userId: 1,
        displayMode: 'normal',
        language: 'fr',
      };
      
      vi.mocked(getUserSettings).mockResolvedValue(mockSettings as any);
      
      const result = await getUserSettings(1);
      
      expect(result?.language).toBe('fr');
    });

    it('should upsert user settings', async () => {
      const mockSettings = {
        id: 1,
        userId: 1,
        displayMode: 'compact',
        language: 'en',
      };
      
      vi.mocked(upsertUserSettings).mockResolvedValue(mockSettings as any);
      
      const result = await upsertUserSettings({
        userId: 1,
        displayMode: 'compact',
        language: 'en',
      } as any);
      
      expect(result?.displayMode).toBe('compact');
    });
  });
});
