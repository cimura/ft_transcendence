import api from './client'
import type { Friend, FriendRequest, SearchResult } from '../types/friend'

type BackendFriendRequest = {
  id: string
  status: 'PENDING' | 'ACCEPTED'
  requester: {
    id: string
    email: string
    username: string
    avatarUrl: string | null
  }
}

const toFriendRequest = (request: BackendFriendRequest): FriendRequest => ({
  id: request.id,
  requester: {
    id: request.requester.id,
    username: request.requester.username,
    email: request.requester.email,
    avatarUrl: request.requester.avatarUrl ?? undefined,
  },
  status: request.status.toLowerCase() as FriendRequest['status'],
})

/**
 * Get friends list
 * @returns Promise<Friend[]> List of friends
 */
export const getFriends = async (): Promise<Friend[]> => {
  const response = await api.get<Friend[]>('/friends')
  return response.data
}

/**
 * Get friend requests list
 * @returns Promise<FriendRequest[]> List of received friend requests
 */
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  const response = await api.get<BackendFriendRequest[]>('/friends/requests')
  return response.data.map(toFriendRequest)
}

/**
 * Send friend request to a user
 * @param targetUserId Target user ID
 * @returns Promise<void>
 */
export const sendFriendRequest = async (
  targetUserId: string
): Promise<void> => {
  await api.post('/friends/request', { targetUserId })
}

/**
 * Accept friend request
 * @param requestId Friend request ID
 * @returns Promise<void>
 */
export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  await api.put(`/friends/${requestId}/accept`)
}

/**
 * Reject friend request
 * @param requestId Friend request ID
 * @returns Promise<void>
 */
export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  await api.put(`/friends/${requestId}/reject`)
}

/**
 * Delete a friend
 * @param friendId Friend ID
 * @returns Promise<void>
 */
export const deleteFriend = async (friendId: string): Promise<void> => {
  await api.delete(`/friends/${friendId}`)
}

/**
 * Search users by username
 * @param query Search query string
 * @returns Promise<SearchResult[]> List of search results
 */
export const searchUsers = async (query: string): Promise<SearchResult[]> => {
  const response = await api.get<SearchResult[]>('/users/search', {
    params: { q: query },
  })
  return response.data
}
