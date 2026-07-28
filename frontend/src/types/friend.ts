import type { PresenceStatus } from '@ft_transcendence/shared/realtime-events.types'

/**
 * Friend type definition
 * Represents a user's friend
 */
export interface Friend {
  id: string
  username: string
  avatarUrl?: string
  status: PresenceStatus
}

/**
 * FriendRequest type definition
 * Represents a friend request between users
 */
export interface FriendRequest {
  id: string
  requester: User
  status: RequestStatus
}

/**
 * User type definition
 * Basic user information
 */
export interface User {
  id: string
  username: string
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
 * Friend request status type
 */
export type RequestStatus = 'pending' | 'accepted'
