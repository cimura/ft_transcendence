/**
 * Friend type definition
 * Represents a user's friend with online status
 */
export interface Friend {
  id: string
  username: string
  email: string
  avatarUrl?: string
  isOnline: boolean
  status: FriendStatus
  lastSeen?: Date
}

/**
 * FriendRequest type definition
 * Represents a friend request between users
 */
export interface FriendRequest {
  id: string
  requester: User
  receiver: User
  status: RequestStatus
  createdAt: Date
}

/**
 * User type definition
 * Basic user information
 */
export interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string
}

/**
 * SearchResult type definition
 * User search result with friendship status
 */
export interface SearchResult {
  id: string
  username: string
  avatarUrl?: string
  isFriend: boolean
  isPending: boolean
}

/**
 * Friend status type for online/offline indicator
 */
export type FriendStatus = 'online' | 'offline' | 'in_game'

/**
 * Friend request status type
 */
export type RequestStatus = 'pending' | 'accepted'
