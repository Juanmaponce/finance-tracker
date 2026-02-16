import { userService } from '../user.service';
import { userRepository } from '../user.repository';

jest.mock('../user.repository', () => ({
  userRepository: {
    updateSettings: jest.fn(),
    exportUserData: jest.fn(),
  },
}));

const mockedRepo = userRepository as jest.Mocked<typeof userRepository>;

describe('UserService', () => {
  const userId = 'user-123';

  beforeEach(() => jest.clearAllMocks());

  describe('updateSettings', () => {
    it('should delegate to repository with correct params', async () => {
      const data = { displayName: 'New Name', darkMode: true };
      const expected = { id: userId, ...data };
      mockedRepo.updateSettings.mockResolvedValue(expected as never);

      const result = await userService.updateSettings(userId, data);

      expect(mockedRepo.updateSettings).toHaveBeenCalledWith(userId, data);
      expect(result).toEqual(expected);
    });
  });

  describe('exportData', () => {
    it('should delegate to repository', async () => {
      const exportData = { transactions: [], categories: [] };
      mockedRepo.exportUserData.mockResolvedValue(exportData as never);

      const result = await userService.exportData(userId);

      expect(mockedRepo.exportUserData).toHaveBeenCalledWith(userId);
      expect(result).toEqual(exportData);
    });
  });
});
