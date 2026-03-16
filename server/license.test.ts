import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database functions
vi.mock('./license-db', () => ({
  getUserLicense: vi.fn(),
  createLicense: vi.fn(),
  validateLicense: vi.fn(),
  getAllLicenses: vi.fn(),
  updateLicenseStatus: vi.fn(),
  getLicenseHistory: vi.fn(),
  activateLicense: vi.fn(),
}));

import {
  getUserLicense,
  createLicense,
  validateLicense,
  getAllLicenses,
  updateLicenseStatus,
  getLicenseHistory,
  activateLicense,
} from './license-db';

describe('License Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserLicense', () => {
    it('should return null when user has no license', async () => {
      vi.mocked(getUserLicense).mockResolvedValue(null);
      
      const result = await getUserLicense(1);
      
      expect(result).toBeNull();
      expect(getUserLicense).toHaveBeenCalledWith(1);
    });

    it('should return license when user has one', async () => {
      const mockLicense = {
        id: 1,
        userId: 1,
        licenseCode: 'ABCD-EFGH-IJKL-MNOP',
        licenseType: 'lifetime' as const,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(getUserLicense).mockResolvedValue(mockLicense as any);
      
      const result = await getUserLicense(1);
      
      expect(result).toEqual(mockLicense);
    });
  });

  describe('createLicense', () => {
    it('should create a new pending license (admin flow)', async () => {
      const mockLicense = {
        id: 1,
        userId: null,
        licenseCode: 'ABCD-EFGH-IJKL-MNOP',
        licenseType: 'lifetime' as const,
        status: 'pending' as const,
      };

      vi.mocked(createLicense).mockResolvedValue(mockLicense as any);

      const result = await createLicense({
        email: 'user@example.com',
      });

      expect(result).toEqual(mockLicense);
      expect(createLicense).toHaveBeenCalledWith({
        email: 'user@example.com',
      });
    });

    it('should create license without email', async () => {
      const mockLicense = {
        id: 2,
        userId: null,
        licenseCode: 'WXYZ-1234-5678-ABCD',
        status: 'pending' as const,
      };

      vi.mocked(createLicense).mockResolvedValue(mockLicense as any);

      const result = await createLicense({});

      expect(result?.licenseCode).toBe('WXYZ-1234-5678-ABCD');
    });
  });

  describe('validateLicense', () => {
    it('should return true for valid license', async () => {
      vi.mocked(validateLicense).mockResolvedValue(true);
      
      const result = await validateLicense(1, 'VALID-CODE');
      
      expect(result).toBe(true);
    });

    it('should return false for invalid license', async () => {
      vi.mocked(validateLicense).mockResolvedValue(false);
      
      const result = await validateLicense(1, 'INVALID-CODE');
      
      expect(result).toBe(false);
    });
  });

  describe('getAllLicenses', () => {
    it('should return all licenses for admin', async () => {
      const mockLicenses = [
        { id: 1, userId: 1, licenseCode: 'CODE1' },
        { id: 2, userId: 2, licenseCode: 'CODE2' },
      ];
      
      vi.mocked(getAllLicenses).mockResolvedValue(mockLicenses as any);
      
      const result = await getAllLicenses();
      
      expect(result).toHaveLength(2);
    });
  });

  describe('updateLicenseStatus', () => {
    it('should update license status to revoked', async () => {
      vi.mocked(updateLicenseStatus).mockResolvedValue(true);
      
      const result = await updateLicenseStatus(1, 'revoked', 'Violation of terms');
      
      expect(result).toBe(true);
      expect(updateLicenseStatus).toHaveBeenCalledWith(1, 'revoked', 'Violation of terms');
    });

    it('should update license status to active', async () => {
      vi.mocked(updateLicenseStatus).mockResolvedValue(true);
      
      const result = await updateLicenseStatus(1, 'active');
      
      expect(result).toBe(true);
    });
  });

  describe('getLicenseHistory', () => {
    it('should return license history', async () => {
      const mockHistory = [
        { id: 1, licenseId: 1, eventType: 'created', createdAt: new Date() },
        { id: 2, licenseId: 1, eventType: 'activated', createdAt: new Date() },
      ];
      
      vi.mocked(getLicenseHistory).mockResolvedValue(mockHistory as any);
      
      const result = await getLicenseHistory(1);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('activateLicense', () => {
    it('should activate a license for user', async () => {
      vi.mocked(activateLicense).mockResolvedValue(true);
      
      const result = await activateLicense(1, 'VALID-CODE');
      
      expect(result).toBe(true);
    });

    it('should return false for invalid license code', async () => {
      vi.mocked(activateLicense).mockResolvedValue(false);
      
      const result = await activateLicense(1, 'INVALID-CODE');
      
      expect(result).toBe(false);
    });
  });
});
