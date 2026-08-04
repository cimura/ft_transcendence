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
