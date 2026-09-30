import type { JobPortal } from './lib/jobPortals'

export interface SearchCriteria {
  source?: JobPortal
  workAuthorization?: string
  keywords: string[] | string
  location: string
  jobType: string
  experience: string
  datePosted: string
  remote: boolean
}
export interface Job {
  id: string
  title: string
  company: string | null
  location: string | null
  postedDate: string | null
  url: string
  logo: string | null
  source?: JobPortal
  description?: string | null
  savedAt?: string
  appliedAt?: string | null
  deadline?: string | null
}
export interface LinkedInProfile { name: string; email?: string; picture?: string }
export interface SearchResult { jobs: Job[]; total: number; hasMore: boolean; nextPageToken?: string }
export type ViewMode = 'card' | 'list'
export type SavedJobRow = {
  id: string; user_id: string; job_id: string; title: string; company: string | null
  location: string | null; url: string; logo: string | null; posted_date: string | null; saved_at: string
  applied_at: string | null; deadline: string | null; source?: string | null
}
export type SearchKeywordRow = {
  id: string
  keyword: string
  category: 'keyword' | 'location'
  search_count: number
  last_searched_at: string
}
export interface Database {
  public: {
    Tables: {
      saved_jobs: {
        Row: SavedJobRow
        Insert: Omit<SavedJobRow, 'id' | 'saved_at' | 'applied_at' | 'deadline' | 'source'> & {
          id?: string
          saved_at?: string
          applied_at?: string | null
          deadline?: string | null
          source?: string | null
        }
        Update: Partial<SavedJobRow>
        Relationships: []
      }
      search_keywords: {
        Row: SearchKeywordRow
        Insert: {
          id?: string
          keyword: string
          category?: 'keyword' | 'location'
          search_count?: number
          last_searched_at?: string
        }
        Update: Partial<SearchKeywordRow>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
