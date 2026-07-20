export const createMockCloudinaryService = () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  getOptimizedUrl: jest.fn(),
});
