export type Theme = 'light' | 'dark' | 'system'
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed'
export type Role = 'admin' | 'client'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: Role
  theme_preference: Theme
  last_active_at: string | null
  last_seen_clients_at: string | null
}
