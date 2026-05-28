import { Injectable } from '@nestjs/common';

@Injectable()
export class FriendsService {
  constructor() {}

  async getFriends(userId: string) {
    return [];
  }

  async sendRequest(currentUserId: string, targetUserId: string) {
    return;
  }

  async acceptRequest(currentUserId: string, targetUserId: string) {
    return;
  }

  async getFriendsRequests(currentUserId: string) {
    return [];
  }

  async rejectRequest(currentUserId: string, targetUserId: string) {
    return;
  }

  async deleteFriend(currentUserId: string, targetUserId: string) {}
}
