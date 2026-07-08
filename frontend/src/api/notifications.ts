import api from './client'
import type { NotificationItem } from '../types/notification'

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const response = await api.get<NotificationItem[]>('/notifications')
  return response.data
}
