import axios from 'axios'
import type { Friend, FriendRequest, SearchResult } from '../types/friend'

/**
 * Axios instance for API requests
 * Configured with base URL and credentials
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true, // Cookieを送信
})

/**
 * Get friends list
 * @returns Promise<Friend[]> List of friends
 */
export const getFriends = async (): Promise<Friend[]> => {
  const response = await api.get<Friend[]>('/api/friends')
  return response.data
}

/**
 * Get friend requests list
 * @returns Promise<FriendRequest[]> List of received friend requests
 */
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  const response = await api.get<FriendRequest[]>('/api/friends/requests')
  return response.data
}

/**
 * Send friend request to a user
 * @param targetUserId Target user ID
 * @returns Promise<void>
 */
export const sendFriendRequest = async (targetUserId: string): Promise<void> => {
  await api.post('/api/friends/request', { targetUserId })
}

/**
 * Accept friend request
 * @param requestId Friend request ID
 * @returns Promise<void>
 */
export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  await api.put(`/api/friends/${requestId}/accept`)
}

/**
 * Reject friend request
 * @param requestId Friend request ID
 * @returns Promise<void>
 */
export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  await api.put(`/api/friends/${requestId}/reject`)
}

/**
 * Delete a friend
 * @param friendId Friend ID
 * @returns Promise<void>
 */
export const deleteFriend = async (friendId: string): Promise<void> => {
  await api.delete(`/api/friends/${friendId}`)
}

/**
 * Search users by username
 * @param query Search query string
 * @returns Promise<SearchResult[]> List of search results
 */
export const searchUsers = async (query: string): Promise<SearchResult[]> => {
  const response = await api.get<SearchResult[]>('/api/users/search', {
    params: { q: query },
  })
  return response.data
}
