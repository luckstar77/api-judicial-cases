import { UploadableFile } from '../storage.service';

export const mockStorageService = {
  uploadCaseImages: jest.fn(async (files: UploadableFile[]) => files.map((_file, index) => `https://test-bucket.s3.ap-east-2.amazonaws.com/cases/test-${index}.jpg`)),
  deleteByUrls: jest.fn(async () => undefined),
};
