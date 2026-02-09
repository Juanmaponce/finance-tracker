import { userRepository } from './user.repository';
import type { UpdateSettingsDTO } from './user.types';

class UserService {
  async updateSettings(userId: string, data: UpdateSettingsDTO) {
    return userRepository.updateSettings(userId, data);
  }

  async exportData(userId: string) {
    return userRepository.exportUserData(userId);
  }
}

export const userService = new UserService();
